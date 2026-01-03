import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Save, DollarSign, Pencil, X } from "lucide-react";
import { formatCurrency } from "../lib/format";
import { toast } from "sonner";
import apiClient from "../lib/api";

export default function ProfileSalaryInfoTab({
  salaryInfo,
  setSalaryInfo,
  isEditingSalary,
  setIsEditingSalary,
  isAdminOrPayroll,
  employeeData,
  fetchSalaryInfo,
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSalary = async () => {
    if (!salaryInfo || !isAdminOrPayroll) return;

    try {
      // Calculate gross and net salary
      const grossSalary =
        (salaryInfo.basicSalary || 0) +
        (salaryInfo.houseRentAllowance || 0) +
        (salaryInfo.standardAllowance || 0) +
        (salaryInfo.performanceBonus || 0) +
        (salaryInfo.travelAllowance || 0) +
        (salaryInfo.fixedAllowance || 0);

      const netSalary =
        grossSalary <= 0
          ? 0
          : grossSalary -
            (salaryInfo.pfEmployee || 0) -
            (salaryInfo.professionalTax || 0);

      const updatedSalaryInfo = {
        ...salaryInfo,
        grossSalary,
        netSalary,
      };

      // Get employee ID from employeeData
      const employeeId = employeeData?.id;
      if (!employeeId) {
        toast.error("Employee ID not found");
        return;
      }

      await apiClient.put(`/employees/${employeeId}/salary`, updatedSalaryInfo);
      toast.success("Salary information updated successfully");
      setIsEditingSalary(false);
      await fetchSalaryInfo();
    } catch (error) {
      console.error("Failed to update salary:", error);
      toast.error("Failed to update salary information");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Salary Info
            </CardTitle>
            <CardDescription>
              {isAdminOrPayroll
                ? "View and manage salary information"
                : "View your salary information (read-only)"}
            </CardDescription>
          </div>
          {isAdminOrPayroll && salaryInfo && (
            <Button
              variant={isEditingSalary ? "outline" : "default"}
              onClick={() => {
                if (isEditingSalary) {
                  handleSaveSalary();
                } else {
                  setIsEditingSalary(true);
                }
              }}
            >
              {isEditingSalary ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {salaryInfo ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveSalary();
            }}
            className="space-y-6"
          >
            {/* General Work Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                General Work Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month Wage</Label>
                  {isEditingSalary && isAdminOrPayroll ? (
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
                          (value * (salaryInfo.basicSalaryPercent || 50)) / 100;
                        const hra =
                          (basicSalary * (salaryInfo.hraPercent || 50)) / 100;
                        const standardAllowance =
                          (value *
                            (salaryInfo.standardAllowancePercent || 16.67)) /
                          100;
                        const performanceBonus =
                          (basicSalary *
                            (salaryInfo.performanceBonusPercent || 8.33)) /
                          100;
                        const travelAllowance =
                          (basicSalary * (salaryInfo.ltaPercent || 8.33)) / 100;

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
                        const pfEmployee =
                          (basicSalary * (salaryInfo.pfEmployeePercent || 12)) /
                          100;

                        setSalaryInfo({
                          ...salaryInfo,
                          monthWage: value,
                          yearlyWage: yearlyWage,
                          basicSalary: basicSalary,
                          houseRentAllowance: hra,
                          standardAllowance: standardAllowance,
                          performanceBonus: performanceBonus,
                          travelAllowance: travelAllowance,
                          fixedAllowance: fixedAllowance,
                          fixedAllowancePercent: fixedAllowancePercent,
                          pfEmployee: pfEmployee,
                        });
                      }}
                      placeholder="Monthly wage"
                    />
                  ) : (
                    <p className="text-lg font-semibold">
                      {formatCurrency(salaryInfo.monthWage || 0)} / Month
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Yearly Wage</Label>
                  {isEditingSalary && isAdminOrPayroll ? (
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
                          (value * (salaryInfo.basicSalaryPercent || 50)) / 100;
                        const hra =
                          (basicSalary * (salaryInfo.hraPercent || 50)) / 100;
                        const standardAllowance =
                          (value *
                            (salaryInfo.standardAllowancePercent || 16.67)) /
                          100;
                        const performanceBonus =
                          (basicSalary *
                            (salaryInfo.performanceBonusPercent || 8.33)) /
                          100;
                        const travelAllowance =
                          (basicSalary * (salaryInfo.ltaPercent || 8.33)) / 100;

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
                        const pfEmployee =
                          (basicSalary * (salaryInfo.pfEmployeePercent || 12)) /
                          100;

                        setSalaryInfo({
                          ...salaryInfo,
                          monthWage: value,
                          yearlyWage: yearlyValue,
                          basicSalary: basicSalary,
                          houseRentAllowance: hra,
                          standardAllowance: standardAllowance,
                          performanceBonus: performanceBonus,
                          travelAllowance: travelAllowance,
                          fixedAllowance: fixedAllowance,
                          fixedAllowancePercent: fixedAllowancePercent,
                          pfEmployee: pfEmployee,
                        });
                      }}
                      placeholder="Yearly wage"
                    />
                  ) : (
                    <p className="text-lg font-semibold">
                      {formatCurrency(salaryInfo.yearlyWage || 0)} / Yearly
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>No of working days in a week</Label>
                  {isEditingSalary && isAdminOrPayroll ? (
                    <Input
                      type="number"
                      value={salaryInfo.workingDaysPerWeek || ""}
                      onChange={(e) => {
                        setSalaryInfo({
                          ...salaryInfo,
                          workingDaysPerWeek: parseInt(e.target.value) || null,
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
                  {isEditingSalary && isAdminOrPayroll ? (
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
                  {isEditingSalary && isAdminOrPayroll && (
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
                          const monthWage = salaryInfo.monthWage || 0;
                          const percent =
                            monthWage > 0 ? (value / monthWage) * 100 : 0;

                          // Recalculate HRA, Performance Bonus, and LTA based on new basic salary
                          const hra =
                            (value * (salaryInfo.hraPercent || 50)) / 100;
                          const performanceBonus =
                            (value *
                              (salaryInfo.performanceBonusPercent || 8.33)) /
                            100;
                          const travelAllowance =
                            (value * (salaryInfo.ltaPercent || 8.33)) / 100;

                          // Recalculate PF based on new basic salary
                          const pfEmployee =
                            (value * (salaryInfo.pfEmployeePercent || 12)) /
                            100;
                          const pfEmployer =
                            (value * (salaryInfo.pfEmployerPercent || 12)) /
                            100;

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
                            houseRentAllowance: hra,
                            performanceBonus: performanceBonus,
                            travelAllowance: travelAllowance,
                            fixedAllowance: fixedAllowance,
                            fixedAllowancePercent: fixedAllowancePercent,
                            pfEmployee: pfEmployee,
                            pfEmployer: pfEmployer,
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
                        value={salaryInfo.basicSalaryPercent?.toFixed(2) || ""}
                        onChange={(e) => {
                          const percent = Math.max(
                            0,
                            Math.min(100, parseFloat(e.target.value) || 0)
                          );
                          const monthWage = salaryInfo.monthWage || 0;
                          const amount = (monthWage * percent) / 100;

                          // Recalculate HRA, Performance Bonus, and LTA based on new basic salary
                          const hra =
                            (amount * (salaryInfo.hraPercent || 50)) / 100;
                          const performanceBonus =
                            (amount *
                              (salaryInfo.performanceBonusPercent || 8.33)) /
                            100;
                          const travelAllowance =
                            (amount * (salaryInfo.ltaPercent || 8.33)) / 100;

                          // Recalculate PF based on new basic salary
                          const pfEmployee =
                            (amount * (salaryInfo.pfEmployeePercent || 12)) /
                            100;
                          const pfEmployer =
                            (amount * (salaryInfo.pfEmployerPercent || 12)) /
                            100;

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
                            houseRentAllowance: hra,
                            performanceBonus: performanceBonus,
                            travelAllowance: travelAllowance,
                            fixedAllowance: fixedAllowance,
                            fixedAllowancePercent: fixedAllowancePercent,
                            pfEmployee: pfEmployee,
                            pfEmployer: pfEmployer,
                          });
                        }}
                        className="w-24"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                  {(!isEditingSalary || !isAdminOrPayroll) && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {formatCurrency(salaryInfo.basicSalary || 0)} ₹/month
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {salaryInfo.basicSalaryPercent?.toFixed(2) || "0.00"} %
                      </span>
                    </div>
                  )}
                </div>

                {/* HRA */}
                <div className="p-4 border rounded-lg space-y-3">
                  <Label className="text-base font-semibold block">
                    House Rent Allowance (HRA)
                  </Label>
                  {isEditingSalary && isAdminOrPayroll && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={salaryInfo.houseRentAllowance || ""}
                        onChange={(e) => {
                          const value = Math.max(
                            0,
                            parseFloat(e.target.value) || 0
                          );
                          const basicSalary = salaryInfo.basicSalary || 0;
                          const percent =
                            basicSalary > 0 ? (value / basicSalary) * 100 : 0;
                          setSalaryInfo({
                            ...salaryInfo,
                            houseRentAllowance: value,
                            hraPercent: percent,
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
                          setSalaryInfo({
                            ...salaryInfo,
                            houseRentAllowance: amount,
                            hraPercent: percent,
                          });
                        }}
                        className="w-24"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                  {(!isEditingSalary || !isAdminOrPayroll) && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {formatCurrency(salaryInfo.houseRentAllowance || 0)}{" "}
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
                  {isEditingSalary && isAdminOrPayroll && (
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
                          const monthWage = salaryInfo.monthWage || 0;
                          const percent =
                            monthWage > 0 ? (value / monthWage) * 100 : 0;
                          setSalaryInfo({
                            ...salaryInfo,
                            standardAllowance: value,
                            standardAllowancePercent: percent,
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
                          salaryInfo.standardAllowancePercent?.toFixed(2) || ""
                        }
                        onChange={(e) => {
                          const percent = Math.max(
                            0,
                            Math.min(100, parseFloat(e.target.value) || 0)
                          );
                          const monthWage = salaryInfo.monthWage || 0;
                          const amount = (monthWage * percent) / 100;
                          setSalaryInfo({
                            ...salaryInfo,
                            standardAllowance: amount,
                            standardAllowancePercent: percent,
                          });
                        }}
                        className="w-24"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                  {(!isEditingSalary || !isAdminOrPayroll) && (
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
                  {isEditingSalary && isAdminOrPayroll && (
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
                            basicSalary > 0 ? (value / basicSalary) * 100 : 0;
                          setSalaryInfo({
                            ...salaryInfo,
                            performanceBonus: value,
                            performanceBonusPercent: percent,
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
                          salaryInfo.performanceBonusPercent?.toFixed(2) || ""
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
                            performanceBonus: amount,
                            performanceBonusPercent: percent,
                          });
                        }}
                        className="w-24"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                  {(!isEditingSalary || !isAdminOrPayroll) && (
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
                  {isEditingSalary && isAdminOrPayroll && (
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
                            basicSalary > 0 ? (value / basicSalary) * 100 : 0;
                          setSalaryInfo({
                            ...salaryInfo,
                            travelAllowance: value,
                            ltaPercent: percent,
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
                          setSalaryInfo({
                            ...salaryInfo,
                            travelAllowance: amount,
                            ltaPercent: percent,
                          });
                        }}
                        className="w-24"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                  {(!isEditingSalary || !isAdminOrPayroll) && (
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
                  {isEditingSalary && isAdminOrPayroll && (
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
                          const monthWage = salaryInfo.monthWage || 0;
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
                          const monthWage = salaryInfo.monthWage || 0;
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
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                  {(!isEditingSalary || !isAdminOrPayroll) && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {formatCurrency(salaryInfo.fixedAllowance || 0)} ₹/month
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {salaryInfo.fixedAllowancePercent?.toFixed(2) || "0.00"}{" "}
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
                    {formatCurrency(salaryInfo.grossSalary || 0)}
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
                  {isEditingSalary && isAdminOrPayroll && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={salaryInfo.pfEmployee || ""}
                        onChange={(e) => {
                          const value = Math.max(
                            0,
                            parseFloat(e.target.value) || 0
                          );
                          const basicSalary = salaryInfo.basicSalary || 0;
                          const percent =
                            basicSalary > 0 ? (value / basicSalary) * 100 : 0;
                          setSalaryInfo({
                            ...salaryInfo,
                            pfEmployee: value,
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
                        value={salaryInfo.pfEmployeePercent?.toFixed(2) || ""}
                        onChange={(e) => {
                          const percent = Math.max(
                            0,
                            Math.min(100, parseFloat(e.target.value) || 0)
                          );
                          const basicSalary = salaryInfo.basicSalary || 0;
                          const amount = (basicSalary * percent) / 100;
                          setSalaryInfo({
                            ...salaryInfo,
                            pfEmployee: amount,
                            pfEmployeePercent: percent,
                          });
                        }}
                        className="w-24"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                  {(!isEditingSalary || !isAdminOrPayroll) && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {formatCurrency(salaryInfo.pfEmployee || 0)} ₹/month
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {salaryInfo.pfEmployeePercent?.toFixed(2) || "0.00"} %
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
                  {isEditingSalary && isAdminOrPayroll ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={salaryInfo.professionalTax || ""}
                        onChange={(e) => {
                          setSalaryInfo({
                            ...salaryInfo,
                            professionalTax: Math.max(
                              0,
                              parseFloat(e.target.value) || 0
                            ),
                          });
                        }}
                        className="w-32"
                        placeholder="Amount"
                      />
                      <span className="text-sm text-muted-foreground">
                        ₹/month
                      </span>
                    </div>
                  ) : (
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
            <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 space-y-3">
              <Label className="text-base font-semibold block">
                Net Salary
              </Label>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(salaryInfo.netSalary || 0)}
              </p>
            </div>

            {isEditingSalary && isAdminOrPayroll && (
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingSalary(false);
                    fetchSalaryInfo();
                  }}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </form>
        ) : (
          <p className="text-muted-foreground">
            No salary information available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
