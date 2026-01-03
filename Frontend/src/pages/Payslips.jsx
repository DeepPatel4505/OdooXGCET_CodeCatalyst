import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Label } from '../components/ui/label'
import DataTable from '../components/DataTable'
import { Eye, Download, Grid3x3, List } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatCurrency } from '../lib/format'
import PayslipViewer from '../components/PayslipViewer'
import { toast } from 'sonner'

export default function Payslips() {
  const navigate = useNavigate()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [viewMode, setViewMode] = useState("table") // "table" or "grid"

  useEffect(() => {
    fetchPayslips()
  }, [])

  const fetchPayslips = async () => {
    try {
      const response = await apiClient.get('/payslips')
      setPayslips(response.data)
    } catch (error) {
      console.error('Failed to fetch payslips:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView = (payslipId) => {
    // Navigate to detailed payslip view
    navigate(`/payslips/${payslipId}`)
  }

  const handleDownload = async (payslipId) => {
    try {
      const response = await apiClient.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payslip-${payslipId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Payslip downloaded successfully')
    } catch (error) {
      console.error('Failed to download payslip:', error)
      toast.error('Failed to download payslip')
    }
  }

  const columns = [
    {
      header: 'Employee',
      accessor: 'employeeName',
    },
    {
      header: 'Pay Period',
      accessor: (row) =>
        `${formatDate(row.payPeriodStart)} - ${formatDate(row.payPeriodEnd)}`,
    },
    {
      header: 'Pay Date',
      accessor: 'payDate',
      cell: (row) => formatDate(row.payDate),
    },
    {
      header: 'Gross Pay',
      accessor: 'grossPay',
      cell: (row) => formatCurrency(row.grossPay),
    },
    {
      header: 'Deductions',
      accessor: 'totalDeductions',
      cell: (row) => formatCurrency(row.totalDeductions),
    },
    {
      header: 'Net Pay',
      accessor: 'netPay',
      cell: (row) => (
        <span className="font-semibold">{formatCurrency(row.netPay)}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(row.id)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const filteredPayslips = payslips.filter((payslip) => {
    if (!selectedStatus || selectedStatus === 'all') return true
    if (selectedStatus === 'done') {
      return payslip.status === 'validated' || payslip.status === 'printed' || payslip.status === 'emailed'
    }
    if (selectedStatus === 'draft') {
      return payslip.status === 'draft' || !payslip.status
    }
    return payslip.status === selectedStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payslips</h1>
        <p className="text-muted-foreground">View and download your payslips</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Payslips</CardTitle>
          <CardDescription>
            View and download your payslip history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            {/* Filters and View Toggle */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="status-filter" className="text-xs text-muted-foreground mb-1 block">
                  Status
                </Label>
                <Select value={selectedStatus || 'all'} onValueChange={(value) => setSelectedStatus(value === 'all' ? null : value)}>
                  <SelectTrigger id="status-filter" className="w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 border rounded-md p-1">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading payslips...
            </div>
          ) : viewMode === "table" ? (
            <DataTable
              data={filteredPayslips}
              columns={columns}
              searchable
              searchPlaceholder="Search payslips..."
              paginated
              pageSize={10}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPayslips.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No payslips found
                </div>
              ) : (
                filteredPayslips.map((payslip) => (
                  <div
                    key={payslip.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{payslip.employeeName || 'N/A'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payslip.payDate)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          payslip.status === 'validated' || payslip.status === 'printed' || payslip.status === 'emailed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {payslip.status === 'validated' || payslip.status === 'printed' || payslip.status === 'emailed' ? 'Done' : 'Draft'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <p><span className="font-medium">Period:</span> {formatDate(payslip.payPeriodStart)} - {formatDate(payslip.payPeriodEnd)}</p>
                      <p><span className="font-medium">Gross:</span> {formatCurrency(payslip.grossPay)}</p>
                      <p><span className="font-medium">Deductions:</span> {formatCurrency(payslip.totalDeductions)}</p>
                      <p className="font-semibold"><span className="font-medium">Net:</span> {formatCurrency(payslip.netPay)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(payslip.id)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(payslip.id)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslip Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
            <DialogDescription>
              View and download your payslip
            </DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <PayslipViewer
              payslip={selectedPayslip}
              onDownload={() => handleDownload(selectedPayslip.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

