import { IGlobalVariable } from '@plumber/types'

import { getColumns } from '../helpers/get-columns'

export default {
  name: 'List columns',
  key: 'listColumns',

  async run($: IGlobalVariable) {
    return await getColumns($)
  },
}
