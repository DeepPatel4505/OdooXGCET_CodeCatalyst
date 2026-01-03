import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../store/auth";
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
import { motion } from "framer-motion";
import PublicNavbar from "../components/PublicNavbar";
import AnimatedShaderBackground from "../components/ui/animated-shader-background";

const loginSchema = z.object({
  loginId: z.string().min(1, "Login ID or Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    const success = await login(data.loginId, data.password);
    if (success) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      <AnimatedShaderBackground />
      <div className="relative z-10">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center relative">
          <div className="container mx-auto px-4 md:px-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              <Card className="w-full">
                <CardHeader className="space-y-1 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary overflow-hidden shadow-md">
                      <img
                        src="/logo.png"
                        alt="WorkZen Logo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  <CardTitle className="text-2xl font-bold">
                    Welcome to WorkZen
                  </CardTitle>
                  <CardDescription>
                    Sign in to your account to continue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="loginId">Login ID / Email</Label>
                      <Input
                        id="loginId"
                        type="text"
                        placeholder="e.g., OIJODO20220001 or user@example.com"
                        {...register("loginId")}
                        aria-invalid={errors.loginId ? "true" : "false"}
                        aria-describedby={
                          errors.loginId ? "loginId-error" : undefined
                        }
                      />
                      {errors.loginId && (
                        <p
                          id="loginId-error"
                          className="text-sm text-destructive"
                        >
                          {errors.loginId.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        You can login with your Employee ID (e.g., OIJODO20220001) or Email address
                      </p>
                    </div>

                    <div className="space-y-2">
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
                        <p
                          id="password-error"
                          className="text-sm text-destructive"
                        >
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      <Link
                        to="/forgot-password"
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign in"}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                      <p>
                        Don't have an account? Please contact your HR or Admin to create one.
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
