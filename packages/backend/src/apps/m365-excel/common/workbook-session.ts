import type { IGlobalVariable } from '@plumber/types'

import type { AxiosRequestConfig, AxiosResponse } from 'axios'

import {
  getM365TenantInfo,
  type M365TenantInfo,
} from '@/config/app-env-vars/m365'
import HttpError from '@/errors/http'
import logger from '@/helpers/logger'

import { isFileTooSensitive } from './sharepoint/excel-workbook/data-classification'
import { tryParseGraphApiError } from './parse-graph-api-error'
import { RedisCachedValue } from './redis-cached-value'

// Session ID redis key expiry
//
// Arbitrarily set to 1 hour. See giant comment below for details.
const SESSION_ID_EXPIRY_SECONDS = 60 * 60

/**
 * To prevent data races, when working on the same excel file, we need use the
 * same session ID across our entire fleet. We should also avoid changing
 * session IDs, as there is a chance of a data race when we do this (e.g. we
 * start writing to the new session before Microsoft has finished propagating
 * the data in the old session).
 *
 * To achieve this:
 * - We store each file's session ID in redis.
 * - We try to keep using the same session ID for each file, until it naturally
 *   expires on Microsoft's server.
 *
 *   Note that Microsoft only expires sessions after a period of inactivity, so
 *   any write we make will always have the maximum possible time window to
 *   propagate to the rest of Microsoft's fleet.
 *
 * Some notes:
 * 1. == The Key System Invariant ==
 *    There must be no concurrent excel requests to different session IDs,
 *    unless all requests (except possibly one) raise an error that informs the
 *    user about this happening (i.e. performing an auto-retry and hiding the
 *    fact that concurrent requests has occurred from the user is not
 *    permissible).
 *
 *    Example:
 *    a) Worker 1 writes to session ID 'abc'.
 *    b) At the same time, worker 2 writes to session ID 'def'
 *    c) At the same time, worker 3 writes to session ID 'xyz'
 *
 *    This example is only OK if at least 2 of the workers above raise a
 *    user-visible error. We must do this because concurrent requests to
 *    different session IDs cause data races on Microsoft's servers, and
 *    Microsoft is known to merge output of the concurrent requests wrongly.
 *    Thus, we need to get the user to check for data correctness if this
 *    happens.
 *
 * 2. All session creation and invalidation must be done under a write lock.
 *    Otherwise, we can end up with an invariant violation like so:
 *
 *    a) Initially, session ID is null.
 *    b) Worker 1 sees that it is null, and requests a new session from Graph
 *       API.
 *    c) Concurrently, worker 2 sees that it is null, and also requests a new
 *       session from Graph API.
 *    d) Worker 1 updates the redis session ID with its Graph API's response,
 *       and then starts performing excel requests with this ID.
 *    e) Immediately after, worker 2 updates the redis session ID with its Graph
 *       API's response, and then starts performing excel requests with this ID.
 *    f) Worker 1 will have performed a concurrent request with a different
 *       session ID, thereby breaking the invariant.
 *
 *    To fix this, we make each worker:
 *    - Acquire a lock before starting to request a new session from Graph API.
 *    - When entering the lock, check that session ID has not been populated by
 *      another worker before firing off a session creation request.
 *
 *    That said... strictly speaking, a lock is not needed:
 *    - If we did not lock, a worker can still check for existence of concurrent
 *      requests to a different session ID, by checking if session ID in redis
 *      _after_ it made its request is the same as the session ID it used to
 *      make the request. If they are different, a concurrent request has
 *      occurred, and the worker needs to fire off a user-visible error.
 *    - The problem is that this no-lock approach causes a user-visible error
 *      cascade in hot pipes. If multiple workers concurrently start work on the
 *      same file when it doesn't have an existing session, they will all make
 *      requests using their own session IDs (following the scenario above),
 *      leading to a user-visible error cascade. This is a UX nightmare.
 *
 * 3. We sync expiry times of the session ID keys in redis (see the
 *    SESSION_ID_EXPIRY_SECONDS constant) to the same time period as Microsoft's
 *    session inactivity timeout. This saves memory and prevents extraneous
 *    retries from "session expired" errors.
 *
 * 4. Read locks should not be needed at all, as far as I can tell.
 */
export default class WorkbookSession {
  private $: IGlobalVariable

  private tenant: M365TenantInfo
  private fileId: string
  private cachedSessionId: RedisCachedValue<string>

