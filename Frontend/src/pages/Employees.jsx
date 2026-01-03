// src/pages/Employees.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Plus,
  Download,
  Search,
  Plane,
  Save,
  Pencil,
  Grid3x3,
  List,
} from "lucide-react";
import apiClient from "../lib/api";
import { formatDate, formatPhone, formatCurrency } from "../lib/format";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";
import { FeaturesSectionWithHoverEffects } from "../components/ui/feature-section-with-hover-effects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// Adjusted zod schema to allow string input for salary (coerce on submit)
const employeeSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "First name must contain only letters, spaces, hyphens, and apostrophes"
    ),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Last name must contain only letters, spaces, hyphens, and apostrophes"
    ),
  email: z
    .string()
    .regex(
      /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|protonmail\.com|zoho\.com|workzen\.com)$/i,
      {
        message: "Invalid email address",
      }
    ),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val || val === "") return true; // Allow empty
        // Remove all non-digit characters except +
        const cleaned = val.replace(/[^\d+]/g, "");
        // Check if it matches phone number pattern: optional +, then 10-15 digits
        return /^[\+]?[1-9][0-9]{9}$/.test(cleaned);
      },
      {
        message:
          "Phone number must be in valid format (10 digits), optional",
      }
    ),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  // allow strings from inputs; we'll coerce to number in onSubmit
  salary: z.union([z.number().min(0, "Salary must be positive"), z.string()]),
  hireDate: z.string().min(1, "Hire date is required"),
  role: z.enum(["admin", "hr", "employee"]).optional(),
});

