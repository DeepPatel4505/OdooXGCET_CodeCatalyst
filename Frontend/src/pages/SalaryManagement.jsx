import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Save, Search, Eye, Pencil, Grid3x3, List } from "lucide-react";
import apiClient from "../lib/api";
import { formatDate, formatCurrency } from "../lib/format";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function SalaryManagement() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"
  const [isSavingSalary, setIsSavingSalary] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get("/employees");
      const employeesData = response.data?.data || response.data || [];
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSalary = async (employee) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
    setIsEditingSalary(false);
    try {
      const response = await apiClient.get(`/employees/${employee.id}/salary`);
      const salaryData = response.data?.data || response.data;

      // Calculate percentages if not present
      const monthWage =
        salaryData.monthWage || salaryData.grossSalary || employee.salary || 0;
      const basicSalary = salaryData.basicSalary || 0;
      const hra = salaryData.hra || salaryData.houseRentAllowance || 0;
      const grossSalary = salaryData.grossSalary || monthWage;

      // Calculate percentages
      const basicSalaryPercent =
        monthWage > 0 ? (basicSalary / monthWage) * 100 : 0;
      const hraPercent = basicSalary > 0 ? (hra / basicSalary) * 100 : 0;
      const standardAllowancePercent =
        monthWage > 0
          ? ((salaryData.standardAllowance || 0) / monthWage) * 100
          : 0;
      const performanceBonusPercent =
        basicSalary > 0
          ? ((salaryData.performanceBonus || 0) / basicSalary) * 100
          : 0;
      const ltaPercent =
        basicSalary > 0
          ? ((salaryData.travelAllowance || 0) / basicSalary) * 100
          : 0;
      const fixedAllowancePercent =
        monthWage > 0
          ? ((salaryData.fixedAllowance || 0) / monthWage) * 100
          : 0;
      const pfPercent =
        basicSalary > 0
          ? ((salaryData.pf || salaryData.pfEmployee || 0) / basicSalary) * 100
          : 0;

      setSalaryInfo({
        ...salaryData,
        monthWage: monthWage || salaryData.monthWage,
        basicSalary,
        hra: hra || salaryData.houseRentAllowance,
        houseRentAllowance: hra || salaryData.houseRentAllowance,
        basicSalaryPercent: salaryData.basicSalaryPercent || basicSalaryPercent,
        hraPercent: salaryData.hraPercent || hraPercent,
        standardAllowancePercent:
          salaryData.standardAllowancePercent || standardAllowancePercent,
        performanceBonusPercent:
          salaryData.performanceBonusPercent || performanceBonusPercent,
        ltaPercent: salaryData.ltaPercent || ltaPercent,
        fixedAllowancePercent:
          salaryData.fixedAllowancePercent || fixedAllowancePercent,
        pfPercent:
          salaryData.pfEmployeePercent || salaryData.pfPercent || pfPercent,
      });
    } catch (error) {
      console.error("Failed to fetch salary info:", error);
      // Use employee salary if available
      if (employee.salary) {
        const monthWage = employee.salary;
        const basicSalary = employee.salary * 0.5;
        const hra = basicSalary * 0.5;
        const standardAllowance = employee.salary * 0.1667;
        const performanceBonus = basicSalary * 0.0833;
        const travelAllowance = basicSalary * 0.0833;

        // Calculate fixed allowance as remaining amount
        const otherComponents =
          basicSalary +
          hra +
          standardAllowance +
          performanceBonus +
          travelAllowance;
        const fixedAllowance = Math.max(0, monthWage - otherComponents);

        const grossSalary = employee.salary;
        const pf = basicSalary * 0.12;
        const professionalTax = 200;
        const netSalary =
          grossSalary <= 0 ? 0 : grossSalary - pf - professionalTax;

        setSalaryInfo({
          monthWage,
          yearlyWage: monthWage * 12,
          basicSalary,
          hra,
          houseRentAllowance: hra,
          standardAllowance,
          performanceBonus,
          travelAllowance,
          fixedAllowance,
          grossSalary,
          pf,
          pfEmployee: pf,
          professionalTax,
          netSalary,
          basicSalaryPercent: 50,
          hraPercent: 50,
          standardAllowancePercent: 16.67,
          performanceBonusPercent: 8.33,
          ltaPercent: 8.33,
          fixedAllowancePercent:
            monthWage > 0 ? (fixedAllowance / monthWage) * 100 : 0,
          pfPercent: 12,
          pfEmployeePercent: 12,
        });
      }
    }
  };

  const handleSaveSalary = async () => {
    if (!selectedEmployee || !salaryInfo) return;

    try {
      setIsSavingSalary(true);

      // Validate all salary fields are non-negative
      const salaryFields = [
        { name: "Month Wage", value: salaryInfo.monthWage },
        { name: "Yearly Wage", value: salaryInfo.yearlyWage },
        { name: "Basic Salary", value: salaryInfo.basicSalary },
        {
          name: "House Rent Allowance",
          value: salaryInfo.hra || salaryInfo.houseRentAllowance,
        },
        { name: "Standard Allowance", value: salaryInfo.standardAllowance },
        { name: "Performance Bonus", value: salaryInfo.performanceBonus },
        { name: "Travel Allowance", value: salaryInfo.travelAllowance },
        { name: "Fixed Allowance", value: salaryInfo.fixedAllowance },
        { name: "PF Employee", value: salaryInfo.pf || salaryInfo.pfEmployee },
        { name: "Professional Tax", value: salaryInfo.professionalTax },
      ];

      for (const field of salaryFields) {
        if (
          field.value !== null &&
          field.value !== undefined &&
          field.value < 0
        ) {
          toast.error(`${field.name} cannot be negative`);
          setIsSavingSalary(false);
          return;
        }
      }

      // Calculate gross and net salary
      const grossSalary =
        (salaryInfo.basicSalary || 0) +
        (salaryInfo.hra || salaryInfo.houseRentAllowance || 0) +
        (salaryInfo.standardAllowance || 0) +
        (salaryInfo.performanceBonus || 0) +
        (salaryInfo.travelAllowance || 0) +
        (salaryInfo.fixedAllowance || 0);

      let netSalary;

      if (grossSalary <= 0) {
        netSalary = 0;
      } else {
        netSalary =
          grossSalary -
          (salaryInfo.pf || salaryInfo.pfEmployee || 0) -
          (salaryInfo.professionalTax || 0);
      }
      // console.log("netSalary", netSalary, "grossSalary", grossSalary);
      const updatedSalaryInfo = {
        ...salaryInfo,
        grossSalary,
        netSalary,
      };
      // console.log("updatedSalaryInfo", updatedSalaryInfo);
      await apiClient.put(
        `/employees/${selectedEmployee.id}/salary`,
        updatedSalaryInfo
      );
      toast.success("Salary information updated successfully");
      setIsEditingSalary(false);
      fetchEmployees();
    } catch (error) {
      console.error("Failed to update salary:", error);
      toast.error("Failed to update salary information");
    } finally {
      setIsSavingSalary(false);
    }
  };

  const departments = [
    ...new Set(employees.map((emp) => emp.department).filter(Boolean)),
  ].sort();

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.employeeId?.toLowerCase().includes(searchLower);
    const matchesDepartment =
      !selectedDepartment ||
      selectedDepartment === "all" ||
      emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading employees...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "hr", "payroll"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Salary Management</h1>
          <p className="text-muted-foreground">
            View and manage employee salary details
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Salaries</CardTitle>
            <CardDescription>
              Click on an employee to view and update their salary information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label
                    htmlFor="department-filter"
                    className="text-xs text-muted-foreground mb-1 block"
                  >
                    Department
                  </Label>
                  <Select
                    value={selectedDepartment || "all"}
                    onValueChange={(value) =>
                      setSelectedDepartment(value === "all" ? null : value)
                    }
                  >
                    <SelectTrigger id="department-filter" className="w-full">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
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

            {viewMode === "table" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Employee ID</TableHead>
                      <TableHead className="text-left">Name</TableHead>
                      <TableHead className="text-left">Email</TableHead>
                      <TableHead className="text-left">Department</TableHead>
                      <TableHead className="text-left">Position</TableHead>
                      <TableHead className="text-right">
                        Current Salary
                      </TableHead>
                      <TableHead className="text-center w-32">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground"
                        >
                          No employees found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium text-left">
                            {employee.employeeId}
                          </TableCell>
                          <TableCell className="text-left">
                            {employee.firstName} {employee.lastName}
                          </TableCell>
                          <TableCell className="text-left">
                            {employee.email}
                          </TableCell>
                          <TableCell className="text-left">
                            {employee.department}
                          </TableCell>
                          <TableCell className="text-left">
                            {employee.position}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(employee.salary || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSalary(employee)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View/Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No employees found
                  </div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewSalary(employee)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {employee.employeeId}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Email:</span>{" "}
                          {employee.email}
                        </p>
                        <p>
                          <span className="font-medium">Department:</span>{" "}
                          {employee.department || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Position:</span>{" "}
                          {employee.position || "N/A"}
                        </p>
                        <p className="font-semibold">
                          <span className="font-medium">Salary:</span>{" "}
                          {formatCurrency(employee.salary || 0)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSalary(employee);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View/Edit
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>
                    Salary Information - {selectedEmployee?.firstName}{" "}
                    {selectedEmployee?.lastName}
                  </DialogTitle>
                  <DialogDescription>
                    View and update employee salary details
                  </DialogDescription>
                </div>
                {salaryInfo && (
                  <Button
                    variant={isEditingSalary ? "outline" : "default"}
                    onClick={() => {
                      if (isEditingSalary) {
                        handleSaveSalary();
                      } else {
                        setIsEditingSalary(true);
                      }
                    }}
                    disabled={isSavingSalary}
                  >
                    {isEditingSalary ? (
                      isSavingSalary ? (
                        "Saving..."
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )
                    ) : (
                      <>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogHeader>
            {salaryInfo && (
              <div className="space-y-6">
                {/* General Work Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    General Work Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Month Wage</Label>
                      {isEditingSalary ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={salaryInfo.monthWage || ""}
                          onChange={(e) => {
                            const value = Math.max(
                              0,
                              parseFloat(e.target.value) || 0
                            );
                            const yearlyWage = value * 12;

                            // Auto-calculate all components based on new wage
                            const basicSalary =
                              (value * (salaryInfo.basicSalaryPercent || 50)) /
                              100;
                            const hra =
                              (basicSalary * (salaryInfo.hraPercent || 50)) /
                              100;
                            const standardAllowance =
                              (value *
                                (salaryInfo.standardAllowancePercent ||
                                  16.67)) /
                              100;
                            const performanceBonus =
                              (basicSalary *
                                (salaryInfo.performanceBonusPercent || 8.33)) /
                              100;
                            const travelAllowance =
                              (basicSalary * (salaryInfo.ltaPercent || 8.33)) /
                              100;

                            // Calculate fixed allowance as remaining amount
                            const otherComponents =
                              basicSalary +
                              hra +
                              standardAllowance +
                              performanceBonus +
                              travelAllowance;
                            const fixedAllowance = Math.max(
                              0,
                              value - otherComponents
                            );
                            const fixedAllowancePercent =
                              value > 0 ? (fixedAllowance / value) * 100 : 0;

                            // Recalculate PF based on new basic salary
                            const pfPercent =
                              salaryInfo.pfPercent ||
                              salaryInfo.pfEmployeePercent ||
                              12;
                            const pf = (basicSalary * pfPercent) / 100;

                            setSalaryInfo({
                              ...salaryInfo,
                              monthWage: value,
                              yearlyWage: yearlyWage,
                              basicSalary: basicSalary,
                              hra: hra,
                              houseRentAllowance: hra,
                              standardAllowance: standardAllowance,
                              performanceBonus: performanceBonus,
                              travelAllowance: travelAllowance,
                              fixedAllowance: fixedAllowance,
                              fixedAllowancePercent: fixedAllowancePercent,
                              pf: pf,
                              pfEmployee: pf,
                            });
                          }}
                          placeholder="Monthly wage"
                        />
                      ) : (
                        <p className="text-lg font-semibold">
                          {formatCurrency(
                            salaryInfo.monthWage || salaryInfo.grossSalary || 0
                          )}{" "}
                          / Month
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Yearly Wage</Label>
                      {isEditingSalary ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={salaryInfo.yearlyWage || ""}
                          onChange={(e) => {
                            const yearlyValue = Math.max(
                              0,
                              parseFloat(e.target.value) || 0
                            );
                            const value = yearlyValue / 12;

                            // Auto-calculate all components based on new wage
                            const basicSalary =
                              (value * (salaryInfo.basicSalaryPercent || 50)) /
                              100;
                            const hra =
                              (basicSalary * (salaryInfo.hraPercent || 50)) /
                              100;
                            const standardAllowance =
                              (value *
                                (salaryInfo.standardAllowancePercent ||
                                  16.67)) /
                              100;
                            const performanceBonus =
                              (basicSalary *
                                (salaryInfo.performanceBonusPercent || 8.33)) /
                              100;
                            const travelAllowance =
                              (basicSalary * (salaryInfo.ltaPercent || 8.33)) /
                              100;

                            // Calculate fixed allowance as remaining amount
                            const otherComponents =
                              basicSalary +
                              hra +
                              standardAllowance +
                              performanceBonus +
                              travelAllowance;
                            const fixedAllowance = Math.max(
                              0,
                              value - otherComponents
                            );
                            const fixedAllowancePercent =
                              value > 0 ? (fixedAllowance / value) * 100 : 0;

                            // Recalculate PF based on new basic salary
                            const pfPercent =
                              salaryInfo.pfPercent ||
                              salaryInfo.pfEmployeePercent ||
                              12;
                            const pf = (basicSalary * pfPercent) / 100;

                            setSalaryInfo({
                              ...salaryInfo,
                              monthWage: value,
                              yearlyWage: yearlyValue,
                              basicSalary: basicSalary,
                              hra: hra,
                              houseRentAllowance: hra,
                              standardAllowance: standardAllowance,
                              performanceBonus: performanceBonus,
                              travelAllowance: travelAllowance,
                              fixedAllowance: fixedAllowance,
                              fixedAllowancePercent: fixedAllowancePercent,
                              pf: pf,
                              pfEmployee: pf,
                            });
                          }}
                          placeholder="Yearly wage"
                        />
                      ) : (
                        <p className="text-lg font-semibold">
                          {formatCurrency(
                            salaryInfo.yearlyWage ||
                              (salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0) * 12
                          )}{" "}
                          / Yearly
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>No of working days in a week</Label>
                      {isEditingSalary ? (
                        <Input
                          type="number"
                          value={salaryInfo.workingDaysPerWeek || ""}
                          onChange={(e) => {
                            setSalaryInfo({
                              ...salaryInfo,
                              workingDaysPerWeek:
                                parseInt(e.target.value) || null,
                            });
                          }}
                          placeholder="Working days per week"
                          min="1"
                          max="7"
                        />
                      ) : (
                        <p className="text-lg font-semibold">
                          {salaryInfo.workingDaysPerWeek || "-"}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Break Time</Label>
                      {isEditingSalary ? (
                        <Input
                          type="number"
                          value={salaryInfo.breakTime || ""}
                          onChange={(e) => {
                            setSalaryInfo({
                              ...salaryInfo,
                              breakTime: parseFloat(e.target.value) || null,
                            });
                          }}
                          placeholder="Break time in hours"
                          step="0.5"
                        />
                      ) : (
                        <p className="text-lg font-semibold">
                          {salaryInfo.breakTime
                            ? `${salaryInfo.breakTime} /hrs`
                            : "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Salary Components */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Salary Components</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Salary */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Basic Salary
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={salaryInfo.basicSalary || ""}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const percent =
                                monthWage > 0 ? (value / monthWage) * 100 : 0;

                              // Recalculate HRA, Performance Bonus, and LTA based on new basic salary
                              const hra =
                                (value * (salaryInfo.hraPercent || 50)) / 100;
                              const performanceBonus =
                                (value *
                                  (salaryInfo.performanceBonusPercent ||
                                    8.33)) /
                                100;
                              const travelAllowance =
                                (value * (salaryInfo.ltaPercent || 8.33)) / 100;

                              // Recalculate PF based on new basic salary
                              const pfPercent =
                                salaryInfo.pfPercent ||
                                salaryInfo.pfEmployeePercent ||
                                12;
                              const pf = (value * pfPercent) / 100;

                              // Recalculate fixed allowance
                              const otherComponents =
                                value +
                                hra +
                                (salaryInfo.standardAllowance || 0) +
                                performanceBonus +
                                travelAllowance;
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                basicSalary: value,
                                basicSalaryPercent: percent,
                                hra: hra,
                                houseRentAllowance: hra,
                                performanceBonus: performanceBonus,
                                travelAllowance: travelAllowance,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                                pf: pf,
                                pfEmployee: pf,
                              });
                            }}
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              salaryInfo.basicSalaryPercent?.toFixed(2) || ""
                            }
                            onChange={(e) => {
                              const percent = Math.max(
                                0,
                                Math.min(100, parseFloat(e.target.value) || 0)
                              );
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const amount = (monthWage * percent) / 100;

                              // Recalculate HRA, Performance Bonus, and LTA based on new basic salary
                              const hra =
                                (amount * (salaryInfo.hraPercent || 50)) / 100;
                              const performanceBonus =
                                (amount *
                                  (salaryInfo.performanceBonusPercent ||
                                    8.33)) /
                                100;
                              const travelAllowance =
                                (amount * (salaryInfo.ltaPercent || 8.33)) /
                                100;

                              // Recalculate PF based on new basic salary
                              const pfPercent =
                                salaryInfo.pfPercent ||
                                salaryInfo.pfEmployeePercent ||
                                12;
                              const pf = (amount * pfPercent) / 100;

                              // Recalculate fixed allowance
                              const otherComponents =
                                amount +
                                hra +
                                (salaryInfo.standardAllowance || 0) +
                                performanceBonus +
                                travelAllowance;
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                basicSalary: amount,
                                basicSalaryPercent: percent,
                                hra: hra,
                                houseRentAllowance: hra,
                                performanceBonus: performanceBonus,
                                travelAllowance: travelAllowance,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                                pf: pf,
                                pfEmployee: pf,
                              });
                            }}
                            className="w-24"
                            placeholder="%"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {formatCurrency(salaryInfo.basicSalary || 0)}{" "}
                            ₹/month
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {salaryInfo.basicSalaryPercent?.toFixed(2) ||
                              "0.00"}{" "}
                            %
                          </span>
                        </div>
                      )}
                    </div>

                    {/* HRA */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        House Rent Allowance (HRA)
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              salaryInfo.hra ||
                              salaryInfo.houseRentAllowance ||
                              ""
                            }
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              const basicSalary = salaryInfo.basicSalary || 0;
                              const percent =
                                basicSalary > 0
                                  ? (value / basicSalary) * 100
                                  : 0;

                              // Recalculate fixed allowance
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const otherComponents =
                                (salaryInfo.basicSalary || 0) +
                                value +
                                (salaryInfo.standardAllowance || 0) +
                                (salaryInfo.performanceBonus || 0) +
                                (salaryInfo.travelAllowance || 0);
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                hra: value,
                                houseRentAllowance: value,
                                hraPercent: percent,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                              });
                            }}
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={salaryInfo.hraPercent?.toFixed(2) || ""}
                            onChange={(e) => {
                              const percent = Math.max(
                                0,
                                Math.min(100, parseFloat(e.target.value) || 0)
                              );
                              const basicSalary = salaryInfo.basicSalary || 0;
                              const amount = (basicSalary * percent) / 100;

                              // Recalculate fixed allowance
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const otherComponents =
                                (salaryInfo.basicSalary || 0) +
                                amount +
                                (salaryInfo.standardAllowance || 0) +
                                (salaryInfo.performanceBonus || 0) +
                                (salaryInfo.travelAllowance || 0);
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                hra: amount,
                                houseRentAllowance: amount,
                                hraPercent: percent,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                              });
                            }}
                            className="w-24"
                            placeholder="%"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {formatCurrency(
                              salaryInfo.hra ||
                                salaryInfo.houseRentAllowance ||
                                0
                            )}{" "}
                            ₹/month
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {salaryInfo.hraPercent?.toFixed(2) || "0.00"} %
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Standard Allowance */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Standard Allowance
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={salaryInfo.standardAllowance || ""}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const percent =
                                monthWage > 0 ? (value / monthWage) * 100 : 0;

                              // Recalculate fixed allowance
                              const otherComponents =
                                (salaryInfo.basicSalary || 0) +
                                (salaryInfo.hra ||
                                  salaryInfo.houseRentAllowance ||
                                  0) +
                                value +
                                (salaryInfo.performanceBonus || 0) +
                                (salaryInfo.travelAllowance || 0);
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                standardAllowance: value,
                                standardAllowancePercent: percent,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                              });
                            }}
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              salaryInfo.standardAllowancePercent?.toFixed(2) ||
                              ""
                            }
                            onChange={(e) => {
                              const percent = Math.max(
                                0,
                                Math.min(100, parseFloat(e.target.value) || 0)
                              );
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const amount = (monthWage * percent) / 100;

                              // Recalculate fixed allowance
                              const otherComponents =
                                (salaryInfo.basicSalary || 0) +
                                (salaryInfo.hra ||
                                  salaryInfo.houseRentAllowance ||
                                  0) +
                                amount +
                                (salaryInfo.performanceBonus || 0) +
                                (salaryInfo.travelAllowance || 0);
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                standardAllowance: amount,
                                standardAllowancePercent: percent,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                              });
                            }}
                            className="w-24"
                            placeholder="%"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {formatCurrency(salaryInfo.standardAllowance || 0)}{" "}
                            ₹/month
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {salaryInfo.standardAllowancePercent?.toFixed(2) ||
                              "0.00"}{" "}
                            %
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Performance Bonus */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Performance Bonus
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={salaryInfo.performanceBonus || ""}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              const basicSalary = salaryInfo.basicSalary || 0;
                              const percent =
                                basicSalary > 0
                                  ? (value / basicSalary) * 100
                                  : 0;

                              // Recalculate fixed allowance
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const otherComponents =
                                (salaryInfo.basicSalary || 0) +
                                (salaryInfo.hra ||
                                  salaryInfo.houseRentAllowance ||
                                  0) +
                                (salaryInfo.standardAllowance || 0) +
                                value +
                                (salaryInfo.travelAllowance || 0);
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                performanceBonus: value,
                                performanceBonusPercent: percent,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                              });
                            }}
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              salaryInfo.performanceBonusPercent?.toFixed(2) ||
                              ""
                            }
                            onChange={(e) => {
                              const percent = Math.max(
                                0,
                                Math.min(100, parseFloat(e.target.value) || 0)
                              );
                              const basicSalary = salaryInfo.basicSalary || 0;
                              const amount = (basicSalary * percent) / 100;

                              // Recalculate fixed allowance
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const otherComponents =
                                (salaryInfo.basicSalary || 0) +
                                (salaryInfo.hra ||
                                  salaryInfo.houseRentAllowance ||
                                  0) +
                                (salaryInfo.standardAllowance || 0) +
                                amount +
                                (salaryInfo.travelAllowance || 0);
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                performanceBonus: amount,
                                performanceBonusPercent: percent,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                              });
                            }}
                            className="w-24"
                            placeholder="%"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {formatCurrency(salaryInfo.performanceBonus || 0)}{" "}
                            ₹/month
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {salaryInfo.performanceBonusPercent?.toFixed(2) ||
                              "0.00"}{" "}
                            %
                          </span>
                        </div>
                      )}
                    </div>

                    {/* LTA */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Leave Travel Allowance (LTA)
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={salaryInfo.travelAllowance || ""}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              const basicSalary = salaryInfo.basicSalary || 0;
                              const percent =
                                basicSalary > 0
                                  ? (value / basicSalary) * 100
                                  : 0;

                              // Recalculate fixed allowance
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const otherComponents =
                                (salaryInfo.basicSalary || 0) +
                                (salaryInfo.hra ||
                                  salaryInfo.houseRentAllowance ||
                                  0) +
                                (salaryInfo.standardAllowance || 0) +
                                (salaryInfo.performanceBonus || 0) +
                                value;
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                travelAllowance: value,
                                ltaPercent: percent,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                              });
                            }}
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={salaryInfo.ltaPercent?.toFixed(2) || ""}
                            onChange={(e) => {
                              const percent = Math.max(
                                0,
                                Math.min(100, parseFloat(e.target.value) || 0)
                              );
                              const basicSalary = salaryInfo.basicSalary || 0;
                              const amount = (basicSalary * percent) / 100;

                              // Recalculate fixed allowance
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const otherComponents =
                                (salaryInfo.basicSalary || 0) +
                                (salaryInfo.hra ||
                                  salaryInfo.houseRentAllowance ||
                                  0) +
                                (salaryInfo.standardAllowance || 0) +
                                (salaryInfo.performanceBonus || 0) +
                                amount;
                              const fixedAllowance = Math.max(
                                0,
                                monthWage - otherComponents
                              );
                              const fixedAllowancePercent =
                                monthWage > 0
                                  ? (fixedAllowance / monthWage) * 100
                                  : 0;

                              setSalaryInfo({
                                ...salaryInfo,
                                travelAllowance: amount,
                                ltaPercent: percent,
                                fixedAllowance: fixedAllowance,
                                fixedAllowancePercent: fixedAllowancePercent,
                              });
                            }}
                            className="w-24"
                            placeholder="%"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {formatCurrency(salaryInfo.travelAllowance || 0)}{" "}
                            ₹/month
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {salaryInfo.ltaPercent?.toFixed(2) || "0.00"} %
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Fixed Allowance */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Fixed Allowance
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={salaryInfo.fixedAllowance || ""}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const percent =
                                monthWage > 0 ? (value / monthWage) * 100 : 0;
                              setSalaryInfo({
                                ...salaryInfo,
                                fixedAllowance: value,
                                fixedAllowancePercent: percent,
                              });
                            }}
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              salaryInfo.fixedAllowancePercent?.toFixed(2) || ""
                            }
                            onChange={(e) => {
                              const percent = Math.max(
                                0,
                                Math.min(100, parseFloat(e.target.value) || 0)
                              );
                              const monthWage =
                                salaryInfo.monthWage ||
                                salaryInfo.grossSalary ||
                                0;
                              const amount = (monthWage * percent) / 100;
                              setSalaryInfo({
                                ...salaryInfo,
                                fixedAllowance: amount,
                                fixedAllowancePercent: percent,
                              });
                            }}
                            className="w-24"
                            placeholder="%"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {formatCurrency(salaryInfo.fixedAllowance || 0)}{" "}
                            ₹/month
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {salaryInfo.fixedAllowancePercent?.toFixed(2) ||
                              "0.00"}{" "}
                            %
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Gross Salary */}
                    <div className="col-span-full p-4 border-2 border-primary rounded-lg bg-primary/5 space-y-3">
                      <Label className="text-base font-semibold block">
                        Gross Salary
                      </Label>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(
                          (salaryInfo.basicSalary || 0) +
                            (salaryInfo.hra ||
                              salaryInfo.houseRentAllowance ||
                              0) +
                            (salaryInfo.standardAllowance || 0) +
                            (salaryInfo.performanceBonus || 0) +
                            (salaryInfo.travelAllowance || 0) +
                            (salaryInfo.fixedAllowance || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Provident Fund Contribution */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Provident Fund (PF) Contribution
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PF Employee */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Employee
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={salaryInfo.pf || salaryInfo.pfEmployee || ""}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              const basicSalary = salaryInfo.basicSalary || 0;
                              const percent =
                                basicSalary > 0
                                  ? (value / basicSalary) * 100
                                  : 0;
                              setSalaryInfo({
                                ...salaryInfo,
                                pf: value,
                                pfEmployee: value,
                                pfPercent: percent,
                                pfEmployeePercent: percent,
                              });
                            }}
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              salaryInfo.pfPercent?.toFixed(2) ||
                              salaryInfo.pfEmployeePercent?.toFixed(2) ||
                              ""
                            }
                            onChange={(e) => {
                              const percent = Math.max(
                                0,
                                Math.min(100, parseFloat(e.target.value) || 0)
                              );
                              const basicSalary = salaryInfo.basicSalary || 0;
                              const amount = (basicSalary * percent) / 100;
                              setSalaryInfo({
                                ...salaryInfo,
                                pf: amount,
                                pfEmployee: amount,
                                pfPercent: percent,
                                pfEmployeePercent: percent,
                              });
                            }}
                            className="w-24"
                            placeholder="%"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {formatCurrency(
                              salaryInfo.pf || salaryInfo.pfEmployee || 0
                            )}{" "}
                            ₹/month
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {salaryInfo.pfPercent?.toFixed(2) ||
                              salaryInfo.pfEmployeePercent?.toFixed(2) ||
                              "0.00"}{" "}
                            %
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tax Deductions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Tax Deductions</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Professional Tax */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label className="text-base font-semibold block">
                        Professional Tax
                      </Label>
                      {isEditingSalary && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={salaryInfo.professionalTax || ""}
                            onChange={(e) =>
                              setSalaryInfo({
                                ...salaryInfo,
                                professionalTax: Math.max(
                                  0,
                                  parseFloat(e.target.value) || 0
                                ),
                              })
                            }
                            className="w-32"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            ₹/month
                          </span>
                        </div>
                      )}
                      {!isEditingSalary && (
                        <div className="text-lg font-semibold">
                          {formatCurrency(salaryInfo.professionalTax || 0)}{" "}
                          <span className="text-sm text-muted-foreground font-normal">
                            ₹/month
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="space-y-2 p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <Label className="text-base font-semibold">Net Salary</Label>
                  <p className="text-2xl font-bold text-primary">
                    {(() => {
                      const grossSalary =
                        (salaryInfo.basicSalary || 0) +
                        (salaryInfo.hra || salaryInfo.houseRentAllowance || 0) +
                        (salaryInfo.standardAllowance || 0) +
                        (salaryInfo.performanceBonus || 0) +
                        (salaryInfo.travelAllowance || 0) +
                        (salaryInfo.fixedAllowance || 0);

                      const netSalary =
                        grossSalary <= 0
                          ? 0
                          : grossSalary -
                            ((salaryInfo.pf || salaryInfo.pfEmployee || 0) +
                              (salaryInfo.professionalTax || 0));

                      return formatCurrency(Math.max(0, netSalary));
                    })()}
                  </p>
                </div>

                {isEditingSalary && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingSalary(false);
                        setIsDialogOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveSalary}
                      disabled={isSavingSalary}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSavingSalary ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
