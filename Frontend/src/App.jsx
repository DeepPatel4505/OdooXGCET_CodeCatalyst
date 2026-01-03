import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuthStore } from "./store/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserSettings from "./pages/UserSettings";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import AdminSettings from "./pages/AdminSettings";
import SalaryManagement from "./pages/SalaryManagement";
import NotFound from "./pages/NotFound";

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" richColors />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Register />
            )
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route
            path="employees"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "employee"]}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="attendance"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "hr", "employee"]}
              >
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="leaves"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "hr", "employee"]}
              >
                <Leaves />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="user-settings" element={<UserSettings />} />
          <Route path="admin-settings" element={<AdminSettings />} />
          <Route
            path="salary-management"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <SalaryManagement />
              </ProtectedRoute>
            }
          />
          <Route path="profile" element={<Profile />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
