import { ITableColumnMetadata } from '@plumber/types'

import { ColumnDef, createColumnHelper } from '@tanstack/react-table'

import CheckboxHeaderCell from '../components/TableHeader/CheckboxHeaderCell'
import ColumnHeaderCell from '../components/TableHeader/ColumnHeaderCell'
import NewColumnHeaderCell from '../components/TableHeader/NewColumnHeaderCell'
import CheckboxCell from '../components/TableRow/CheckboxCell'
import NoopCell from '../components/TableRow/NoopCell'
import TableCell from '../components/TableRow/TableCell'
import { NEW_COLUMN_ID, SELECT_COLUMN_ID } from '../constants'
import { GenericRowData } from '../types'

const columnHelper = createColumnHelper<GenericRowData>()

export function generateColumns(
  columns: ITableColumnMetadata[],
): ColumnDef<GenericRowData, any>[] {
  const accessorColumns = columns.map(({ id, name, config }) =>
    columnHelper.accessor(id, {
      id,
      header: ({ header }) => (
        <ColumnHeaderCell
          columnName={name}
          header={header}
          columnWidth={header.getSize()}
          sortDir={header.column.getIsSorted()}
          isFiltered={header.column.getIsFiltered()}
        />
      ),
      cell: TableCell,
      minSize: 150,
      size: config?.width ?? 200,
      enableSorting: true,
      enableMultiSort: false,
      sortingFn: 'alphanumeric',
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
  )
  const selectColumn = columnHelper.display({
    id: SELECT_COLUMN_ID,
    header: CheckboxHeaderCell,
    cell: CheckboxCell,
    size: 60,
  })

  const addNewColumn = columnHelper.display({
    id: NEW_COLUMN_ID,
    header: NewColumnHeaderCell,
    cell: NoopCell,
    size: 50,
  })
  return [selectColumn, ...accessorColumns, addNewColumn]
}
