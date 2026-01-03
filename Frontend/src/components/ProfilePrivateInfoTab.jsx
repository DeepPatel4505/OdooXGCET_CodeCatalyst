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
import { Save, User, Upload, Eye, Pencil } from "lucide-react";
import apiClient from "../lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";
import { formatDate } from "../lib/format";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
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
        return /^[\+]?[1-9][0-9]{9,14}$/.test(cleaned);
      },
      {
        message:
          "Phone number must be in valid format (10-15 digits, optional + prefix)",
      }
    ),
  address: z.string().optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val || val === "") return true; // Allow empty
        const dob = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if DOB is in the future
        if (dob > today) {
          return false;
        }

        // Check if age is at least 18 years
        const age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        const dayDiff = today.getDate() - dob.getDate();

        const actualAge =
          monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

        return actualAge >= 18;
      },
      {
        message:
          "Date of birth must not be in the future and employee must be at least 18 years old",
      }
    ),
  gender: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  personalEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal(""))
    .or(z.undefined()),
  maritalStatus: z.string().optional().or(z.literal("")),
  accountNumber: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  ifscCode: z.string().optional().or(z.literal("")),
  panNo: z.string().optional().or(z.literal("")),
  uanNo: z.string().optional().or(z.literal("")),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .refine(
      (val) => {
        // Remove all non-digit characters except +
        const cleaned = val.replace(/[^\d+]/g, "");
        // Check if it matches phone number pattern: optional +, then 10-15 digits
        return /^[\+]?[1-9][0-9]{9,14}$/.test(cleaned);
      },
      {
        message:
          "Phone number must be in valid format (10-15 digits, optional + prefix)",
      }
    ),
});

