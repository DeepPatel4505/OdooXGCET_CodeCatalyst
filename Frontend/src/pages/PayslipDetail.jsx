import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Input } from '../components/ui/input'
import { Edit, CheckCircle, XCircle, Printer, Download, Calculator, ArrowLeft, Save } from 'lucide-react'
import apiClient from '../lib/api'
import { formatDate, formatCurrency } from '../lib/format'
import { toast } from 'sonner'

export default function PayslipDetail() {
  const { payslipId, payrollId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [payslip, setPayslip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workedDays, setWorkedDays] = useState(null)
  const [salaryComputation, setSalaryComputation] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedValues, setEditedValues] = useState({})

  const payrunId = searchParams.get('payrunId')

  useEffect(() => {
    if (payslipId || payrollId) {
      fetchPayslip()
    }
  }, [payslipId, payrollId])

  const fetchPayslip = async () => {
    try {
      setLoading(true)
      let response
      if (payrollId) {
        response = await apiClient.get(`/payslips/payroll/${payrollId}`)
      } else {
        response = await apiClient.get(`/payslips/${payslipId}`)
      }
      
      const data = response.data
      setPayslip(data)
      
      if (data.workedDays) {
        setWorkedDays(data.workedDays)
      }
      if (data.salaryComputation) {
        setSalaryComputation(data.salaryComputation)
        // Initialize edited values
        const initialValues = {}
        data.salaryComputation.grossEarnings?.forEach((item) => {
          initialValues[item.ruleName] = item.amount
        })
        data.salaryComputation.deductions?.forEach((item) => {
          initialValues[item.ruleName] = Math.abs(item.amount)
        })
        setEditedValues(initialValues)
      }
    } catch (error) {
      console.error('Failed to fetch payslip:', error)
      toast.error('Failed to load payslip')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/payroll', { state: { activeTab: 'payrun' } })
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset edited values
    if (salaryComputation) {
      const initialValues = {}
      salaryComputation.grossEarnings?.forEach((item) => {
        initialValues[item.ruleName] = item.amount
      })
      salaryComputation.deductions?.forEach((item) => {
        initialValues[item.ruleName] = Math.abs(item.amount)
      })
      setEditedValues(initialValues)
    }
    handleBack()
  }

  const handleEdit = () => {
    // Check if payroll is validated before allowing edit
    const isValidated = payslip?.payroll?.status === 'validated' || payslip?.status === 'validated'
    if (isValidated) {
      toast.error('Cannot edit validated payroll')
      return
    }
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!payrollId && !payslip?.payrollId) {
      toast.error('No payroll ID available')
      return
    }

    try {
      const id = payrollId || payslip?.payrollId
      
      // Calculate gross and deductions from edited values
      let grossSalary = 0
      let totalDeductions = 0

      if (salaryComputation) {
        salaryComputation.grossEarnings?.forEach((item) => {
          const value = editedValues[item.ruleName] ?? item.amount
          grossSalary += value
        })
        
        salaryComputation.deductions?.forEach((item) => {
          const value = editedValues[item.ruleName] ?? Math.abs(item.amount)
          totalDeductions += value
        })
      }

      const netSalary = grossSalary - totalDeductions

      await apiClient.put(`/payroll/${id}`, {
        grossSalary,
        totalDeductions,
        netSalary,
      })

      toast.success('Payslip updated successfully')
      setIsEditing(false)
      fetchPayslip()
    } catch (error) {
      console.error('Failed to update payslip:', error)
      toast.error(error.response?.data?.message || 'Failed to update payslip')
    }
  }

  const handleValidate = async () => {
    if (!payrollId && !payslip?.payrollId) {
      toast.error('No payroll ID available')
      return
    }
    try {
      const id = payrollId || payslip?.payrollId
      await apiClient.put(`/payroll/${id}/validate`)
      toast.success('Payroll validated successfully')
      fetchPayslip()
      handleBack()
    } catch (error) {
      console.error('Failed to validate payroll:', error)
      toast.error(error.response?.data?.message || 'Failed to validate payroll')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    const id = payslipId || payslip?.id
    if (!id) {
      toast.error('No payslip ID available')
      return
    }
    try {
      const response = await apiClient.get(`/payslips/${id}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payslip-${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Payslip downloaded successfully')
    } catch (error) {
      console.error('Failed to download payslip:', error)
      toast.error('Failed to download payslip')
    }
  }

  const updateValue = (key, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [key]: parseFloat(value) || 0,
    }))
  }

  const getValue = (key, defaultValue) => {
    if (isEditing && editedValues[key] !== undefined) {
      return editedValues[key]
    }
    return defaultValue
  }

  // Calculate totals from edited values
  const calculateTotals = () => {
    let grossTotal = 0
    let deductionsTotal = 0

    if (salaryComputation) {
      salaryComputation.grossEarnings?.forEach((item) => {
        grossTotal += getValue(item.ruleName, item.amount)
      })
      
      salaryComputation.deductions?.forEach((item) => {
        deductionsTotal += getValue(item.ruleName, Math.abs(item.amount))
      })
    }

    return {
      grossTotal: grossTotal || salaryComputation?.grossTotal || 0,
      deductionsTotal: deductionsTotal || salaryComputation?.deductionsTotal || 0,
      netAmount: (grossTotal || salaryComputation?.grossTotal || 0) - (deductionsTotal || salaryComputation?.deductionsTotal || 0),
    }
  }

  const totals = calculateTotals()

  // Check if payroll is validated
  // When viewing via payslipId, check payslip.payroll.status
  // When viewing via payrollId, check payslip.status directly
  const isValidated = payslip?.payroll?.status === 'validated' || payslip?.status === 'validated'

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!payslip) {
    return <div className="flex items-center justify-center h-64">Payslip not found</div>
  }

  const periodStart = payslip.period?.start || payslip.payrun?.payPeriodStart
  const periodEnd = payslip.period?.end || payslip.payrun?.payPeriodEnd
  const payDate = payslip.payrun?.payDate

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              {!isValidated && (
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Payslip
                </Button>
              )}
              {!isValidated && (
                <Button variant="outline" onClick={handleValidate}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Validate
                </Button>
              )}
              <Button variant="outline" onClick={handleCancel}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              {payslip?.id && (
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Employee and Payrun Info */}
      <Card>
        <CardHeader>
          <CardTitle>Payslip Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Employee</p>
              <p className="font-semibold">
                {payslip.employee?.name || payslip.employeeName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payrun</p>
              <p className="font-semibold">
                {payslip.payrun?.name || `Payrun ${payslip.payrun?.id || 'N/A'}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Salary Structure</p>
              <p className="font-semibold">
                {payslip.salaryStructure?.name || 'Regular Pay'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="font-semibold">
                {periodStart && periodEnd
                  ? `${formatDate(periodStart)} To ${formatDate(periodEnd)}`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="worked-days" className="space-y-4">
        <TabsList>
          <TabsTrigger value="worked-days">Worked Days</TabsTrigger>
          <TabsTrigger value="salary-computation">Salary Computation</TabsTrigger>
        </TabsList>

        <TabsContent value="worked-days" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Worked Days</CardTitle>
              <CardDescription>
                Salary is calculated based on the employee's monthly attendance. Paid leaves are included in the total payable days, while unpaid leaves are deducted from the salary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workedDays && workedDays.items ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workedDays.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.type}</TableCell>
                        <TableCell className="text-right">
                          {item.days.toFixed(2)} {item.description ? `(${item.description})` : ''}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {workedDays.totalDays || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(workedDays.totalAmount || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No worked days data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary-computation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salary Computation</CardTitle>
              <CardDescription>
                Users can also view the payslip computation, which shows how the total amount is calculated from different salary heads, including allowances and deductions.
                {isEditing && ' Edit the values below and click Save to update the payslip.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salaryComputation ? (
                <div className="space-y-6">
                  {/* Gross Earnings Section */}
                  <div className="relative">
                    <div className="absolute right-0 top-0 text-sm font-semibold text-muted-foreground">
                      Gross
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule Name</TableHead>
                          <TableHead className="text-right">Rate %</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaryComputation.grossEarnings?.map((item, index) => {
                          const value = getValue(item.ruleName, item.amount)
                          return (
                            <TableRow key={index}>
                              <TableCell>{item.ruleName}</TableCell>
                              <TableCell className="text-right">{item.rate}%</TableCell>
                              <TableCell className="text-right">
                                {isEditing && !isValidated ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={value}
                                    onChange={(e) => updateValue(item.ruleName, e.target.value)}
                                    className="w-32 text-right"
                                  />
                                ) : (
                                  formatCurrency(value)
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow className="font-semibold border-t-2">
                          <TableCell>Gross</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(totals.grossTotal)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Deductions Section */}
                  <div className="relative">
                    <div className="absolute right-0 top-0 text-sm font-semibold text-muted-foreground">
                      Deductions
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule Name</TableHead>
                          <TableHead className="text-right">Rate %</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salaryComputation.deductions?.map((item, index) => {
                          const value = getValue(item.ruleName, Math.abs(item.amount))
                          return (
                            <TableRow key={index}>
                              <TableCell>{item.ruleName}</TableCell>
                              <TableCell className="text-right">{item.rate}%</TableCell>
                              <TableCell className="text-right">
                                {isEditing && !isValidated ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={value}
                                    onChange={(e) => updateValue(item.ruleName, e.target.value)}
                                    className="w-32 text-right"
                                  />
                                ) : (
                                  formatCurrency(-value)
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Net Amount */}
                  <div className="border-t-2 pt-4">
                    <Table>
                      <TableBody>
                        <TableRow className="font-semibold">
                          <TableCell>Net Amount</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(totals.netAmount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No salary computation data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print View - Salary Slip */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8">
        <SalarySlipPrint
          payslip={payslip}
          workedDays={workedDays}
          salaryComputation={salaryComputation}
          totals={totals}
          getValue={getValue}
        />
      </div>
    </div>
  )
}

/**
 * Salary Slip Print Component
 * Matches the UI design from the mockup
 */
function SalarySlipPrint({ payslip, workedDays, salaryComputation, totals, getValue }) {
  const periodStart = payslip?.period?.start || payslip?.payrun?.payPeriodStart
  const periodEnd = payslip?.period?.end || payslip?.payrun?.payPeriodEnd
  const payDate = payslip?.payrun?.payDate

  // Convert number to words (simplified)
  const numberToWords = (num) => {
    // This is a simplified version - you might want to use a library for full conversion
    return `${num.toFixed(2)} only`
  }

  return (
    <div className="bg-gray-900 text-white p-8 max-w-4xl mx-auto rounded-lg border border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <p className="text-sm text-gray-400">[Company Logo]</p>
        </div>
        <h1 className="text-2xl font-bold text-cyan-400 mb-2" style={{ fontFamily: 'cursive' }}>
          Salary slip for month of {formatDate(payDate || new Date(), 'MMM YYYY').toLowerCase()}
        </h1>
      </div>

      {/* Employee and Pay Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-sm text-pink-400 mb-1">Employee name :</p>
          <p className="text-gray-100 mb-2">{payslip?.employee?.name || payslip?.employeeName || '[Emp Name]'}</p>
          
          <p className="text-sm text-pink-400 mb-1">Employee Code :</p>
          <p className="text-gray-100 mb-2">{payslip?.employee?.employeeId || '[Emp Code]'}</p>
          
          <p className="text-sm text-pink-400 mb-1">Department :</p>
          <p className="text-gray-100 mb-2">{payslip?.employee?.department || '[Department]'}</p>
          
          <p className="text-sm text-pink-400 mb-1">Location :</p>
          <p className="text-gray-100 mb-2">[Emp_ Location]</p>
          
          <p className="text-sm text-pink-400 mb-1">Date of joining :</p>
          <p className="text-gray-100">{formatDate(payslip?.employee?.hireDate || new Date(), 'DD/MM/YYYY')}</p>
        </div>
        <div>
          <p className="text-sm text-pink-400 mb-1">PAN :</p>
          <p className="text-gray-100 mb-2">DIBxxxxx3</p>
          
          <p className="text-sm text-pink-400 mb-1">UAN :</p>
          <p className="text-gray-100 mb-2">23423423423</p>
          
          <p className="text-sm text-pink-400 mb-1">Bank A/c NO. :</p>
          <p className="text-gray-100 mb-2">23423423432</p>
          
          <p className="text-sm text-pink-400 mb-1">Pay period :</p>
          <p className="text-gray-100 mb-2">
            {periodStart && periodEnd
              ? `${formatDate(periodStart, 'DD/MM/YYYY')} to ${formatDate(periodEnd, 'DD/MM/YYYY')}`
              : '[Period]'}
          </p>
          
          <p className="text-sm text-pink-400 mb-1">Pay date :</p>
          <p className="text-gray-100">{formatDate(payDate || new Date(), 'DD/MM/YYYY')}</p>
        </div>
      </div>

      {/* Worked Days */}
      <div className="mb-6">
        <div className="bg-purple-200 p-2 rounded-t" style={{ backgroundColor: '#e9d5ff' }}>
          <div className="flex justify-between">
            <span className="font-bold text-purple-600" style={{ fontFamily: 'cursive' }}>Worked Days</span>
            <span className="font-bold text-purple-600">Number of Days</span>
          </div>
        </div>
        <div className="border border-gray-600 bg-gray-800">
          {workedDays?.items?.map((item, index) => (
            <div key={index} className="flex justify-between p-2 border-b border-gray-600">
              <span className="text-gray-100">{item.type}</span>
              <span className="text-gray-100">{item.days.toFixed(2)} Days</span>
            </div>
          ))}
          <div className="flex justify-between p-2 font-semibold bg-gray-700">
            <span className="text-gray-100">Total</span>
            <span className="text-gray-100">{workedDays?.totalDays || 0} Days</span>
          </div>
        </div>
      </div>

      {/* Earnings and Deductions */}
      <div className="mb-6">
        <div className="bg-purple-200 p-2 rounded-t" style={{ backgroundColor: '#e9d5ff' }}>
          <div className="grid grid-cols-4 gap-4">
            <span className="font-bold text-purple-600" style={{ fontFamily: 'cursive' }}>Earnings</span>
            <span className="font-bold text-purple-600 text-right">Amounts</span>
            <span className="font-bold text-purple-600" style={{ fontFamily: 'cursive' }}>Deductions</span>
            <span className="font-bold text-purple-600 text-right">Amounts</span>
          </div>
        </div>
        <div className="border border-gray-600 bg-gray-800">
          <div className="grid grid-cols-4 gap-4 p-2">
            <div className="col-span-2">
              {salaryComputation?.grossEarnings?.map((item, index) => {
                const value = getValue ? getValue(item.ruleName, item.amount) : item.amount
                return (
                  <div key={index} className="flex justify-between py-1 border-b border-gray-600">
                    <span className="text-gray-100">{item.ruleName} :</span>
                    <span className="text-gray-100">{formatCurrency(value)}</span>
                  </div>
                )
              })}
              <div className="flex justify-between py-1 font-semibold border-t-2 border-gray-500 mt-1 pt-1">
                <span className="text-gray-100">Gross :</span>
                <span className="text-gray-100">{formatCurrency(totals?.grossTotal || 0)}</span>
              </div>
            </div>
            <div className="col-span-2 border-l border-gray-600 pl-4">
              {salaryComputation?.deductions?.map((item, index) => {
                const value = getValue ? getValue(item.ruleName, Math.abs(item.amount)) : Math.abs(item.amount)
                return (
                  <div key={index} className="flex justify-between py-1 border-b border-gray-600">
                    <span className="text-gray-100">{item.ruleName} :</span>
                    <span className="text-gray-100">- {formatCurrency(value)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Total Net Payable */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-pink-400" style={{ fontFamily: 'cursive' }}>Total Net Payable</p>
          <p className="text-sm text-gray-400">(Gross Earning - Total deductions)</p>
        </div>
        <div className="bg-cyan-200 p-4 rounded-lg" style={{ backgroundColor: '#a5f3fc' }}>
          <p className="text-3xl font-bold text-center text-gray-900">{formatCurrency(totals?.netAmount || 0)}</p>
          <p className="text-sm text-center text-gray-700 mt-1">
            {numberToWords(totals?.netAmount || 0)}
          </p>
        </div>
      </div>
    </div>
  )
}