export default function Employees() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [todayLeaves, setTodayLeaves] = useState([]);
  const [employeeSalaryInfo, setEmployeeSalaryInfo] = useState(null);
  const [employeeViewTab, setEmployeeViewTab] = useState("details");
  const [isEditingEmployeeSalary, setIsEditingEmployeeSalary] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [isSavingEmployeeSalary, setIsSavingEmployeeSalary] = useState(false);
  const [isEditingEmployeeDetails, setIsEditingEmployeeDetails] =
    useState(false);
  const [isSavingEmployeeDetails, setIsSavingEmployeeDetails] = useState(false);
  const [editableEmployeeDetails, setEditableEmployeeDetails] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      role: "employee",
    },
  });

  const formSelectedRole = watch("role");
  const getTodayLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Stable fetch functions
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedDepartment && selectedDepartment !== "all")
        params.append("department", selectedDepartment);
      if (selectedStatus && selectedStatus !== "all")
        params.append("status", selectedStatus);

      const queryString = params.toString();
      const url = queryString ? `/employees?${queryString}` : "/employees";

      const response = await apiClient.get(url);
      const employeesData = response.data?.data || response.data || [];
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      toast.error("Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDepartment, selectedStatus]);

  const fetchTodayData = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const attendanceResponse = await apiClient.get(
        `/attendance?date=${todayStr}`
      );
      const attendanceData =
        attendanceResponse.data?.data || attendanceResponse.data || [];
      setTodayAttendance(Array.isArray(attendanceData) ? attendanceData : []);

      const leavesResponse = await apiClient.get("/leaves");
      const leavesData = leavesResponse.data?.data || leavesResponse.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLeavesList = Array.isArray(leavesData)
        ? leavesData.filter((leave) => {
            if (!leave.startDate || !leave.endDate) return false;
            // parse as local-date string (backend may be UTC; adjust if required)
            const startDate = new Date(leave.startDate + "T00:00:00");
            const endDate = new Date(leave.endDate + "T23:59:59");
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            return (
              leave.status === "approved" &&
              today >= startDate &&
              today <= endDate
            );
          })
        : [];
      setTodayLeaves(todayLeavesList);
    } catch (error) {
      console.error("Failed to fetch today's data:", error);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchTodayData();
  }, [fetchEmployees, fetchTodayData]);

  // Extract unique departments, positions, and roles from employees
  const departments = useMemo(() => {
    const depts = [
      ...new Set(employees.map((emp) => emp.department).filter(Boolean)),
    ];
    return depts.sort();
  }, [employees]);

  const roles = useMemo(() => {
    const rls = [
      ...new Set(employees.map((emp) => emp.user?.role).filter(Boolean)),
    ];
    return rls.sort();
  }, [employees]);

  // debounce search a little
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 220);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Apply role filter (client-side)
    if (selectedRole && selectedRole !== "all") {
      filtered = filtered.filter((emp) => emp.user?.role === selectedRole);
    }

    // Apply search filter (client-side for additional filtering)
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      filtered = filtered.filter((employee) => {
        const name = `${employee.firstName || ""} ${
          employee.lastName || ""
        }`.toLowerCase();
        return (
          name.includes(s) ||
          (employee.email || "").toLowerCase().includes(s) ||
          (employee.employeeId || "").toLowerCase().includes(s) ||
          (employee.department || "").toLowerCase().includes(s) ||
          (employee.position || "").toLowerCase().includes(s)
        );
      });
    }

    return filtered;
  }, [employees, debouncedSearch, selectedRole]);

  const onSubmit = async (data) => {
    try {
      setIsCreatingEmployee(true);
      // coerce salary
      const salaryVal =
        typeof data.salary === "number"
          ? data.salary
          : parseFloat(String(data.salary).replace(/,/g, "")) || 0;

      if (salaryVal < 0) {
        toast.error("Salary cannot be negative");
        setIsCreatingEmployee(false);
        return;
      }

      const payload = {
        ...data,
        phone:
          data.phone && data.phone.trim() !== ""
            ? data.phone.trim()
            : undefined,
        salary: Number.isFinite(salaryVal) ? salaryVal : 0,
      };

      await apiClient.post("/employees", payload);
      toast.success("Employee created successfully");
      setIsCreateOpen(false);
      reset();
      await fetchEmployees();
      fetchTodayData();
    } catch (error) {
      console.error("Failed to create employee:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.error ||
        "Failed to create employee. Please check all fields.";
      toast.error(errorMessage);
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const onError = (errors) => {
    // Show toast for each validation error
    const errorMessages = Object.entries(errors).map(([field, error]) => {
      return error?.message || `${field}: Validation failed`;
    });

    // Show first error or all errors
    if (errorMessages.length > 0) {
      errorMessages.forEach((msg) => {
        toast.error(msg);
      });
    } else {
      toast.error("Please fix the validation errors before submitting");
    }
  };

  const handleSaveEmployeeSalary = async () => {
    if (!selectedEmployee || !employeeSalaryInfo) return;

    try {
      setIsSavingEmployeeSalary(true);

      // Validate all salary fields are non-negative
      const salaryFields = [
        { name: "Month Wage", value: employeeSalaryInfo.monthWage },
        { name: "Yearly Wage", value: employeeSalaryInfo.yearlyWage },
        { name: "Basic Salary", value: employeeSalaryInfo.basicSalary },
        {
          name: "House Rent Allowance",
          value:
            employeeSalaryInfo.hra || employeeSalaryInfo.houseRentAllowance,
        },
        {
          name: "Standard Allowance",
          value: employeeSalaryInfo.standardAllowance,
        },
        {
          name: "Performance Bonus",
          value: employeeSalaryInfo.performanceBonus,
        },
        { name: "Travel Allowance", value: employeeSalaryInfo.travelAllowance },
        { name: "Fixed Allowance", value: employeeSalaryInfo.fixedAllowance },
        {
          name: "PF Employee",
          value: employeeSalaryInfo.pf || employeeSalaryInfo.pfEmployee,
        },
        { name: "Professional Tax", value: employeeSalaryInfo.professionalTax },
      ];

      for (const field of salaryFields) {
        if (
          field.value !== null &&
          field.value !== undefined &&
          field.value < 0
        ) {
          toast.error(`${field.name} cannot be negative`);
          setIsSavingEmployeeSalary(false);
          return;
        }
      }

      // Calculate gross and net salary
      const grossSalary =
        (employeeSalaryInfo.basicSalary || 0) +
        (employeeSalaryInfo.hra || employeeSalaryInfo.houseRentAllowance || 0) +
        (employeeSalaryInfo.standardAllowance || 0) +
        (employeeSalaryInfo.performanceBonus || 0) +
        (employeeSalaryInfo.travelAllowance || 0) +
        (employeeSalaryInfo.fixedAllowance || 0);

      const netSalary =
        grossSalary <= 0
          ? 0
          : grossSalary -
            (employeeSalaryInfo.pf || employeeSalaryInfo.pfEmployee || 0) -
            (employeeSalaryInfo.professionalTax || 0);

      await apiClient.put(`/employees/${selectedEmployee.id}/salary`, {
        monthWage: employeeSalaryInfo.monthWage,
        yearlyWage: employeeSalaryInfo.yearlyWage,
        workingDaysPerWeek: employeeSalaryInfo.workingDaysPerWeek,
        breakTime: employeeSalaryInfo.breakTime,
        basicSalary: employeeSalaryInfo.basicSalary,
        basicSalaryPercent: employeeSalaryInfo.basicSalaryPercent,
        houseRentAllowance:
          employeeSalaryInfo.hra || employeeSalaryInfo.houseRentAllowance,
        hraPercent: employeeSalaryInfo.hraPercent,
        standardAllowance: employeeSalaryInfo.standardAllowance,
        standardAllowancePercent: employeeSalaryInfo.standardAllowancePercent,
        performanceBonus: employeeSalaryInfo.performanceBonus,
        performanceBonusPercent: employeeSalaryInfo.performanceBonusPercent,
        travelAllowance: employeeSalaryInfo.travelAllowance,
        ltaPercent: employeeSalaryInfo.ltaPercent,
        fixedAllowance: employeeSalaryInfo.fixedAllowance,
        fixedAllowancePercent: employeeSalaryInfo.fixedAllowancePercent,
        pfEmployee: employeeSalaryInfo.pf || employeeSalaryInfo.pfEmployee,
        pfEmployeePercent:
          employeeSalaryInfo.pfPercent || employeeSalaryInfo.pfEmployeePercent,
        pfEmployer: employeeSalaryInfo.pfEmployer || 0,
        pfEmployerPercent: employeeSalaryInfo.pfEmployerPercent,
        professionalTax: employeeSalaryInfo.professionalTax,
      });

      toast.success("Salary information updated successfully");
      setIsEditingEmployeeSalary(false);
      await fetchEmployees();
    } catch (error) {
      console.error("Failed to update salary:", error);
      toast.error("Failed to update salary information");
    } finally {
      setIsSavingEmployeeSalary(false);
    }
  };

  const handleSaveEmployeeDetails = async () => {
    if (!selectedEmployee || !editableEmployeeDetails) return;

    try {
      setIsSavingEmployeeDetails(true);

      // Format hire date if it's a Date object
      const hireDateValue = editableEmployeeDetails.hireDate;
      const formattedHireDate =
        hireDateValue instanceof Date
          ? hireDateValue.toISOString().split("T")[0]
          : hireDateValue;

      const payload = {
        firstName: editableEmployeeDetails.firstName,
        lastName: editableEmployeeDetails.lastName,
        email: editableEmployeeDetails.email,
        phone:
          editableEmployeeDetails.phone &&
          editableEmployeeDetails.phone.trim() !== ""
            ? editableEmployeeDetails.phone.trim()
            : undefined,
        department: editableEmployeeDetails.department,
        position: editableEmployeeDetails.position,
        status: editableEmployeeDetails.status,
        hireDate: formattedHireDate,
      };

      const response = await apiClient.put(
        `/employees/${selectedEmployee.id}`,
        payload
      );
      const updatedEmployee = response.data?.data || response.data;

      setSelectedEmployee(updatedEmployee);
      setIsEditingEmployeeDetails(false);
      setEditableEmployeeDetails(null);
      toast.success("Employee details updated successfully");
      await fetchEmployees();
    } catch (error) {
      console.error("Failed to update employee details:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update employee details";
      toast.error(errorMessage);
    } finally {
      setIsSavingEmployeeDetails(false);
    }
  };

  const handleEditEmployeeDetails = () => {
    if (!selectedEmployee) return;
    setEditableEmployeeDetails({
      firstName: selectedEmployee.firstName || "",
      lastName: selectedEmployee.lastName || "",
      email: selectedEmployee.email || "",
      phone: selectedEmployee.phone || "",
      department: selectedEmployee.department || "",
      position: selectedEmployee.position || "",
      status: selectedEmployee.status || "active",
      hireDate: selectedEmployee.hireDate
        ? new Date(selectedEmployee.hireDate).toISOString().split("T")[0]
        : "",
    });
    setIsEditingEmployeeDetails(true);
  };

  const handleCancelEditEmployeeDetails = () => {
    setIsEditingEmployeeDetails(false);
    setEditableEmployeeDetails(null);
  };

  const handleViewEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
    setEmployeeViewTab("details");
    setIsEditingEmployeeSalary(false);
    setIsEditingEmployeeDetails(false);
    setEditableEmployeeDetails(null);
    if (["admin", "hr"].includes(user?.role) && employee?.id) {
      try {
        const response = await apiClient.get(
          `/employees/${employee.id}/salary`
        );
        const salaryData = response.data?.data || response.data;

        // Calculate percentages if not present
        const monthWage =
          salaryData.monthWage ||
          salaryData.grossSalary ||
          employee.salary ||
          0;
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
            ? ((salaryData.pf || salaryData.pfEmployee || 0) / basicSalary) *
              100
            : 0;

        setEmployeeSalaryInfo({
          ...salaryData,
          monthWage: monthWage || salaryData.monthWage,
          basicSalary,
          hra: hra || salaryData.houseRentAllowance,
          houseRentAllowance: hra || salaryData.houseRentAllowance,
          basicSalaryPercent:
            salaryData.basicSalaryPercent || basicSalaryPercent,
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

          setEmployeeSalaryInfo({
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
    }
  };

  const handleExport = async () => {
    try {
      if (!confirm("Export all employees to CSV?")) return;
      const response = await apiClient.get("/employees/export", {
        responseType: "blob",
      });
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: "text/csv" });

      // filename from headers fallback
      const cd = response.headers?.["content-disposition"];
      let filename = `employees-${new Date().toISOString().split("T")[0]}.csv`;
      if (cd) {
        const match = cd.match(/filename="?(.+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Employees exported successfully");
    } catch (error) {
      console.error("Failed to export employees:", error);
      toast.error("Failed to export employees");
    }
  };

  const getEmployeeStatus = (employee) => {
    const onLeave = todayLeaves.some(
      (leave) =>
        leave.employeeId === employee.id ||
        (leave.employee && leave.employee.id === employee.id) ||
        (employee.userId && leave.userId === employee.userId)
    );
    if (onLeave) return "on-leave";

    const attendance = todayAttendance.find(
      (att) =>
        att.employeeId === employee.id ||
        (att.employee && att.employee.id === employee.id) ||
        (att.employee && att.employee.employeeId === employee.employeeId)
    );

    if (attendance && attendance.checkIn && !attendance.checkOut)
      return "present";
    if (attendance && attendance.checkIn && attendance.checkOut)
      return "checked-out";
    if (
      attendance &&
      (attendance.status === "present" || attendance.status === "late")
    )
      return "present";

    return "absent";
  };

  const renderStatusIndicator = (status) => {
    switch (status) {
      case "present":
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
        );
      case "on-leave":
        return (
          <div className="absolute top-2 right-2">
            <Plane className="w-4 h-4 text-blue-500" />
          </div>
        );
      case "absent":
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-sm" />
        );
      case "checked-out":
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm" />
        );
      default:
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-sm" />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your employees</p>
        </div>

        {user?.role !== "employee" && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Employee
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new employee record.
                    </DialogDescription>
                  </DialogHeader>

                  <form
                    onSubmit={handleSubmit(onSubmit, onError)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          {...register("firstName")}
                          onKeyDown={(e) => {
                            // Allow only alphabets, spaces, hyphens, apostrophes, and special keys (backspace, delete, tab, etc.)
                            const key = e.key;
                            // Allow special keys (backspace, delete, tab, arrow keys, etc.)
                            if (
                              key.length === 1 &&
                              !/^[a-zA-Z\s'-]$/.test(key)
                            ) {
                              e.preventDefault();
                            }
                          }}
                          onInput={(e) => {
                            // Remove any numeric characters that might have been pasted
                            const filteredValue = e.target.value.replace(
                              /[0-9]/g,
                              ""
                            );
                            e.target.value = filteredValue;
                            // Update the form value
                            setValue("firstName", filteredValue);
                          }}
                          aria-invalid={errors.firstName ? "true" : "false"}
                        />
                        {errors.firstName && (
                          <p className="text-sm text-destructive">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          {...register("lastName")}
                          onKeyDown={(e) => {
                            // Allow only alphabets, spaces, hyphens, apostrophes, and special keys (backspace, delete, tab, etc.)
                            const key = e.key;
                            // Allow special keys (backspace, delete, tab, arrow keys, etc.)
                            if (
                              key.length === 1 &&
                              !/^[a-zA-Z\s'-]$/.test(key)
                            ) {
                              e.preventDefault();
                            }
                          }}
                          onInput={(e) => {
                            // Remove any numeric characters that might have been pasted
                            const filteredValue = e.target.value.replace(
                              /[0-9]/g,
                              ""
                            );
                            e.target.value = filteredValue;
                            // Update the form value
                            setValue("lastName", filteredValue);
                          }}
                          aria-invalid={errors.lastName ? "true" : "false"}
                        />
                        {errors.lastName && (
                          <p className="text-sm text-destructive">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        aria-invalid={errors.email ? "true" : "false"}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...register("phone")}
                        onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                        aria-invalid={errors.phone ? "true" : "false"}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          {...register("department")}
                          aria-invalid={errors.department ? "true" : "false"}
                        />
                        {errors.department && (
                          <p className="text-sm text-destructive">
                            {errors.department.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          {...register("position")}
                          aria-invalid={errors.position ? "true" : "false"}
                        />
                        {errors.position && (
                          <p className="text-sm text-destructive">
                            {errors.position.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="salary">Salary</Label>
                        <Input
                          id="salary"
                          type="number"
                          {...register("salary", { valueAsNumber: true })}
                          aria-invalid={errors.salary ? "true" : "false"}
                        />
                        {errors.salary && (
                          <p className="text-sm text-destructive">
                            {errors.salary.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hireDate">Hire Date</Label>
                        <Input
                          id="hireDate"
                          type="date"
                          {...register("hireDate")}
                          min={getTodayLocalDate()}
                          aria-invalid={errors.hireDate ? "true" : "false"}
                        />
                        {errors.hireDate && (
                          <p className="text-sm text-destructive">
                            {errors.hireDate.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={formSelectedRole || "employee"}
                        onValueChange={(value) => setValue("role", value)}
                      >
                        <SelectTrigger
                          id="role"
                          aria-invalid={errors.role ? "true" : "false"}
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.role && (
                        <p className="text-sm text-destructive">
                          {errors.role.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Select the role for this employee. They will receive
                        login credentials via email.
                      </p>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateOpen(false)}
                        disabled={isCreatingEmployee}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreatingEmployee}>
                        {isCreatingEmployee ? "Creating..." : "Create Employee"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            View and manage all employees in your organization
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6 space-y-4">
            {/* Search Bar and View Toggle */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees by name, email, ID, department, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filter Options */}
            <div className="flex flex-wrap gap-4 items-center">
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

              <div className="flex-1 min-w-[200px]">
                <Label
                  htmlFor="status-filter"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  Status
                </Label>
                <Select
                  value={selectedStatus || "all"}
                  onValueChange={(value) =>
                    setSelectedStatus(value === "all" ? null : value)
                  }
                >
                  <SelectTrigger id="status-filter" className="w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label
                  htmlFor="role-filter"
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  Role
                </Label>
                <Select
                  value={selectedRole || "all"}
                  onValueChange={(value) =>
                    setSelectedRole(value === "all" ? null : value)
                  }
                >
                  <SelectTrigger id="role-filter" className="w-full">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(selectedDepartment || selectedStatus || selectedRole) && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDepartment(null);
                      setSelectedStatus(null);
                      setSelectedRole(null);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Features Section */}
          {/* <div className="py-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">
                Employee Management Features
              </h2>
              <p className="text-muted-foreground">
                Everything you need to manage your workforce efficiently
              </p>
            </div>
            <FeaturesSectionWithHoverEffects
              features={
                user?.role !== "employee"
                  ? [
                      {
                        title: "Employee Database",
                        description:
                          "Comprehensive employee database with detailed profiles and organizational structure.",
                        icon: Users,
                      },
                      {
                        title: "Attendance Tracking",
                        description:
                          "Real-time attendance monitoring with check-in/check-out functionality and detailed reports.",
                        icon: Clock,
                      },
                      {
                        title: "Leave Management",
                        description:
                          "Streamlined leave request system with approval workflows and calendar integration.",
                        icon: Calendar,
                      },
                      {
                        title: "Salary Management",
                        description:
                          "Automated salary calculations with structures and deductions.",
                        icon: DollarSign,
                      },
                      {
                        title: "Analytics & Reports",
                        description:
                          "Powerful dashboard with insights, trends, and comprehensive reporting capabilities.",
                        icon: BarChart3,
                      },
                      {
                        title: "Secure & Compliant",
                        description:
                          "Enterprise-grade security with role-based access control and data encryption.",
                        icon: Shield,
                      },
                      {
                        title: "Quick Actions",
                        description:
                          "Fast access to common tasks and frequently used features.",
                        icon: Zap,
                      },
                      {
                        title: "Document Management",
                        description:
                          "Store and manage employee documents, contracts, and important files.",
                        icon: FileText,
                      },
                    ]
                  : [
                      {
                        title: "My Profile",
                        description:
                          "View and update your personal information, contact details, and preferences.",
                        icon: Users,
                      },
                      {
                        title: "My Attendance",
                        description:
                          "Track your daily attendance, check-in/check-out times, and attendance history.",
                        icon: Clock,
                      },
                      {
                        title: "Leave Requests",
                        description:
                          "Submit and manage your leave requests with real-time status updates.",
                        icon: Calendar,
                      },
                      {
                        title: "Attendance Analytics",
                        description:
                          "View your attendance trends and performance metrics over time.",
                        icon: BarChart3,
                      },
                      {
                        title: "Quick Actions",
                        description:
                          "Fast access to common tasks and frequently used features.",
                        icon: Zap,
                      },
                      {
                        title: "Notifications",
                        description:
                          "Stay updated with important announcements and system notifications.",
                        icon: Shield,
                      },
                      {
                        title: "Settings",
                        description:
                          "Customize your preferences and account settings.",
                        icon: Settings,
                      },
                    ]
              }
            />
          </div> */}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading employees...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ||
              selectedDepartment ||
              selectedStatus ||
              selectedRole
                ? "No employees found matching your filters."
                : "No employees found."}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredEmployees.map((employee) => {
                const status = getEmployeeStatus(employee);
                const fullName = `${employee.firstName || ""} ${
                  employee.lastName || ""
                }`.trim();
                const initials = `${employee.firstName?.[0] || ""}${
                  employee.lastName?.[0] || ""
                }`.toUpperCase();

                return (
                  <div
                    key={
                      employee.id ||
                      employee.employeeId ||
                      `${fullName}-${Math.random()}`
                    }
                    className="relative border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                    onClick={() => handleViewEmployee(employee)}
                  >
                    {renderStatusIndicator(status)}

                    <div className="flex justify-center mb-3">
                      {employee.avatar || employee.user?.avatar ? (
                        <img
                          src={employee.avatar || employee.user?.avatar}
                          alt={fullName}
                          className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center border-2 border-gray-200">
                          <span className="text-xl font-semibold text-primary">
                            {initials}
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-center font-semibold text-lg mb-1">
                      {fullName}
                    </h3>

                    <div className="text-center text-sm text-muted-foreground space-y-1">
                      {employee.position && (
                        <p className="truncate">{employee.position}</p>
                      )}
                      {employee.department && (
                        <p className="truncate">{employee.department}</p>
                      )}
                      {employee.employeeId && (
                        <p className="text-xs mt-2">
                          ID: {employee.employeeId}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Employee ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Position
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Today
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const status = getEmployeeStatus(employee);
                    const fullName = `${employee.firstName || ""} ${
                      employee.lastName || ""
                    }`.trim();
                    const initials = `${employee.firstName?.[0] || ""}${
                      employee.lastName?.[0] || ""
                    }`.toUpperCase();

                    return (
                      <tr
                        key={
                          employee.id ||
                          employee.employeeId ||
                          `${fullName}-${Math.random()}`
                        }
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleViewEmployee(employee)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {employee.avatar || employee.user?.avatar ? (
                                <img
                                  src={employee.avatar || employee.user?.avatar}
                                  alt={fullName}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-gray-200">
                                  <span className="text-sm font-semibold text-primary">
                                    {initials}
                                  </span>
                                </div>
                              )}
                              {status === "present" && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                              )}
                              {status === "on-leave" && (
                                <div className="absolute -top-1 -right-1">
                                  <Plane className="w-4 h-4 text-blue-500" />
                                </div>
                              )}
                              {status === "absent" && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-sm" />
                              )}
                              {status === "checked-out" && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{fullName}</p>
                              {employee.user?.role && (
                                <p className="text-xs text-muted-foreground capitalize">
                                  {employee.user.role}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {employee.employeeId || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {employee.department || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {employee.position || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {employee.email || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              employee.status === "active"
                                ? "bg-green-100 text-green-800"
                                : employee.status === "inactive"
                                ? "bg-yellow-100 text-yellow-800"
                                : employee.status === "terminated"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {employee.status || "active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              status === "present"
                                ? "bg-green-100 text-green-800"
                                : status === "on-leave"
                                ? "bg-blue-100 text-blue-800"
                                : status === "absent"
                                ? "bg-yellow-100 text-yellow-800"
                                : status === "checked-out"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {status || "unknown"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              View and manage employee information
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <Tabs
              value={employeeViewTab}
              onValueChange={setEmployeeViewTab}
              className="space-y-4"
            >
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                {["admin", "hr"].includes(user?.role) && (
                  <TabsTrigger value="salary">Salary Info</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {["admin", "hr"].includes(user?.role) && (
                  <div className="flex justify-end mb-4">
                    {!isEditingEmployeeDetails ? (
                      <Button
                        variant="outline"
                        onClick={handleEditEmployeeDetails}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Details
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelEditEmployeeDetails}
                          disabled={isSavingEmployeeDetails}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveEmployeeDetails}
                          disabled={isSavingEmployeeDetails}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSavingEmployeeDetails
                            ? "Saving..."
                            : "Save Changes"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employee ID</Label>
                    <p className="text-sm font-medium">
                      {selectedEmployee.employeeId}
                    </p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    {isEditingEmployeeDetails &&
                    ["admin", "hr"].includes(user?.role) ? (
                      <Select
                        value={editableEmployeeDetails?.status || "active"}
                        onValueChange={(value) =>
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            status: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium">
                        {selectedEmployee.status}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>First Name</Label>
                    {isEditingEmployeeDetails &&
                    ["admin", "hr"].includes(user?.role) ? (
                      <Input
                        value={editableEmployeeDetails?.firstName || ""}
                        onChange={(e) =>
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            firstName: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          const key = e.key;
                          if (key.length === 1 && !/^[a-zA-Z\s'-]$/.test(key)) {
                            e.preventDefault();
                          }
                        }}
                        onInput={(e) => {
                          const filteredValue = e.target.value.replace(
                            /[0-9]/g,
                            ""
                          );
                          e.target.value = filteredValue;
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            firstName: filteredValue,
                          });
                        }}
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {selectedEmployee.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    {isEditingEmployeeDetails &&
                    ["admin", "hr"].includes(user?.role) ? (
                      <Input
                        value={editableEmployeeDetails?.lastName || ""}
                        onChange={(e) =>
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            lastName: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          const key = e.key;
                          if (key.length === 1 && !/^[a-zA-Z\s'-]$/.test(key)) {
                            e.preventDefault();
                          }
                        }}
                        onInput={(e) => {
                          const filteredValue = e.target.value.replace(
                            /[0-9]/g,
                            ""
                          );
                          e.target.value = filteredValue;
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            lastName: filteredValue,
                          });
                        }}
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {selectedEmployee.lastName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Email</Label>
                    {isEditingEmployeeDetails &&
                    ["admin", "hr"].includes(user?.role) ? (
                      <Input
                        type="email"
                        value={editableEmployeeDetails?.email || ""}
                        onChange={(e) =>
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            email: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {selectedEmployee.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Phone</Label>
                    {isEditingEmployeeDetails &&
                    ["admin", "hr"].includes(user?.role) ? (
                      <Input
                        type="tel"
                        value={editableEmployeeDetails?.phone || ""}
                        onChange={(e) =>
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            phone: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {formatPhone(selectedEmployee.phone)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Department</Label>
                    {isEditingEmployeeDetails &&
                    ["admin", "hr"].includes(user?.role) ? (
                      <Input
                        value={editableEmployeeDetails?.department || ""}
                        onChange={(e) =>
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            department: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {selectedEmployee.department}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Position</Label>
                    {isEditingEmployeeDetails &&
                    ["admin", "hr"].includes(user?.role) ? (
                      <Input
                        value={editableEmployeeDetails?.position || ""}
                        onChange={(e) =>
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            position: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {selectedEmployee.position}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Hire Date</Label>
                    {isEditingEmployeeDetails &&
                    ["admin", "hr"].includes(user?.role) ? (
                      <Input
                        type="date"
                        value={editableEmployeeDetails?.hireDate || ""}
                        onChange={(e) =>
                          setEditableEmployeeDetails({
                            ...editableEmployeeDetails,
                            hireDate: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {formatDate(selectedEmployee.hireDate)}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {["admin", "hr"].includes(user?.role) && (
                <TabsContent value="salary" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Salary Information - {selectedEmployee?.firstName}{" "}
                        {selectedEmployee?.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        View and update employee salary details
                      </p>
                    </div>
                    {employeeSalaryInfo && (
                      <Button
                        variant={
                          isEditingEmployeeSalary ? "outline" : "default"
                        }
                        onClick={() => {
                          if (isEditingEmployeeSalary) {
                            handleSaveEmployeeSalary();
                          } else {
                            setIsEditingEmployeeSalary(true);
                          }
                        }}
                      >
                        {isEditingEmployeeSalary ? (
                          isSavingEmployeeSalary ? (
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
                  {employeeSalaryInfo ? (
                    <div className="space-y-6">
                      {/* General Work Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          General Work Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Month Wage</Label>
                            {isEditingEmployeeSalary ? (
                              <Input
                                type="number"
                                value={employeeSalaryInfo.monthWage || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  const yearlyWage = value * 12;

                                  // Auto-calculate all components based on new wage
                                  const basicSalary =
                                    (value *
                                      (employeeSalaryInfo.basicSalaryPercent ||
                                        50)) /
                                    100;
                                  const hra =
                                    (basicSalary *
                                      (employeeSalaryInfo.hraPercent || 50)) /
                                    100;
                                  const standardAllowance =
                                    (value *
                                      (employeeSalaryInfo.standardAllowancePercent ||
                                        16.67)) /
                                    100;
                                  const performanceBonus =
                                    (basicSalary *
                                      (employeeSalaryInfo.performanceBonusPercent ||
                                        8.33)) /
                                    100;
                                  const travelAllowance =
                                    (basicSalary *
                                      (employeeSalaryInfo.ltaPercent || 8.33)) /
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
                                    value > 0
                                      ? (fixedAllowance / value) * 100
                                      : 0;

                                  // Recalculate PF based on new basic salary
                                  const pfPercent =
                                    employeeSalaryInfo.pfPercent ||
                                    employeeSalaryInfo.pfEmployeePercent ||
                                    12;
                                  const pf = (basicSalary * pfPercent) / 100;

                                  setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    monthWage: value,
                                    yearlyWage: yearlyWage,
                                    basicSalary: basicSalary,
                                    hra: hra,
                                    houseRentAllowance: hra,
                                    standardAllowance: standardAllowance,
                                    performanceBonus: performanceBonus,
                                    travelAllowance: travelAllowance,
                                    fixedAllowance: fixedAllowance,
                                    fixedAllowancePercent:
                                      fixedAllowancePercent,
                                    pf: pf,
                                    pfEmployee: pf,
                                  });
                                }}
                                placeholder="Monthly wage"
                              />
                            ) : (
                              <p className="text-lg font-semibold">
                                {formatCurrency(
                                  employeeSalaryInfo.monthWage ||
                                    employeeSalaryInfo.grossSalary ||
                                    0
                                )}{" "}
                                / Month
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Yearly Wage</Label>
                            {isEditingEmployeeSalary ? (
                              <Input
                                type="number"
                                value={employeeSalaryInfo.yearlyWage || ""}
                                onChange={(e) => {
                                  const yearlyValue =
                                    parseFloat(e.target.value) || 0;
                                  const value = yearlyValue / 12;

                                  // Auto-calculate all components based on new wage
                                  const basicSalary =
                                    (value *
                                      (employeeSalaryInfo.basicSalaryPercent ||
                                        50)) /
                                    100;
                                  const hra =
                                    (basicSalary *
                                      (employeeSalaryInfo.hraPercent || 50)) /
                                    100;
                                  const standardAllowance =
                                    (value *
                                      (employeeSalaryInfo.standardAllowancePercent ||
                                        16.67)) /
                                    100;
                                  const performanceBonus =
                                    (basicSalary *
                                      (employeeSalaryInfo.performanceBonusPercent ||
                                        8.33)) /
                                    100;
                                  const travelAllowance =
                                    (basicSalary *
                                      (employeeSalaryInfo.ltaPercent || 8.33)) /
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
                                    value > 0
                                      ? (fixedAllowance / value) * 100
                                      : 0;

                                  // Recalculate PF based on new basic salary
                                  const pfPercent =
                                    employeeSalaryInfo.pfPercent ||
                                    employeeSalaryInfo.pfEmployeePercent ||
                                    12;
                                  const pf = (basicSalary * pfPercent) / 100;

                                  setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    monthWage: value,
                                    yearlyWage: yearlyValue,
                                    basicSalary: basicSalary,
                                    hra: hra,
                                    houseRentAllowance: hra,
                                    standardAllowance: standardAllowance,
                                    performanceBonus: performanceBonus,
                                    travelAllowance: travelAllowance,
                                    fixedAllowance: fixedAllowance,
                                    fixedAllowancePercent:
                                      fixedAllowancePercent,
                                    pf: pf,
                                    pfEmployee: pf,
                                  });
                                }}
                                placeholder="Yearly wage"
                              />
                            ) : (
                              <p className="text-lg font-semibold">
                                {formatCurrency(
                                  employeeSalaryInfo.yearlyWage ||
                                    (employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0) * 12
                                )}{" "}
                                / Yearly
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>No of working days in a week</Label>
                            {isEditingEmployeeSalary ? (
                              <Input
                                type="number"
                                value={
                                  employeeSalaryInfo.workingDaysPerWeek || ""
                                }
                                onChange={(e) => {
                                  setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
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
                                {employeeSalaryInfo.workingDaysPerWeek || "-"}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Break Time</Label>
                            {isEditingEmployeeSalary ? (
                              <Input
                                type="number"
                                value={employeeSalaryInfo.breakTime || ""}
                                onChange={(e) => {
                                  setEmployeeSalaryInfo({
                                    ...employeeSalaryInfo,
                                    breakTime:
                                      parseFloat(e.target.value) || null,
                                  });
                                }}
                                placeholder="Break time in hours"
                                step="0.5"
                              />
                            ) : (
                              <p className="text-lg font-semibold">
                                {employeeSalaryInfo.breakTime
                                  ? `${employeeSalaryInfo.breakTime} /hrs`
                                  : "-"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Salary Components */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Salary Components
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Basic Salary */}
                          <div className="p-4 border rounded-lg space-y-3">
                            <Label className="text-base font-semibold block">
                              Basic Salary
                            </Label>
                            {isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={employeeSalaryInfo.basicSalary || ""}
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const percent =
                                      monthWage > 0
                                        ? (value / monthWage) * 100
                                        : 0;

                                    // Recalculate HRA, Performance Bonus, and LTA based on new basic salary
                                    const hra =
                                      (value *
                                        (employeeSalaryInfo.hraPercent || 50)) /
                                      100;
                                    const performanceBonus =
                                      (value *
                                        (employeeSalaryInfo.performanceBonusPercent ||
                                          8.33)) /
                                      100;
                                    const travelAllowance =
                                      (value *
                                        (employeeSalaryInfo.ltaPercent ||
                                          8.33)) /
                                      100;

                                    // Recalculate PF based on new basic salary
                                    const pfPercent =
                                      employeeSalaryInfo.pfPercent ||
                                      employeeSalaryInfo.pfEmployeePercent ||
                                      12;
                                    const pf = (value * pfPercent) / 100;

                                    // Recalculate fixed allowance
                                    const otherComponents =
                                      value +
                                      hra +
                                      (employeeSalaryInfo.standardAllowance ||
                                        0) +
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

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      basicSalary: value,
                                      basicSalaryPercent: percent,
                                      hra: hra,
                                      houseRentAllowance: hra,
                                      performanceBonus: performanceBonus,
                                      travelAllowance: travelAllowance,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
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
                                  value={
                                    employeeSalaryInfo.basicSalaryPercent?.toFixed(
                                      2
                                    ) || ""
                                  }
                                  onChange={(e) => {
                                    const percent =
                                      parseFloat(e.target.value) || 0;
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const amount = (monthWage * percent) / 100;

                                    // Recalculate HRA, Performance Bonus, and LTA based on new basic salary
                                    const hra =
                                      (amount *
                                        (employeeSalaryInfo.hraPercent || 50)) /
                                      100;
                                    const performanceBonus =
                                      (amount *
                                        (employeeSalaryInfo.performanceBonusPercent ||
                                          8.33)) /
                                      100;
                                    const travelAllowance =
                                      (amount *
                                        (employeeSalaryInfo.ltaPercent ||
                                          8.33)) /
                                      100;

                                    // Recalculate PF based on new basic salary
                                    const pfPercent =
                                      employeeSalaryInfo.pfPercent ||
                                      employeeSalaryInfo.pfEmployeePercent ||
                                      12;
                                    const pf = (amount * pfPercent) / 100;

                                    // Recalculate fixed allowance
                                    const otherComponents =
                                      amount +
                                      hra +
                                      (employeeSalaryInfo.standardAllowance ||
                                        0) +
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

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      basicSalary: amount,
                                      basicSalaryPercent: percent,
                                      hra: hra,
                                      houseRentAllowance: hra,
                                      performanceBonus: performanceBonus,
                                      travelAllowance: travelAllowance,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
                                      pf: pf,
                                      pfEmployee: pf,
                                    });
                                  }}
                                  className="w-24"
                                  placeholder="%"
                                  step="0.01"
                                />
                                <span className="text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            )}
                            {!isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">
                                  {formatCurrency(
                                    employeeSalaryInfo.basicSalary || 0
                                  )}{" "}
                                  ₹/month
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {employeeSalaryInfo.basicSalaryPercent?.toFixed(
                                    2
                                  ) || "0.00"}{" "}
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
                            {isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={
                                    employeeSalaryInfo.hra ||
                                    employeeSalaryInfo.houseRentAllowance ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    const basicSalary =
                                      employeeSalaryInfo.basicSalary || 0;
                                    const percent =
                                      basicSalary > 0
                                        ? (value / basicSalary) * 100
                                        : 0;

                                    // Recalculate fixed allowance
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const otherComponents =
                                      (employeeSalaryInfo.basicSalary || 0) +
                                      value +
                                      (employeeSalaryInfo.standardAllowance ||
                                        0) +
                                      (employeeSalaryInfo.performanceBonus ||
                                        0) +
                                      (employeeSalaryInfo.travelAllowance || 0);
                                    const fixedAllowance = Math.max(
                                      0,
                                      monthWage - otherComponents
                                    );
                                    const fixedAllowancePercent =
                                      monthWage > 0
                                        ? (fixedAllowance / monthWage) * 100
                                        : 0;

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      hra: value,
                                      houseRentAllowance: value,
                                      hraPercent: percent,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
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
                                  value={
                                    employeeSalaryInfo.hraPercent?.toFixed(2) ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const percent =
                                      parseFloat(e.target.value) || 0;
                                    const basicSalary =
                                      employeeSalaryInfo.basicSalary || 0;
                                    const amount =
                                      (basicSalary * percent) / 100;

                                    // Recalculate fixed allowance
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const otherComponents =
                                      (employeeSalaryInfo.basicSalary || 0) +
                                      amount +
                                      (employeeSalaryInfo.standardAllowance ||
                                        0) +
                                      (employeeSalaryInfo.performanceBonus ||
                                        0) +
                                      (employeeSalaryInfo.travelAllowance || 0);
                                    const fixedAllowance = Math.max(
                                      0,
                                      monthWage - otherComponents
                                    );
                                    const fixedAllowancePercent =
                                      monthWage > 0
                                        ? (fixedAllowance / monthWage) * 100
                                        : 0;

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      hra: amount,
                                      houseRentAllowance: amount,
                                      hraPercent: percent,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
                                    });
                                  }}
                                  className="w-24"
                                  placeholder="%"
                                  step="0.01"
                                />
                                <span className="text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            )}
                            {!isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">
                                  {formatCurrency(
                                    employeeSalaryInfo.hra ||
                                      employeeSalaryInfo.houseRentAllowance ||
                                      0
                                  )}{" "}
                                  ₹/month
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {employeeSalaryInfo.hraPercent?.toFixed(2) ||
                                    "0.00"}{" "}
                                  %
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Standard Allowance */}
                          <div className="p-4 border rounded-lg space-y-3">
                            <Label className="text-base font-semibold block">
                              Standard Allowance
                            </Label>
                            {isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={
                                    employeeSalaryInfo.standardAllowance || ""
                                  }
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const percent =
                                      monthWage > 0
                                        ? (value / monthWage) * 100
                                        : 0;

                                    // Recalculate fixed allowance
                                    const otherComponents =
                                      (employeeSalaryInfo.basicSalary || 0) +
                                      (employeeSalaryInfo.hra ||
                                        employeeSalaryInfo.houseRentAllowance ||
                                        0) +
                                      value +
                                      (employeeSalaryInfo.performanceBonus ||
                                        0) +
                                      (employeeSalaryInfo.travelAllowance || 0);
                                    const fixedAllowance = Math.max(
                                      0,
                                      monthWage - otherComponents
                                    );
                                    const fixedAllowancePercent =
                                      monthWage > 0
                                        ? (fixedAllowance / monthWage) * 100
                                        : 0;

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      standardAllowance: value,
                                      standardAllowancePercent: percent,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
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
                                  value={
                                    employeeSalaryInfo.standardAllowancePercent?.toFixed(
                                      2
                                    ) || ""
                                  }
                                  onChange={(e) => {
                                    const percent =
                                      parseFloat(e.target.value) || 0;
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const amount = (monthWage * percent) / 100;

                                    // Recalculate fixed allowance
                                    const otherComponents =
                                      (employeeSalaryInfo.basicSalary || 0) +
                                      (employeeSalaryInfo.hra ||
                                        employeeSalaryInfo.houseRentAllowance ||
                                        0) +
                                      amount +
                                      (employeeSalaryInfo.performanceBonus ||
                                        0) +
                                      (employeeSalaryInfo.travelAllowance || 0);
                                    const fixedAllowance = Math.max(
                                      0,
                                      monthWage - otherComponents
                                    );
                                    const fixedAllowancePercent =
                                      monthWage > 0
                                        ? (fixedAllowance / monthWage) * 100
                                        : 0;

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      standardAllowance: amount,
                                      standardAllowancePercent: percent,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
                                    });
                                  }}
                                  className="w-24"
                                  placeholder="%"
                                  step="0.01"
                                />
                                <span className="text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            )}
                            {!isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">
                                  {formatCurrency(
                                    employeeSalaryInfo.standardAllowance || 0
                                  )}{" "}
                                  ₹/month
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {employeeSalaryInfo.standardAllowancePercent?.toFixed(
                                    2
                                  ) || "0.00"}{" "}
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
                            {isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={
                                    employeeSalaryInfo.performanceBonus || ""
                                  }
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    const basicSalary =
                                      employeeSalaryInfo.basicSalary || 0;
                                    const percent =
                                      basicSalary > 0
                                        ? (value / basicSalary) * 100
                                        : 0;

                                    // Recalculate fixed allowance
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const otherComponents =
                                      (employeeSalaryInfo.basicSalary || 0) +
                                      (employeeSalaryInfo.hra ||
                                        employeeSalaryInfo.houseRentAllowance ||
                                        0) +
                                      (employeeSalaryInfo.standardAllowance ||
                                        0) +
                                      value +
                                      (employeeSalaryInfo.travelAllowance || 0);
                                    const fixedAllowance = Math.max(
                                      0,
                                      monthWage - otherComponents
                                    );
                                    const fixedAllowancePercent =
                                      monthWage > 0
                                        ? (fixedAllowance / monthWage) * 100
                                        : 0;

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      performanceBonus: value,
                                      performanceBonusPercent: percent,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
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
                                  value={
                                    employeeSalaryInfo.performanceBonusPercent?.toFixed(
                                      2
                                    ) || ""
                                  }
                                  onChange={(e) => {
                                    const percent =
                                      parseFloat(e.target.value) || 0;
                                    const basicSalary =
                                      employeeSalaryInfo.basicSalary || 0;
                                    const amount =
                                      (basicSalary * percent) / 100;

                                    // Recalculate fixed allowance
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const otherComponents =
                                      (employeeSalaryInfo.basicSalary || 0) +
                                      (employeeSalaryInfo.hra ||
                                        employeeSalaryInfo.houseRentAllowance ||
                                        0) +
                                      (employeeSalaryInfo.standardAllowance ||
                                        0) +
                                      amount +
                                      (employeeSalaryInfo.travelAllowance || 0);
                                    const fixedAllowance = Math.max(
                                      0,
                                      monthWage - otherComponents
                                    );
                                    const fixedAllowancePercent =
                                      monthWage > 0
                                        ? (fixedAllowance / monthWage) * 100
                                        : 0;

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      performanceBonus: amount,
                                      performanceBonusPercent: percent,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
                                    });
                                  }}
                                  className="w-24"
                                  placeholder="%"
                                  step="0.01"
                                />
                                <span className="text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            )}
                            {!isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">
                                  {formatCurrency(
                                    employeeSalaryInfo.performanceBonus || 0
                                  )}{" "}
                                  ₹/month
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {employeeSalaryInfo.performanceBonusPercent?.toFixed(
                                    2
                                  ) || "0.00"}{" "}
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
                            {isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={
                                    employeeSalaryInfo.travelAllowance || ""
                                  }
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    const basicSalary =
                                      employeeSalaryInfo.basicSalary || 0;
                                    const percent =
                                      basicSalary > 0
                                        ? (value / basicSalary) * 100
                                        : 0;

                                    // Recalculate fixed allowance
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const otherComponents =
                                      (employeeSalaryInfo.basicSalary || 0) +
                                      (employeeSalaryInfo.hra ||
                                        employeeSalaryInfo.houseRentAllowance ||
                                        0) +
                                      (employeeSalaryInfo.standardAllowance ||
                                        0) +
                                      (employeeSalaryInfo.performanceBonus ||
                                        0) +
                                      value;
                                    const fixedAllowance = Math.max(
                                      0,
                                      monthWage - otherComponents
                                    );
                                    const fixedAllowancePercent =
                                      monthWage > 0
                                        ? (fixedAllowance / monthWage) * 100
                                        : 0;

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      travelAllowance: value,
                                      ltaPercent: percent,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
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
                                  value={
                                    employeeSalaryInfo.ltaPercent?.toFixed(2) ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const percent =
                                      parseFloat(e.target.value) || 0;
                                    const basicSalary =
                                      employeeSalaryInfo.basicSalary || 0;
                                    const amount =
                                      (basicSalary * percent) / 100;

                                    // Recalculate fixed allowance
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const otherComponents =
                                      (employeeSalaryInfo.basicSalary || 0) +
                                      (employeeSalaryInfo.hra ||
                                        employeeSalaryInfo.houseRentAllowance ||
                                        0) +
                                      (employeeSalaryInfo.standardAllowance ||
                                        0) +
                                      (employeeSalaryInfo.performanceBonus ||
                                        0) +
                                      amount;
                                    const fixedAllowance = Math.max(
                                      0,
                                      monthWage - otherComponents
                                    );
                                    const fixedAllowancePercent =
                                      monthWage > 0
                                        ? (fixedAllowance / monthWage) * 100
                                        : 0;

                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      travelAllowance: amount,
                                      ltaPercent: percent,
                                      fixedAllowance: fixedAllowance,
                                      fixedAllowancePercent:
                                        fixedAllowancePercent,
                                    });
                                  }}
                                  className="w-24"
                                  placeholder="%"
                                  step="0.01"
                                />
                                <span className="text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            )}
                            {!isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">
                                  {formatCurrency(
                                    employeeSalaryInfo.travelAllowance || 0
                                  )}{" "}
                                  ₹/month
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {employeeSalaryInfo.ltaPercent?.toFixed(2) ||
                                    "0.00"}{" "}
                                  %
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Fixed Allowance */}
                          <div className="p-4 border rounded-lg space-y-3">
                            <Label className="text-base font-semibold block">
                              Fixed Allowance
                            </Label>
                            {isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={
                                    employeeSalaryInfo.fixedAllowance || ""
                                  }
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const percent =
                                      monthWage > 0
                                        ? (value / monthWage) * 100
                                        : 0;
                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
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
                                  value={
                                    employeeSalaryInfo.fixedAllowancePercent?.toFixed(
                                      2
                                    ) || ""
                                  }
                                  onChange={(e) => {
                                    const percent =
                                      parseFloat(e.target.value) || 0;
                                    const monthWage =
                                      employeeSalaryInfo.monthWage ||
                                      employeeSalaryInfo.grossSalary ||
                                      0;
                                    const amount = (monthWage * percent) / 100;
                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      fixedAllowance: amount,
                                      fixedAllowancePercent: percent,
                                    });
                                  }}
                                  className="w-24"
                                  placeholder="%"
                                  step="0.01"
                                />
                                <span className="text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            )}
                            {!isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">
                                  {formatCurrency(
                                    employeeSalaryInfo.fixedAllowance || 0
                                  )}{" "}
                                  ₹/month
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {employeeSalaryInfo.fixedAllowancePercent?.toFixed(
                                    2
                                  ) || "0.00"}{" "}
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
                                (employeeSalaryInfo.basicSalary || 0) +
                                  (employeeSalaryInfo.hra ||
                                    employeeSalaryInfo.houseRentAllowance ||
                                    0) +
                                  (employeeSalaryInfo.standardAllowance || 0) +
                                  (employeeSalaryInfo.performanceBonus || 0) +
                                  (employeeSalaryInfo.travelAllowance || 0) +
                                  (employeeSalaryInfo.fixedAllowance || 0)
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
                            {isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={
                                    employeeSalaryInfo.pf ||
                                    employeeSalaryInfo.pfEmployee ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    const basicSalary =
                                      employeeSalaryInfo.basicSalary || 0;
                                    const percent =
                                      basicSalary > 0
                                        ? (value / basicSalary) * 100
                                        : 0;
                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
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
                                  value={
                                    employeeSalaryInfo.pfPercent?.toFixed(2) ||
                                    employeeSalaryInfo.pfEmployeePercent?.toFixed(
                                      2
                                    ) ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const percent =
                                      parseFloat(e.target.value) || 0;
                                    const basicSalary =
                                      employeeSalaryInfo.basicSalary || 0;
                                    const amount =
                                      (basicSalary * percent) / 100;
                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      pf: amount,
                                      pfEmployee: amount,
                                      pfPercent: percent,
                                      pfEmployeePercent: percent,
                                    });
                                  }}
                                  className="w-24"
                                  placeholder="%"
                                  step="0.01"
                                />
                                <span className="text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            )}
                            {!isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">
                                  {formatCurrency(
                                    employeeSalaryInfo.pf ||
                                      employeeSalaryInfo.pfEmployee ||
                                      0
                                  )}{" "}
                                  ₹/month
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {employeeSalaryInfo.pfPercent?.toFixed(2) ||
                                    employeeSalaryInfo.pfEmployeePercent?.toFixed(
                                      2
                                    ) ||
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
                        <h3 className="text-lg font-semibold">
                          Tax Deductions
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Professional Tax */}
                          <div className="p-4 border rounded-lg space-y-3">
                            <Label className="text-base font-semibold block">
                              Professional Tax
                            </Label>
                            {isEditingEmployeeSalary && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={
                                    employeeSalaryInfo.professionalTax || ""
                                  }
                                  onChange={(e) =>
                                    setEmployeeSalaryInfo({
                                      ...employeeSalaryInfo,
                                      professionalTax:
                                        parseFloat(e.target.value) || 0,
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
                            {!isEditingEmployeeSalary && (
                              <div className="text-lg font-semibold">
                                {formatCurrency(
                                  employeeSalaryInfo.professionalTax || 0
                                )}{" "}
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
                        <Label className="text-base font-semibold">
                          Net Salary
                        </Label>
                        <p className="text-2xl font-bold text-primary">
                          {(() => {
                            const grossSalary =
                              (employeeSalaryInfo.basicSalary || 0) +
                              (employeeSalaryInfo.hra ||
                                employeeSalaryInfo.houseRentAllowance ||
                                0) +
                              (employeeSalaryInfo.standardAllowance || 0) +
                              (employeeSalaryInfo.performanceBonus || 0) +
                              (employeeSalaryInfo.travelAllowance || 0) +
                              (employeeSalaryInfo.fixedAllowance || 0);

                            const netSalary =
                              grossSalary <= 0
                                ? 0
                                : grossSalary -
                                  ((employeeSalaryInfo.pf ||
                                    employeeSalaryInfo.pfEmployee ||
                                    0) +
                                    (employeeSalaryInfo.professionalTax || 0));

                            return formatCurrency(Math.max(0, netSalary));
                          })()}
                        </p>
                      </div>

                      {isEditingEmployeeSalary && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditingEmployeeSalary(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Loading salary information...
                    </p>
                  )}
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