export default function ProfilePrivateInfoTab({
  employeeData,
  documents,
  setDocuments,
  resetForm,
  resetEmergencyForm,
}) {
  const { user, updateUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: employeeData?.address || "",
      dateOfBirth: employeeData?.dateOfBirth
        ? employeeData.dateOfBirth.split("T")[0]
        : "",
      gender: employeeData?.gender || "",
      nationality: employeeData?.nationality || "",
      personalEmail: employeeData?.personalEmail || "",
      maritalStatus: employeeData?.maritalStatus || "",
      accountNumber: employeeData?.accountNumber || "",
      bankName: employeeData?.bankName || "",
      ifscCode: employeeData?.ifscCode || "",
      panNo: employeeData?.panNo || "",
      uanNo: employeeData?.uanNo || "",
    },
  });

  const {
    register: registerEmergency,
    handleSubmit: handleSubmitEmergency,
    formState: { errors: emergencyErrors },
  } = useForm({
    resolver: zodResolver(emergencyContactSchema),
  });

  const onSubmit = async (data) => {
    try {
      const employeeDataPayload = {
        dateOfBirth:
          data.dateOfBirth && data.dateOfBirth.trim() ? data.dateOfBirth : null,
        address: data.address && data.address.trim() ? data.address : null,
        nationality:
          data.nationality && data.nationality.trim() ? data.nationality : null,
        personalEmail:
          data.personalEmail && data.personalEmail.trim()
            ? data.personalEmail
            : null,
        gender: data.gender && data.gender.trim() ? data.gender : null,
        maritalStatus:
          data.maritalStatus && data.maritalStatus.trim()
            ? data.maritalStatus
            : null,
        accountNumber:
          data.accountNumber && data.accountNumber.trim()
            ? data.accountNumber
            : null,
        bankName: data.bankName && data.bankName.trim() ? data.bankName : null,
        ifscCode: data.ifscCode && data.ifscCode.trim() ? data.ifscCode : null,
        panNo: data.panNo && data.panNo.trim() ? data.panNo : null,
        uanNo: data.uanNo && data.uanNo.trim() ? data.uanNo : null,
      };

      const response = await apiClient.put("/profile", {
        ...data,
        employeeData: employeeDataPayload,
      });
      updateUser(response.data);
      toast.success("Profile updated successfully");
      if (resetForm) resetForm();
    } catch (error) {
      console.error("Failed to update profile:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.error ||
        "Failed to update profile. Please check all fields.";
      toast.error(errorMessage);
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

  const onEmergencySubmit = async (data) => {
    try {
      await apiClient.put("/profile/emergency-contact", data);
      toast.success("Emergency contact updated successfully");
      if (resetEmergencyForm) resetEmergencyForm();
    } catch (error) {
      console.error("Failed to update emergency contact:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.error ||
        "Failed to update emergency contact. Please check all fields.";
      toast.error(errorMessage);
    }
  };

  const onEmergencyError = (errors) => {
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

  const handleDocumentUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post("/profile/documents", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setDocuments([...documents, response.data]);
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Failed to upload document:", error);
      toast.error("Failed to upload document");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={() =>
                  document.getElementById("avatar-upload")?.click()
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Validate file type
                    if (!file.type.startsWith("image/")) {
                      toast.error("Please select an image file");
                      return;
                    }
                    // Validate file size (max 2MB)
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error("Image size should be less than 2MB");
                      return;
                    }
                    // Convert to base64
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      try {
                        const response = await apiClient.put("/profile", {
                          avatar: reader.result,
                        });
                        updateUser(response.data);
                        toast.success("Profile picture updated successfully");
                      } catch (error) {
                        console.error(
                          "Failed to update profile picture:",
                          error
                        );
                        toast.error("Failed to update profile picture");
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {user?.employeeId && (
                <p className="text-xs text-muted-foreground">
                  ID: {user.employeeId}
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit, onError)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={user?.employeeId || user?.id || ""}
                  disabled
                  className="bg-muted"
                />
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
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
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
                  aria-invalid={errors.lastName ? "true" : "false"}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  aria-invalid={errors.phone ? "true" : "false"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  max={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 18)
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                  {...register("dateOfBirth")}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-destructive">
                    {errors.dateOfBirth.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  {...register("gender")}
                  placeholder="Male/Female/Other"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  {...register("nationality")}
                  placeholder="Enter your nationality"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personalEmail">Personal Email</Label>
                <Input
                  id="personalEmail"
                  type="email"
                  {...register("personalEmail")}
                  placeholder="Enter your personal email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Input
                  id="maritalStatus"
                  {...register("maritalStatus")}
                  placeholder="Single/Married/Divorced"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={user?.department || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={user?.position || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfJoining">Date of Joining</Label>
                <Input
                  id="dateOfJoining"
                  value={
                    employeeData?.hireDate
                      ? formatDate(employeeData.hireDate)
                      : ""
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Residing Address</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="Enter your residing address"
              />
            </div>

            {/* Bank Details Section */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    {...register("accountNumber")}
                    placeholder="Enter account number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    {...register("bankName")}
                    placeholder="Enter bank name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    {...register("ifscCode")}
                    placeholder="Enter IFSC code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNo">PAN No</Label>
                  <Input
                    id="panNo"
                    {...register("panNo")}
                    placeholder="Enter PAN number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uanNo">UAN NO</Label>
                  <Input
                    id="uanNo"
                    {...register("uanNo")}
                    placeholder="Enter UAN number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empCode">Emp Code</Label>
                  <Input
                    id="empCode"
                    value={user?.employeeId || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Documents Section */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Upload and manage your documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                document.getElementById("document-upload")?.click()
              }
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
            <input
              id="document-upload"
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleDocumentUpload(file);
              }}
            />
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              View Documents
            </Button>
          </div>
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card> */}

      {/* Emergency Contact Section */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
          <CardDescription>
            Update your emergency contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmitEmergency(onEmergencySubmit, onEmergencyError)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Name</Label>
                <Input
                  id="emergencyName"
                  {...registerEmergency("name")}
                  aria-invalid={emergencyErrors.name ? "true" : "false"}
                />
                {emergencyErrors.name && (
                  <p className="text-sm text-destructive">
                    {emergencyErrors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input
                  id="emergencyRelationship"
                  {...registerEmergency("relationship")}
                  placeholder="e.g., Spouse, Parent"
                  aria-invalid={
                    emergencyErrors.relationship ? "true" : "false"
                  }
                />
                {emergencyErrors.relationship && (
                  <p className="text-sm text-destructive">
                    {emergencyErrors.relationship.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  {...registerEmergency("phone")}
                  aria-invalid={emergencyErrors.phone ? "true" : "false"}
                />
                {emergencyErrors.phone && (
                  <p className="text-sm text-destructive">
                    {emergencyErrors.phone.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save Emergency Contact
            </Button>
          </form>
        </CardContent>
      </Card> */}
    </div>
  );
}