  static async acquire(
    $: IGlobalVariable,
    fileId: string,
  ): Promise<WorkbookSession> {
    const tenant = getM365TenantInfo($.auth.data?.tenantKey as string)

    // We _always_ check against the server in case file sensitivity has
    // changed. This guards against things likes delayed actions working on
    // files whose sensitivity has been upgraded during the delay period.
    if (await isFileTooSensitive(tenant, fileId, $.http)) {
      throw new Error(`File is too sensitive!`)
    }

    return new WorkbookSession($, tenant, fileId)
  }

  private constructor(
    $: IGlobalVariable,
    tenant: M365TenantInfo,
    fileId: string,
  ) {
    this.$ = $
    this.fileId = fileId
    this.tenant = tenant

    this.cachedSessionId = new RedisCachedValue({
      tenant,
      objectId: fileId,
      cacheKey: 'excel:session-id',

      expirySeconds: SESSION_ID_EXPIRY_SECONDS,
      extendExpiryOnRead: true,

      queryValueFromSource: async () => {
        const createSessionResponse = await $.http.post<{ id: string }>(
          `/v1.0/sites/${tenant.sharePointSiteId}/drive/items/${fileId}/workbook/createSession`,
          {
            persistChanges: true,
          },
        )
        return createSessionResponse.data.id
      },
    })
  }

  private async _requestImpl<T>(
    apiEndpoint: string,
    method: NonNullable<AxiosRequestConfig['method']>,
    config: AxiosRequestConfig | null,
    canRetry: boolean,
  ): Promise<AxiosResponse<T>> {
    // We need to store this locally so that we can check for unexpected session
    // invalidation after our request.
    //
    // Note that get() will automatically refresh / create a new session if
    // needed.
    const sessionIdInCurrentRequest = await this.cachedSessionId.get()

    try {
      const response = await this.$.http.request<T>({
        ...(config ?? {}),
        url: `/v1.0/sites/${this.tenant.sharePointSiteId}/drive/items/${this.fileId}/workbook${apiEndpoint}`,
        method: method,
        headers: {
          ...(config?.headers ?? {}),
          'workbook-session-id': sessionIdInCurrentRequest,
        },
      })

      // EDGE CASE
      // ===
      // If the session ID has changed after the request, the old session must
      // have been invalidated by another worker due to a problem on
      // Microsoft's servers. Since we just made a request to that invalid
      // session, this means there is a chance of data corruption - so we throw
      // an error here to inform the user about this.
      //
      // (This should occur very rarely, if at all...)
      //
      // Note that this doesn't save us from data loss; it's always possible for
      // Microsoft's servers to return a successful response to us, then crash
      // before propagating session data to other machines. This error is just a
      // nice-to-have.

      const sessionIdInRedis = await this.cachedSessionId.get()
      if (sessionIdInRedis !== sessionIdInCurrentRequest) {
        throw new Error(
          "The current Excel session was invalidated due to an error; please double check the file's data",
        )
      }

      return response
    } catch (err) {
      if (!(err instanceof HttpError)) {
        throw err
      }

      // Invalidate our current session if Graph API tells us that it's expired
      // or broken.
      //
      // https://learn.microsoft.com/en-us/graph/workbook-error-handling#required-second-level-error-codes

      const graphApiInnerError = tryParseGraphApiError(err)?.innerError?.code
      if (
        !graphApiInnerError ||
        !graphApiInnerError.startsWith('invalidSession')
      ) {
        throw err
      }

      await this.cachedSessionId.invalidateIfValueIs(sessionIdInCurrentRequest)

      // This typically happens for expired sessions, hence it's the only
      // retriable error. We will retry at most _once_.
      if (canRetry && graphApiInnerError === 'invalidSessionReCreatable') {
        return await this._requestImpl(apiEndpoint, method, config, false)
      }

      logger.warn('M365 Excel session was unexpectedly invalidated.', {
        event: 'm365-excel-session-invalidated',
        error: graphApiInnerError,
        flowId: this.$.flow?.id,
        stepId: this.$.step?.id,
        executionId: this.$.execution?.id,
      })

      throw err
    }
  }

  public async request<T>(
    apiEndpoint: string,
    method: NonNullable<AxiosRequestConfig['method']>,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return await this._requestImpl(
      apiEndpoint,
      method,
      config ?? null,
      true, // Allow retrying once.
    )
  }
}
