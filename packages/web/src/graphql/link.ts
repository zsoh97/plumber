import type { ApolloLink } from '@apollo/client'
import { from, HttpLink } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import * as URLS from 'config/urls'
import { setItem } from 'helpers/storage'

type CreateLinkOptions = {
  uri: string
  token?: string | null
  onError?: (message: string) => void
}

const createHttpLink = (
  options: Pick<CreateLinkOptions, 'uri' | 'token'>,
): ApolloLink => {
  const { uri, token } = options
  const headers = {
    authorization: token || '',
  }
  return new HttpLink({ uri, headers })
}

const NOT_AUTHORISED = 'Not Authorised!'
const createErrorLink = (callback: CreateLinkOptions['onError']): ApolloLink =>
  onError(({ graphQLErrors, networkError, operation }) => {
    const context = operation.getContext()
    const autoSnackbar = context.autoSnackbar ?? true

    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        if (autoSnackbar) {
          callback?.(message)
        }

        // eslint-disable-next-line no-console
        console.log(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        )

        if (message === NOT_AUTHORISED) {
          setItem('token', '')
          window.location.href = URLS.LOGIN
        }
      })
    }

    if (networkError) {
      if (autoSnackbar) {
        callback?.(networkError.toString())
      }
      // eslint-disable-next-line no-console
      console.log(`[Network error]: ${networkError}`)
    }
  })

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

const createLink = (options: CreateLinkOptions): ApolloLink => {
  const { uri, onError = noop, token } = options

  const httpOptions = { uri, token }

  return from([createErrorLink(onError), createHttpLink(httpOptions)])
}

export default createLink
