import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Building2, Upload, X } from "lucide-react";
import apiClient from "../lib/api";
import { toast } from "sonner";
import AnimatedShaderBackground from "../components/ui/animated-shader-background";
import PublicNavbar from "../components/PublicNavbar";

const registerSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Company name must be at least 2 characters"),
    name: z.string().min(1, "Name is required"),
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
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * Register page component
 */
export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const handleLogoChange = (e) => {
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
      setCompanyLogo(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setCompanyLogo(null);
    setLogoPreview(null);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Prepare payload - convert empty phone to undefined
      const payload = {
        companyName: data.companyName,
        name: data.name,
        email: data.email,
        password: data.password,
      };
      
      // Only include phone if it has a value
      if (data.phone && data.phone.trim() !== "") {
        payload.phone = data.phone;
      }

      // Convert logo to base64 if present
      if (companyLogo) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          payload.companyLogo = reader.result;
          try {
            const response = await apiClient.post("/auth/register", payload);
            toast.success("Registration successful! Please login.");
            navigate("/login");
          } catch (error) {
            console.error("Registration failed:", error);
            console.error("Error response:", error.response?.data);
            
            let message = "Registration failed. Please try again.";
            
            if (error.response?.data) {
              const errorData = error.response.data;
              
              if (errorData.errors && Array.isArray(errorData.errors)) {
                const firstError = errorData.errors[0];
                if (firstError) {
                  message = `${firstError.path?.join(".") || "Field"}: ${firstError.message || errorData.message}`;
                } else {
                  message = errorData.message || message;
                }
              } else {
                message = errorData.message || message;
              }
            }
            
            toast.error(message);
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(companyLogo);
        return; // Exit early, will continue in reader.onloadend
      }

      const response = await apiClient.post("/auth/register", payload);
      toast.success("Registration successful! Please login.");
      navigate("/login");
    } catch (error) {
      console.error("Registration failed:", error);
      console.error("Error response:", error.response?.data);
      
      // Get detailed error message
      let message = "Registration failed. Please try again.";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Check for validation errors array
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const firstError = errorData.errors[0];
          if (firstError) {
            message = `${firstError.path?.join(".") || "Field"}: ${firstError.message || errorData.message}`;
          } else {
            message = errorData.message || message;
          }
        } else {
          message = errorData.message || message;
        }
      }
      
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      <AnimatedShaderBackground />
      <div className="relative z-10">
        <PublicNavbar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-3xl relative z-20 bg-white dark:bg-gray-900 shadow-xl border-2">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="flex justify-center mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Register</CardTitle>
            <CardDescription>Create a new account to get started</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g., Odoo India"
                  {...register("companyName")}
                  aria-invalid={errors.companyName ? "true" : "false"}
                  aria-describedby={
                    errors.companyName ? "companyName-error" : undefined
                  }
                />
                {errors.companyName && (
                  <p id="companyName-error" className="text-sm text-destructive">
                    {errors.companyName.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Login ID will be auto-generated using company name
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  {...register("name")}
                  aria-invalid={errors.name ? "true" : "false"}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="companyLogo">Company Logo (Optional)</Label>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Company logo preview"
                      className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                      onClick={removeLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16 w-16 rounded-lg border-2 border-dashed border-gray-300">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    id="companyLogo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("companyLogo")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: Square image, max 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  {...register("phone")}
                  aria-invalid={errors.phone ? "true" : "false"}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, number,
                  and special character
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={
                    errors.confirmPassword ? "confirmPassword-error" : undefined
                  }
                />
                {errors.confirmPassword && (
                  <p
                    id="confirmPassword-error"
                    className="text-sm text-destructive"
                  >
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registering..." : "Register"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{" "}
              </span>
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
