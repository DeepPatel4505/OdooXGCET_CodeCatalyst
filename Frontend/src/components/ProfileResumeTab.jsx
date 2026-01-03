import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Upload, X, Plus, Check } from "lucide-react";
import apiClient from "../lib/api";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";

export default function ProfileResumeTab() {
  const { user, updateUser } = useAuthStore();
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isAddingCertification, setIsAddingCertification] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newCertification, setNewCertification] = useState("");

  const handleAddSkill = async (skill) => {
    if (!skill || !skill.trim()) {
      toast.error("Please enter a skill");
      return;
    }

    // Check if skill already exists
    const currentSkills = user?.skills || [];
    if (currentSkills.some((s) => s.toLowerCase() === skill.trim().toLowerCase())) {
      toast.error("This skill already exists");
      return;
    }

    try {
      const updatedSkills = [...currentSkills, skill.trim()];
      const response = await apiClient.put("/profile", {
        skills: updatedSkills,
      });
      updateUser(response.data);
      toast.success("Skill added successfully");
      setNewSkill("");
      setIsAddingSkill(false);
    } catch (error) {
      console.error("Failed to add skill:", error);
      toast.error("Failed to add skill");
    }
  };

  const handleSkillKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddSkill(newSkill);
    } else if (e.key === "Escape") {
      setIsAddingSkill(false);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = async (index) => {
    try {
      const currentSkills = user?.skills || [];
      const updatedSkills = currentSkills.filter((_, i) => i !== index);
      const response = await apiClient.put("/profile", {
        skills: updatedSkills,
      });
      updateUser(response.data);
      toast.success("Skill removed successfully");
    } catch (error) {
      console.error("Failed to remove skill:", error);
      toast.error("Failed to remove skill");
    }
  };

  const handleAddCertification = async (cert) => {
    if (!cert || !cert.trim()) {
      toast.error("Please enter a certification");
      return;
    }

    // Check if certification already exists
    const currentCerts = user?.certifications || [];
    if (currentCerts.some((c) => c.toLowerCase() === cert.trim().toLowerCase())) {
      toast.error("This certification already exists");
      return;
    }

    try {
      const updatedCerts = [...currentCerts, cert.trim()];
      const response = await apiClient.put("/profile", {
        certifications: updatedCerts,
      });
      updateUser(response.data);
      toast.success("Certification added successfully");
      setNewCertification("");
      setIsAddingCertification(false);
    } catch (error) {
      console.error("Failed to add certification:", error);
      toast.error("Failed to add certification");
    }
  };

  const handleCertificationKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddCertification(newCertification);
    } else if (e.key === "Escape") {
      setIsAddingCertification(false);
      setNewCertification("");
    }
  };

  const handleRemoveCertification = async (index) => {
    try {
      const currentCerts = user?.certifications || [];
      const updatedCerts = currentCerts.filter((_, i) => i !== index);
      const response = await apiClient.put("/profile", {
        certifications: updatedCerts,
      });
      updateUser(response.data);
      toast.success("Certification removed successfully");
    } catch (error) {
      console.error("Failed to remove certification:", error);
      toast.error("Failed to remove certification");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column - About Sections */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[120px] p-3 border rounded-md resize-none"
              placeholder="Tell us about yourself..."
              value={user?.about || ""}
              onChange={async (e) => {
                try {
                  const response = await apiClient.put("/profile", {
                    about: e.target.value,
                  });
                  updateUser(response.data);
                } catch (error) {
                  console.error("Failed to update about:", error);
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What I love about my job</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[120px] p-3 border rounded-md resize-none"
              placeholder="What do you love about your job?"
              value={user?.whatILoveAboutMyJob || ""}
              onChange={async (e) => {
                try {
                  const response = await apiClient.put("/profile", {
                    whatILoveAboutMyJob: e.target.value,
                  });
                  updateUser(response.data);
                } catch (error) {
                  console.error("Failed to update:", error);
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My interests and hobbies</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[120px] p-3 border rounded-md resize-none"
              placeholder="Share your interests and hobbies..."
              value={user?.interestsAndHobbies || ""}
              onChange={async (e) => {
                try {
                  const response = await apiClient.put("/profile", {
                    interestsAndHobbies: e.target.value,
                  });
                  updateUser(response.data);
                } catch (error) {
                  console.error("Failed to update:", error);
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Skills and Certifications */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isAddingSkill ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsAddingSkill(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Skill
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter skill name..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleSkillKeyPress}
                  autoFocus
                  className="flex-1 focus-visible:ring-0"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => handleAddSkill(newSkill)}
                  disabled={!newSkill.trim()}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setIsAddingSkill(false);
                    setNewSkill("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {(user?.skills || []).map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">{skill}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSkill(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!user?.skills || user.skills.length === 0) && !isAddingSkill && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No skills added yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isAddingCertification ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsAddingCertification(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Certification
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter certification name..."
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  onKeyDown={handleCertificationKeyPress}
                  autoFocus
                  className="flex-1 focus-visible:ring-0"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => handleAddCertification(newCertification)}
                  disabled={!newCertification.trim()}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setIsAddingCertification(false);
                    setNewCertification("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {(user?.certifications || []).map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">{cert}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCertification(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!user?.certifications || user.certifications.length === 0) && !isAddingCertification && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No certifications added yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

