import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Users,
  Building2,
  Clock,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
  Terminal,
  DollarSign,
  Cloud,
  HelpCircle,
  Settings,
  Heart,
} from "lucide-react";
import apiClient from "../lib/api";
import { useAuthStore } from "../store/auth";
import PublicNavbar from "../components/PublicNavbar";
import AnimatedShaderBackground from "../components/ui/animated-shader-background";
import { FeaturesSectionWithHoverEffects } from "../components/ui/feature-section-with-hover-effects";
import { RainbowButton } from "../components/ui/rainbow-button";

/**
 * Landing page component with dynamic data
 */
export default function Landing() {
  const { isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicStats();
  }, []);

  const fetchPublicStats = async () => {
    try {
      const response = await apiClient.get("/dashboard/public-stats");
      setStats(response.data?.data || response.data);
    } catch (error) {
      console.error("Failed to fetch public stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Users,
      title: "Employee Management",
      description:
        "Comprehensive employee database with detailed profiles and organizational structure.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Clock,
      title: "Attendance Tracking",
      description:
        "Real-time attendance monitoring with check-in/check-out functionality and detailed reports.",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Calendar,
      title: "Leave Management",
      description:
        "Streamlined leave request system with approval workflows and calendar integration.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: BarChart3,
      title: "Payroll Processing",
      description:
        "Automated payroll calculations with salary structures, deductions, and payslip generation.",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description:
        "Enterprise-grade security with role-based access control and data encryption.",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      icon: Zap,
      title: "Real-time Analytics",
      description:
        "Powerful dashboard with insights, trends, and comprehensive reporting capabilities.",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      <AnimatedShaderBackground />
      <div className="relative z-10">
        <PublicNavbar />
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Trusted by {stats?.totalCompanies || 0}+ Companies</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Complete HR & Payroll
              <br />
              <span className="text-primary">Management System</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your HR operations with our comprehensive platform.
              Manage employees, track attendance, process payroll, and more—all
              in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {isAuthenticated ? (
                <RainbowButton asChild>
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </RainbowButton>
              ) : (
                <>
                  <RainbowButton asChild>
                    <Link to="/login">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </RainbowButton>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="text-lg px-8"
                  >
                    <Link to="/register">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        {!loading && stats && (
          <section className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-3xl font-bold">
                    {stats.totalCompanies || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Companies
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-3xl font-bold">
                    {stats.totalEmployees || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Active Employees
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-3xl font-bold">
                    {stats.presentToday || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Present Today
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-3xl font-bold">
                    {stats.totalUsers || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total Users
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-centermb-12">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your workforce efficiently
            </p>
          </div>
          <FeaturesSectionWithHoverEffects
            features={[
              {
                title: "Built for developers",
                description:
                  "Built for engineers, developers, dreamers, thinkers and doers.",
                icon: Terminal,
              },
              {
                title: "Ease of use",
                description:
                  "It's as easy as using an Apple, and as expensive as buying one.",
                icon: Zap,
              },
              {
                title: "Pricing like no other",
                description:
                  "Our prices are best in the market. No cap, no lock, no credit card required.",
                icon: DollarSign,
              },
              {
                title: "100% Uptime guarantee",
                description: "We just cannot be taken down by anyone.",
                icon: Cloud,
              },
              {
                title: "Multi-tenant Architecture",
                description:
                  "You can simply share passwords instead of buying new seats",
                icon: Users,
              },
              {
                title: "24/7 Customer Support",
                description:
                  "We are available a 100% of the time. Atleast our AI Agents are.",
                icon: HelpCircle,
              },
              {
                title: "Money back guarantee",
                description:
                  "If you donot like EveryAI, we will convince you to like us.",
                icon: Settings,
              },
              {
                title: "And everything else",
                description:
                  "I just ran out of copy ideas. Accept my sincere apologies",
                icon: Heart,
              },
            ]}
          />
        </section>

        {/* Department Stats Section */}
        {!loading &&
          stats?.topDepartments &&
          stats.topDepartments.length > 0 && (
            <section className="container mx-auto px-4 py-20 bg-muted/50 rounded-lg">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Top Departments</h2>
                <p className="text-xl text-muted-foreground">
                  See which departments are most active
                </p>
              </div>
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                {stats.topDepartments.map((dept, index) => (
                  <Card key={index} className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold mb-1">
                        {dept.count}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dept.department}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-4xl mx-auto bg-blue-200 text-black/80">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-4">
                Ready to Get Started?
              </CardTitle>
              <CardDescription className="text-lg">
                Join thousands of companies already using our platform to
                streamline their HR operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {isAuthenticated ? (
                <RainbowButton asChild>
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </RainbowButton>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <RainbowButton asChild>
                    <Link to="/register">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </RainbowButton>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 bg-transparent hover:bg-primary-foreground/10"
                  >
                    <Link to="/login">Sign In</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
