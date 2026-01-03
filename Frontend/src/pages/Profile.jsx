import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import apiClient from "../lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../store/auth";
import PasswordModal from "../components/PasswordModal";
import ProfileResumeTab from "../components/ProfileResumeTab";
import ProfilePrivateInfoTab from "../components/ProfilePrivateInfoTab";
import ProfileSalaryInfoTab from "../components/ProfileSalaryInfoTab";
import ProfileSecurityTab from "../components/ProfileSecurityTab";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().regex(
    /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|protonmail\.com|zoho\.com|workzen\.com)$/i,
    {
      message: "Invalid email address",
    }
  ),
  phone: z.string().optional().or(z.literal("")).refine(
    (val) => {
      if (!val || val === '') return true; // Allow empty
      // Remove all non-digit characters except +
      const cleaned = val.replace(/[^\d+]/g, '');
      // Check if it matches phone number pattern: optional +, then 10-15 digits
      return /^[\+]?[1-9][0-9]{9,14}$/.test(cleaned);
    },
    {
      message: 'Phone number must be in valid format (10-15 digits, optional + prefix)'
    }
  ),
  address: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  personalEmail: z
    .string()
    .regex(
      /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|protonmail\.com|zoho\.com|workzen\.com)$/i,
      {
        message: "Invalid email address",
      }
    )
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
  phone: z.string().min(1, "Phone is required").refine(
    (val) => {
      // Remove all non-digit characters except +
      const cleaned = val.replace(/[^\d+]/g, '');
      // Check if it matches phone number pattern: optional +, then 10-15 digits
      return /^[\+]?[1-9][0-9]{9,14}$/.test(cleaned);
    },
    {
      message: 'Phone number must be in valid format (10-15 digits, optional + prefix)'
    }
  ),
});

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("private-info");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [employeeData, setEmployeeData] = useState(null);
  const [isEditingSalary, setIsEditingSalary] = useState(false);

  const {
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
  });

  const {
    register: registerEmergency,
    reset: resetEmergency,
  } = useForm({
    resolver: zodResolver(emergencyContactSchema),
  });

  const isAdminOrPayroll = ["admin", "hr", "payroll"].includes(user?.role);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && activeTab === "salary-info") {
      fetchSalaryInfo();
    }
  }, [user, activeTab, employeeData]);

  const fetchProfileData = async () => {
    try {
      const response = await apiClient.get("/profile");
      const profileData = response.data?.data || response.data;
      setEmployeeData(profileData.employee);
      reset({
        firstName: profileData.firstName || user?.firstName || "",
        lastName: profileData.lastName || user?.lastName || "",
        email: profileData.email || user?.email || "",
        phone: profileData.phone || user?.phone || "",
        address: profileData.employee?.address || "",
        dateOfBirth: profileData.employee?.dateOfBirth
          ? profileData.employee.dateOfBirth.split("T")[0]
          : "",
        gender: profileData.employee?.gender || "",
        nationality: profileData.employee?.nationality || "",
        personalEmail: profileData.employee?.personalEmail || "",
        maritalStatus: profileData.employee?.maritalStatus || "",
        accountNumber: profileData.employee?.accountNumber || "",
        bankName: profileData.employee?.bankName || "",
        ifscCode: profileData.employee?.ifscCode || "",
        panNo: profileData.employee?.panNo || "",
        uanNo: profileData.employee?.uanNo || "",
      });
      if (profileData.emergencyContact) {
        resetEmergency(profileData.emergencyContact);
      }
      if (profileData.documents) {
        setDocuments(profileData.documents);
      }
      updateUser({
        about: profileData.about,
        whatILoveAboutMyJob: profileData.whatILoveAboutMyJob,
        interestsAndHobbies: profileData.interestsAndHobbies,
        skills: profileData.skills || [],
        certifications: profileData.certifications || [],
      });
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      reset({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: user?.phone || "",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryInfo = async () => {
    try {
      const response = await apiClient.get("/profile/salary");
      const salaryData = response.data?.data || response.data;
      setSalaryInfo(salaryData);
    } catch (error) {
      console.error("Failed to fetch salary info:", error);
      setSalaryInfo(null);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your profile information</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>My Name</Label>
                <Input
                  value={
                    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                    "-"
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Login ID</Label>
                <Input
                  value={user?.employeeId || user?.email || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={user?.email || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input
                  value={user?.phone || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={user?.company?.name || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={user?.department || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Manager</Label>
                <Input
                  value={"-"} // TODO: Add manager field
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={employeeData?.address || "-"}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="private-info">Private Info</TabsTrigger>
          <TabsTrigger value="salary-info">Salary Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="resume" className="space-y-4">
          <ProfileResumeTab />
        </TabsContent>

        <TabsContent value="private-info" className="space-y-4">
          <ProfilePrivateInfoTab
            employeeData={employeeData}
            documents={documents}
            setDocuments={setDocuments}
            resetForm={reset}
            resetEmergencyForm={resetEmergency}
          />
        </TabsContent>

        <TabsContent value="salary-info" className="space-y-4">
          <ProfileSalaryInfoTab
            salaryInfo={salaryInfo}
            setSalaryInfo={setSalaryInfo}
            isEditingSalary={isEditingSalary}
            setIsEditingSalary={setIsEditingSalary}
            isAdminOrPayroll={isAdminOrPayroll}
            employeeData={employeeData}
            fetchSalaryInfo={fetchSalaryInfo}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <ProfileSecurityTab
            setIsPasswordModalOpen={setIsPasswordModalOpen}
          />
        </TabsContent>
      </Tabs>

      {/* Password Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
