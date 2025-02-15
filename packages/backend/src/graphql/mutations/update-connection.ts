import { IJSONObject } from '@plumber/types'

import Context from '@/types/express/context'

// Sensitive graphql variables redacted in morgan.ts and datadog's Sensitive Data Scanner

type Params = {
  input: {
    id: string
    formattedData: IJSONObject
  }
}

const updateConnection = async (
  _parent: unknown,
  params: Params,
  context: Context,
) => {
  let connection = await context.currentUser
    .$relatedQuery('connections')
    .findOne({
      id: params.input.id,
    })
    .throwIfNotFound()

  connection = await connection.$query().patchAndFetch({
    formattedData: {
      ...connection.formattedData,
      ...params.input.formattedData,
    },
  })

  return connection
}

export default updateConnection
