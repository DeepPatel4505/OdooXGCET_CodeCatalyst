import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Reusable DataTable component
 * @param {Object} props
 * @param {Array} props.data - Table data
 * @param {Array} props.columns - Column definitions
 * @param {boolean} props.searchable - Enable search
 * @param {string} props.searchPlaceholder - Search placeholder
 * @param {boolean} props.paginated - Enable pagination
 * @param {number} props.pageSize - Items per page
 * @param {string} props.emptyMessage - Message when no data
 */
export default function DataTable({
  data = [],
  columns = [],
  searchable = true,
  searchPlaceholder = 'Search...',
  paginated = true,
  pageSize = 10,
  emptyMessage = 'No data available',
  onRowClick,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    return data.filter((row) => {
      return columns.some((column) => {
        const value = column.accessor
          ? (typeof column.accessor === 'function'
              ? column.accessor(row)
              : row[column.accessor])
          : ''
        return String(value)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      })
    })
  }, [data, searchTerm, columns])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) return filteredData

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, pageSize, paginated])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex} className={column.cellClassName}>
                      {column.cell
                        ? column.cell(row)
                        : column.accessor
                        ? typeof column.accessor === 'function'
                          ? column.accessor(row)
                          : row[column.accessor]
                        : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredData.length)} of{' '}
            {filteredData.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

