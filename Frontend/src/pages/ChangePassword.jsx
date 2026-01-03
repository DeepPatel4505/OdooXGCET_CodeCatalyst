import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import apiClient from "../lib/api";
import { Lock } from "lucide-react";

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function ChangePassword() {
  const navigate = useNavigate();
  const [isChanging, setIsChanging] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data) => {
    setIsChanging(true);
    try {
      await apiClient.put("/profile/password", {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      toast.success("Password has been changed successfully!");
      reset();
      // Optionally navigate back to profile
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || 
        error.response?.data?.errors?.[0]?.message ||
        "Failed to change password";
      toast.error(errorMessage);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Change Password</h1>
        <p className="text-muted-foreground">
          Update your password to keep your account secure
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Enter your current password and choose a new one
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Current Password</Label>
              <Input
                id="oldPassword"
                type="password"
                placeholder="Enter current password"
                {...register("oldPassword")}
                aria-invalid={errors.oldPassword ? "true" : "false"}
              />
              {errors.oldPassword && (
                <p className="text-sm text-destructive">
                  {errors.oldPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password (min 8 characters, uppercase, lowercase, number, special char)"
                {...register("newPassword")}
                aria-invalid={errors.newPassword ? "true" : "false"}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">
                  {errors.newPassword.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters and contain uppercase, lowercase, number, and special character
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                {...register("confirmPassword")}
                aria-invalid={errors.confirmPassword ? "true" : "false"}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/profile")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isChanging}>
                {isChanging ? "Changing Password..." : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

