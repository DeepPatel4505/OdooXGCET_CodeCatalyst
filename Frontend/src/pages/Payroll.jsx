import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import DataTable from "../components/DataTable";
import {
  Eye,
  Play,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Grid3x3,
  List,
  DollarSign,
  Calendar,
  FileText,
  BarChart3,
  Shield,
  Zap,
  Settings,
  Users,
} from "lucide-react";
import apiClient from "../lib/api";
import { formatDate, formatCurrency } from "../lib/format";
import { toast } from "sonner";
import { FeaturesSectionWithHoverEffects } from "../components/ui/feature-section-with-hover-effects";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function Payroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const [payruns, setPayruns] = useState([]);
  const [currentMonthPayrun, setCurrentMonthPayrun] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayrun, setSelectedPayrun] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "dashboard"
  );

  // Filter states - initialize with current date
  const getCurrentDate = () => {
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString(),
    };
  };

  const [selectedYear, setSelectedYear] = useState(() => getCurrentDate().year);
  const [selectedMonth, setSelectedMonth] = useState(
    () => ((getCurrentDate().month-1).toString())
  );
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"

  // Generate year options (current year and 5 years back) - memoized
  const yearOptions = (() => {
    const now = new Date();
    const options = [];
    for (let i = 0; i < 6; i++) {
      options.push((now.getFullYear() - i).toString());
    }
    return options;
  })();

  // Generate month options - constant
  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  useEffect(() => {
    fetchPayruns();
    fetchDashboardData();
    if (activeTab === "payrun") {
      fetchCurrentMonthPayrun();
    }
  }, [activeTab, selectedYear, selectedMonth]);

  const fetchPayruns = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append("year", selectedYear);
      if (selectedMonth) params.append("month", selectedMonth);

      const response = await apiClient.get(
        `/payroll/payruns?${params.toString()}`
      );
      const payrunsData = response.data?.data || response.data || [];
      setPayruns(payrunsData);
    } catch (error) {
      console.error("Failed to fetch payruns:", error);
      toast.error("Failed to fetch payruns");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentMonthPayrun = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedYear) params.append("year", selectedYear);
      if (selectedMonth) params.append("month", selectedMonth);

      const response = await apiClient.get(
        `/payroll/payruns/current-month?${params.toString()}`
      );
      const payrunData = response.data?.data || response.data;
      if (payrunData) {
        setCurrentMonthPayrun(payrunData);
        setPayrolls(payrunData.payrolls || []);
      } else {
        setCurrentMonthPayrun(null);
        setPayrolls([]);
      }
    } catch (error) {
      console.error("Failed to fetch current month payrun:", error);
      toast.error("Failed to fetch current month payrun");
      setCurrentMonthPayrun(null);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get("/payroll/dashboard");
      const dashboardDataResponse = response.data?.data || response.data;
      setDashboardData(dashboardDataResponse);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setDashboardData({
        warnings: [],
        recentPayruns: [],
        employeeCost: {
          annually: [],
          monthly: [],
        },
        employeeCount: {
          annually: [],
          monthly: [],
        },
      });
    }
  };

  const handlePreview = async (payrunId) => {
    try {
      const response = await apiClient.get(
        `/payroll/payruns/${payrunId}/preview`
      );
      setSelectedPayrun(response.data);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Failed to preview payrun:", error);
    }
  };

  const handleProcess = async (payrunId) => {
    try {
      await apiClient.post(`/payroll/payruns/${payrunId}/process`);
      toast.success("Payrun processed successfully");
      fetchPayruns();
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to process payrun:", error);
    }
  };

  const handleValidate = async (payrollId) => {
    try {
      await apiClient.put(`/payroll/${payrollId}/validate`);
      toast.success("Payroll validated successfully");
      fetchCurrentMonthPayrun();
      fetchPayruns();
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to validate payroll:", error);
      toast.error(
        error.response?.data?.message || "Failed to validate payroll"
      );
    }
  };

  const handleProcessPayrun = async () => {
    if (!currentMonthPayrun) return;
    try {
      await apiClient.post(`/payroll/payruns/${currentMonthPayrun.id}/process`);
      toast.success("Payrun processed successfully");
      fetchCurrentMonthPayrun();
      fetchPayruns();
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to process payrun:", error);
      toast.error(error.response?.data?.message || "Failed to process payrun");
    }
  };

  const handlePayrollClick = (payroll) => {
    if (payroll.payslipId) {
      navigate(
        `/payslips/${payroll.payslipId}?payrunId=${currentMonthPayrun?.id}`
      );
    } else {
      navigate(
        `/payslips/payroll/${payroll.id}?payrunId=${currentMonthPayrun?.id}`
      );
    }
  };

  const handleValidateAll = async () => {
    if (!currentMonthPayrun) return;
    try {
      await apiClient.put(
        `/payroll/payruns/${currentMonthPayrun.id}/validate-all`
      );
      toast.success("All payrolls validated successfully");
      fetchCurrentMonthPayrun();
      fetchPayruns();
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to validate all payrolls:", error);
      toast.error(
        error.response?.data?.message || "Failed to validate all payrolls"
      );
    }
  };

  const payrunColumns = [
    {
      header: "Pay Period",
      accessor: (row) =>
        `${formatDate(row.payPeriodStart)} - ${formatDate(row.payPeriodEnd)}`,
    },
    {
      header: "Employee",
      accessor: (row) =>
        `${row.totalEmployees} Employee${row.totalEmployees !== 1 ? "s" : ""}`,
    },
    {
      header: "Employer Cost",
      accessor: "employerCost",
      cell: (row) => formatCurrency(row.employerCost || row.totalAmount * 0.2),
    },
    {
      header: "Basic Wage",
      accessor: "basicWage",
      cell: (row) => formatCurrency(row.basicWage || row.totalAmount * 0.6),
    },
    {
      header: "Gross Wage",
      accessor: "grossWage",
      cell: (row) => formatCurrency(row.grossWage || row.totalAmount * 0.8),
    },
    {
      header: "Net Wage",
      accessor: "netWage",
      cell: (row) => formatCurrency(row.netWage || row.totalAmount),
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "completed" ? (
            <Button
              variant="outline"
              size="sm"
              className="bg-green-100 text-green-800 border-green-300"
            >
              Done
            </Button>
          ) : (
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                row.status === "processing"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {row.status}
            </span>
          )}
        </div>
      ),
    },
  ];

  const payrollColumns = [
    {
      header: "Pay Period",
      accessor: "payPeriod",
      cell: (row) => {
        // Try to get pay period from payroll object first
        if (row.payPeriodStart && row.payPeriodEnd) {
          return `${formatDate(row.payPeriodStart)} - ${formatDate(
            row.payPeriodEnd
          )}`;
        }
        // Fallback to payrun's pay period
        if (
          currentMonthPayrun?.payPeriodStart &&
          currentMonthPayrun?.payPeriodEnd
        ) {
          return `${formatDate(
            currentMonthPayrun.payPeriodStart
          )} - ${formatDate(currentMonthPayrun.payPeriodEnd)}`;
        }
        // If payPeriod is a string (from backend)
        if (row.payPeriod) {
          return row.payPeriod;
        }
        return "-";
      },
    },
    {
      header: "Employee",
      accessor: (row) =>
        row.employee?.name ||
        `${row.employee?.firstName} ${row.employee?.lastName}`,
    },
    {
      header: "Employer Cost",
      accessor: "employerCost",
      cell: (row) => formatCurrency(row.employerCost || 0),
    },
    {
      header: "Basic Wage",
      accessor: "basicWage",
      cell: (row) => formatCurrency(row.basicWage || 0),
    },
    {
      header: "Gross Wage",
      accessor: "grossWage",
      cell: (row) => formatCurrency(row.grossWage || 0),
    },
    {
      header: "Net Wage",
      accessor: "netWage",
      cell: (row) => formatCurrency(row.netWage || 0),
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "Done" || row.status === "validated" ? (
            <Button
              variant="outline"
              size="sm"
              className="bg-green-100 text-green-800 border-green-300"
            >
              Done
            </Button>
          ) : (
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                row.status === "computed"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {row.status}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Year and Month Filters */}
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Label htmlFor="year-filter" className="text-xs">
                Year
              </Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-filter" className="w-32">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="month-filter" className="text-xs">
                Month
              </Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month-filter" className="w-40">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeTab === "payrun" && (
            <div className="flex gap-2">
              {/* {currentMonthPayrun && currentMonthPayrun.status === "draft" && (
                // <Button variant="outline" onClick={handleProcessPayrun}>
                //   <Play className="mr-2 h-4 w-4" />
                //   Process Payrun
                // </Button>
              )} */}
              {currentMonthPayrun &&
                currentMonthPayrun.payrolls &&
                currentMonthPayrun.payrolls.length > 0 &&
                currentMonthPayrun.payrolls.some(
                  (p) => p.status === "computed" || p.status === "draft"
                ) && (
                  <Button variant="outline" onClick={handleValidateAll}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Validate
                  </Button>
                )}
            </div>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="payrun">Payrun</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Warning Cards */}
          {dashboardData?.warnings && dashboardData.warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-800">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Warnings
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  Please review and update missing employee information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.warnings.map((warning, index) => {
                    const getWarningLabel = (type) => {
                      switch (type) {
                        case "noBankAccount":
                          return "Bank Account";
                        case "noPhone":
                          return "Phone Number";
                        case "noPAN":
                          return "PAN Number";
                        case "noUAN":
                          return "UAN Number";
                        case "noAddress":
                          return "Address";
                        default:
                          return "Information";
                      }
                    };

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md bg-yellow-100"
                      >
                        <AlertTriangle className="h-4 w-4 text-yellow-700 flex-shrink-0" />
                        <p className="text-sm text-yellow-800">
                          <span className="font-semibold">{warning.count}</span>{" "}
                          Employee{warning.count !== 1 ? "s" : ""} without{" "}
                          <span className="font-medium">
                            {getWarningLabel(warning.type)}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Payruns */}
          {payruns && payruns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payruns</CardTitle>
                <CardDescription>
                  View all payruns (completed payruns are read-only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={payruns}
                  columns={payrunColumns}
                  searchable
                  searchPlaceholder="Search payruns..."
                  paginated
                  pageSize={10}
                  onRowClick={(payrun) => {
                    setSelectedPayrun(payrun);
                    setIsPreviewOpen(true);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Employee Cost Charts */}
          {dashboardData?.employeeCost && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Employee Cost</CardTitle>
                  <CardDescription>Annually</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.employeeCost.annually}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="cost" fill="#3b82f6" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Employee Cost</CardTitle>
                  <CardDescription>Monthly</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.employeeCost.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="cost" fill="#3b82f6" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employee Count Charts */}
          {dashboardData?.employeeCount && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-800">
                    Employee Count
                  </CardTitle>
                  <CardDescription>Annually</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.employeeCount.annually}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-green-800">
                    Employee Count
                  </CardTitle>
                  <CardDescription>Monthly</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.employeeCount.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payrun" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Loading...</div>
              </CardContent>
            </Card>
          ) : currentMonthPayrun ? (
            <>
              {/* Payrun Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Payrun{" "}
                    {monthOptions.find((m) => m.value === selectedMonth)
                      ?.label || "Selected Month"}{" "}
                    {selectedYear}
                  </CardTitle>
                  <CardDescription>
                    Pay Period:{" "}
                    {currentMonthPayrun.payPeriodStart &&
                    currentMonthPayrun.payPeriodEnd
                      ? `${formatDate(
                          currentMonthPayrun.payPeriodStart
                        )} - ${formatDate(currentMonthPayrun.payPeriodEnd)}`
                      : "N/A"}
                    {currentMonthPayrun.payDate &&
                      ` | Pay Date: ${formatDate(currentMonthPayrun.payDate)}`}
                  </CardDescription>
                  <CardDescription className="mt-2">
                    The payslip of an individual employee is generated on the
                    basis of attendance of that employee in a particular month.
                  </CardDescription>
                  <CardDescription className="mt-2">
                    Done status show once any payrun/payslip has been validated.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Employer Cost
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          currentMonthPayrun.payrolls?.reduce(
                            (sum, p) => sum + (p.grossSalary || 0),
                            0
                          ) ||
                            currentMonthPayrun.totalAmount ||
                            0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gross</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          currentMonthPayrun.payrolls?.reduce(
                            (sum, p) => sum + (p.grossSalary || 0),
                            0
                          ) ||
                            currentMonthPayrun.totalAmount ||
                            0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          currentMonthPayrun.payrolls?.reduce(
                            (sum, p) => sum + (p.netSalary || 0),
                            0
                          ) || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">
                        {currentMonthPayrun.status === "completed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-100 text-green-800 border-green-300"
                          >
                            Done
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {currentMonthPayrun.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Payroll List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Payslip List view</CardTitle>
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
                </CardHeader>
                <CardContent>
                  {viewMode === "table" ? (
                    <DataTable
                      data={payrolls}
                      columns={payrollColumns}
                      searchable
                      searchPlaceholder="Search employees..."
                      paginated
                      pageSize={10}
                      onRowClick={handlePayrollClick}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {payrolls.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          No payrolls found
                        </div>
                      ) : (
                        payrolls.map((payroll) => (
                          <div
                            key={payroll.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handlePayrollClick(payroll)}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold">
                                  {payroll.employee?.name ||
                                    `${payroll.employee?.firstName || ""} ${
                                      payroll.employee?.lastName || ""
                                    }`.trim() ||
                                    "N/A"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {payroll.employee?.employeeId || "N/A"}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  payroll.status === "validated"
                                    ? "bg-green-100 text-green-800"
                                    : payroll.status === "computed"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {payroll.status || "draft"}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium">Period:</span>{" "}
                                {payroll.payPeriodStart && payroll.payPeriodEnd
                                  ? `${formatDate(
                                      payroll.payPeriodStart
                                    )} - ${formatDate(payroll.payPeriodEnd)}`
                                  : currentMonthPayrun?.payPeriodStart &&
                                    currentMonthPayrun?.payPeriodEnd
                                  ? `${formatDate(
                                      currentMonthPayrun.payPeriodStart
                                    )} - ${formatDate(
                                      currentMonthPayrun.payPeriodEnd
                                    )}`
                                  : payroll.payPeriod || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Gross:</span>{" "}
                                {formatCurrency(payroll.grossSalary || 0)}
                              </p>
                              <p>
                                <span className="font-medium">Deductions:</span>{" "}
                                {formatCurrency(payroll.totalDeductions || 0)}
                              </p>
                              <p className="font-semibold">
                                <span className="font-medium">Net:</span>{" "}
                                {formatCurrency(payroll.netSalary || 0)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Payrun Found</CardTitle>
                <CardDescription>
                  No payrun found for{" "}
                  {monthOptions.find((m) => m.value === selectedMonth)?.label ||
                    "selected month"}{" "}
                  {selectedYear}. Create a new payrun to get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Payruns are automatically created for each month. Use the
                  Process Payrun button to generate payrolls.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payrun Details</DialogTitle>
            <DialogDescription>
              {selectedPayrun?.status === "completed"
                ? "View payrun details (read-only - cannot be edited)"
                : "View payrun details"}
            </DialogDescription>
          </DialogHeader>
          {selectedPayrun && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payrun Name</Label>
                  <p className="text-sm font-medium">{selectedPayrun.name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="text-sm font-medium">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        selectedPayrun.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : selectedPayrun.status === "processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedPayrun.status}
                    </span>
                  </p>
                </div>
                <div>
                  <Label>Pay Period</Label>
                  <p className="text-sm font-medium">
                    {selectedPayrun.payPeriodStart &&
                    selectedPayrun.payPeriodEnd
                      ? `${formatDate(
                          selectedPayrun.payPeriodStart
                        )} - ${formatDate(selectedPayrun.payPeriodEnd)}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Pay Date</Label>
                  <p className="text-sm font-medium">
                    {selectedPayrun.payDate
                      ? formatDate(selectedPayrun.payDate)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Total Employees</Label>
                  <p className="text-sm font-medium">
                    {selectedPayrun.totalEmployees || 0}
                  </p>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="text-sm font-medium">
                    {formatCurrency(selectedPayrun.totalAmount || 0)}
                  </p>
                </div>
              </div>
              {selectedPayrun.status === "completed" && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This payrun is completed and cannot be edited. All payrolls
                    have been validated and payslips generated.
                  </p>
                </div>
              )}
              {selectedPayrun.payslips && (
                <div className="space-y-2">
                  <Label>Payslips</Label>
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                    {selectedPayrun.payslips.map((payslip) => (
                      <div
                        key={payslip.id}
                        className="flex items-center justify-between p-2 border-b"
                      >
                        <div>
                          <p className="font-medium">{payslip.employeeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(payslip.netPay)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
