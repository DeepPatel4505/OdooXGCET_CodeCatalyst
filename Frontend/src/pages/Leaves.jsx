import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import DataTable from "../components/DataTable";
import {
  Plus,
  Check,
  X,
  Grid3x3,
  List,
  Upload,
  FileText,
  Download,
} from "lucide-react";
import apiClient from "../lib/api";
import { formatDate } from "../lib/format";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";

const leaveSchema = z
  .object({
    type: z.enum(["sick", "vacation", "unpaid"], {
      required_error: "Leave type is required",
    }),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine(
    (data) => {
      // Start date must be before or equal to end date
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return start <= end;
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      // End date must be after or equal to start date
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return end >= start;
      }
      return true;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      // For sick leave, start date must be in the past
      if (data.type === "sick") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(data.startDate);
        start.setHours(0, 0, 0, 0);
        return start <= today;
      }
      return true;
    },
    {
      message: "Sick leave dates must be in the past",
      path: ["startDate"],
    }
  );

/**
 * Leaves page component
 * Role-based views:
 * - Admin/HR/Manager: Can view all, approve/reject leave requests
 * - Employee: Can view own records and create leave requests
 */
export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"
  const [documentFile, setDocumentFile] = useState(null);
  const { user } = useAuthStore();

  const isApprover = ["admin", "hr"].includes(user?.role);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(leaveSchema),
  });

  const {
    register: registerReject,
    handleSubmit: handleSubmitReject,
    formState: { errors: rejectErrors },
    reset: resetReject,
  } = useForm({
    resolver: zodResolver(
      z.object({
        rejectionReason: z.string().optional(),
      })
    ),
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/leaves");
      setLeaves(response.data || []);
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
      toast.error("Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateDays(startDate, endDate);
      if (days > 0) {
        // Days will be calculated on the backend, but we can show it in the UI
      }
    }
  }, [startDate, endDate]);

  const onSubmit = async (data) => {
    try {
      // Calculate days
      const days = calculateDays(data.startDate, data.endDate);

      if (days <= 0) {
        toast.error("End date must be after start date");
        return;
      }

      // Validate sick leave: must be in the past
      if (data.type === "sick") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(data.startDate);
        start.setHours(0, 0, 0, 0);

        if (start > today) {
          toast.error("Sick leave dates must be in the past");
          return;
        }

        // Require document for sick leave
        if (!documentFile) {
          toast.error("Document is required for sick leave requests");
          return;
        }
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("type", data.type);
      formData.append("startDate", data.startDate);
      formData.append("endDate", data.endDate);
      formData.append("days", days);
      formData.append("reason", data.reason);

      if (documentFile && data.type === "sick") {
        formData.append("document", documentFile);
      }

      await apiClient.post("/leaves", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Leave request submitted successfully");
      setIsCreateOpen(false);
      reset();
      setDocumentFile(null);
      fetchLeaves();
    } catch (error) {
      console.error("Failed to create leave:", error);
      const message =
        error.response?.data?.message || "Failed to create leave request";
      toast.error(message);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      await apiClient.put(`/leaves/${leaveId}/approve`);
      toast.success("Leave approved successfully");
      fetchLeaves();
    } catch (error) {
      console.error("Failed to approve leave:", error);
      const message =
        error.response?.data?.message || "Failed to approve leave";
      toast.error(message);
    }
  };

  const handleRejectClick = (leaveId) => {
    setSelectedLeaveId(leaveId);
    setIsRejectOpen(true);
  };

  const onSubmitReject = async (data) => {
    try {
      await apiClient.put(`/leaves/${selectedLeaveId}/reject`, {
        rejectionReason: data.rejectionReason || undefined,
      });
      toast.success("Leave rejected successfully");
      setIsRejectOpen(false);
      resetReject();
      setSelectedLeaveId(null);
      fetchLeaves();
    } catch (error) {
      console.error("Failed to reject leave:", error);
      const message = error.response?.data?.message || "Failed to reject leave";
      toast.error(message);
    }
  };

  const leaveTypeLabels = {
    sick: "Sick Leave",
    vacation: "Casual Leave",
    unpaid: "Unpaid Leave",
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (!selectedStatus || selectedStatus === "all") return true;
    return leave.status === selectedStatus;
  });

  const columns = [
    {
      header: "Employee",
      accessor: "employeeName",
      className: "text-left",
      cellClassName: "text-left",
    },
    {
      header: "Type",
      accessor: "type",
      cell: (row) => leaveTypeLabels[row.type] || row.type,
      className: "text-left",
      cellClassName: "text-left",
    },
    {
      header: "Start Date",
      accessor: "startDate",
      cell: (row) => formatDate(row.startDate, "DD/MM/YYYY"),
      className: "text-left",
      cellClassName: "text-left",
    },
    {
      header: "End Date",
      accessor: "endDate",
      cell: (row) => formatDate(row.endDate, "DD/MM/YYYY"),
      className: "text-left",
      cellClassName: "text-left",
    },
    {
      header: "Days",
      accessor: "days",
      className: "text-center",
      cellClassName: "text-center",
    },
    {
      header: "Reason",
      accessor: "reason",
      cell: (row) => (
        <div className="max-w-xs truncate" title={row.reason}>
          {row.reason}
        </div>
      ),
      className: "text-left",
      cellClassName: "text-left",
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium w-fit ${
              row.status === "approved"
                ? "bg-green-100 text-green-800"
                : row.status === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </span>
          {row.status === "rejected" && row.rejectionReason && (
            <span
              className="text-xs text-muted-foreground max-w-xs truncate"
              title={row.rejectionReason}
            >
              Reason: {row.rejectionReason}
            </span>
          )}
          {row.status === "approved" && row.approvedAt && (
            <span className="text-xs text-muted-foreground">
              Approved: {formatDate(row.approvedAt, "DD/MM/YYYY")}
            </span>
          )}
        </div>
      ),
      className: "text-left",
      cellClassName: "text-left",
    },
    {
      header: "Document",
      accessor: "documentUrl",
      cell: (row) =>
        row.documentUrl ? (
          <a
            href={`${
              apiClient.defaults.baseURL?.replace("/api", "") ||
              "http://localhost:3000"
            }${row.documentUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm">View</span>
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
      className: "text-center",
      cellClassName: "text-center",
    },
    ...(isApprover
      ? [
          {
            header: "Actions",
            cell: (row) =>
              row.status === "pending" ? (
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApprove(row.id)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRejectClick(row.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Reject"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              ),
            className: "text-center",
            cellClassName: "text-center",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">
            {isApprover
              ? "Manage and approve leave requests"
              : "View and create leave requests"}
          </p>
        </div>
        {!isApprover && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Leave Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Leave Request</DialogTitle>
                <DialogDescription>
                  Submit a leave request for approval
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Leave Type</Label>
                  <Select
                    onValueChange={(value) => {
                      setValue("type", value, { shouldValidate: true });
                    }}
                    value={watch("type")}
                    aria-invalid={errors.type ? "true" : "false"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="vacation">Casual Leave</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-destructive">
                      {errors.type.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register("startDate")}
                      max={
                        endDate
                          ? endDate
                          : watch("type") === "sick"
                          ? new Date().toISOString().split("T")[0]
                          : undefined
                      }
                      aria-invalid={errors.startDate ? "true" : "false"}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-destructive">
                        {errors.startDate.message}
                      </p>
                    )}
                    {watch("type") === "sick" && (
                      <p className="text-xs text-muted-foreground">
                        Sick leave must be in the past
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...register("endDate")}
                      min={startDate || undefined}
                      max={
                        watch("type") === "sick"
                          ? new Date().toISOString().split("T")[0]
                          : undefined
                      }
                      aria-invalid={errors.endDate ? "true" : "false"}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-destructive">
                        {errors.endDate.message}
                      </p>
                    )}
                  </div>
                </div>
                {watch("type") === "sick" && (
                  <div className="space-y-2">
                    <Label htmlFor="document">
                      Document (Required for Sick Leave)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="document"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("File size must be less than 5MB");
                              return;
                            }
                            setDocumentFile(file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {documentFile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{documentFile.name}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload medical certificate or document (PDF, JPG, PNG, GIF
                      - Max 5MB)
                    </p>
                  </div>
                )}
                {startDate && endDate && (
                  <div className="text-sm text-muted-foreground">
                    Total days: {calculateDays(startDate, endDate)}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    {...register("reason")}
                    placeholder="Enter reason for leave"
                    rows={3}
                    aria-invalid={errors.reason ? "true" : "false"}
                  />
                  {errors.reason && (
                    <p className="text-sm text-destructive">
                      {errors.reason.message}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      reset();
                      setDocumentFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Submit Request</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* NOTE Box */}
      {/* <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Note</p>
            <p>
              {isApprover
                ? 'You can view all leave requests and approve or reject pending requests. Employees can only view their own leave requests.'
                : 'You can view your leave requests and create new ones. Your requests will be reviewed by HR or Admin.'}
            </p>
          </div>
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader>
          <CardTitle>
            {isApprover ? "All Leave Requests" : "My Leave Requests"}
          </CardTitle>
          <CardDescription>
            {isApprover
              ? "Review and manage leave requests from all employees"
              : "View your leave request history"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            {/* Filters and View Toggle */}
            <div className="flex flex-wrap gap-4 items-center">
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
              Loading leave requests...
            </div>
          ) : viewMode === "table" ? (
            <DataTable
              data={filteredLeaves}
              columns={columns}
              searchable={isApprover}
              searchPlaceholder="Search leave requests..."
              paginated
              pageSize={10}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeaves.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No leave requests found
                </div>
              ) : (
                filteredLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">
                          {leave.employeeName || "N/A"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {leaveTypeLabels[leave.type] || leave.type}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          leave.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : leave.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {leave.status.charAt(0).toUpperCase() +
                          leave.status.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Start:</span>{" "}
                        {formatDate(leave.startDate, "DD/MM/YYYY")}
                      </p>
                      <p>
                        <span className="font-medium">End:</span>{" "}
                        {formatDate(leave.endDate, "DD/MM/YYYY")}
                      </p>
                      <p>
                        <span className="font-medium">Days:</span> {leave.days}
                      </p>
                      <p
                        className="text-muted-foreground truncate"
                        title={leave.reason}
                      >
                        <span className="font-medium">Reason:</span>{" "}
                        {leave.reason}
                      </p>
                      {leave.documentUrl && (
                        <div className="mt-2">
                          <a
                            href={`${
                              apiClient.defaults.baseURL?.replace("/api", "") ||
                              "http://localhost:3000"
                            }${leave.documentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-sm"
                          >
                            <FileText className="h-4 w-4" />
                            <span>View Document</span>
                          </a>
                        </div>
                      )}
                    </div>
                    {isApprover && leave.status === "pending" && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(leave.id)}
                          className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectClick(leave.id)}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Leave Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request
              (optional)
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmitReject(onSubmitReject)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                {...registerReject("rejectionReason")}
                placeholder="Enter rejection reason (optional)"
                rows={3}
                aria-invalid={rejectErrors.rejectionReason ? "true" : "false"}
              />
              {rejectErrors.rejectionReason && (
                <p className="text-sm text-destructive">
                  {rejectErrors.rejectionReason.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRejectOpen(false);
                  resetReject();
                  setSelectedLeaveId(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Reject Leave
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
