import axios from "axios";
import { toast } from "sonner";
import { mockApi } from "../mocks";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// Log mock mode status in development
if (import.meta.env.DEV) {
  console.log(
    "🔧 API Mode:",
    USE_MOCK ? "MOCK (using mock API)" : "REAL (connecting to backend)"
  );
  if (USE_MOCK) {
    console.log("📝 Mock mode enabled. All API calls will use mock responses.");
  }
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to extract endpoint from URL
const getEndpoint = (url) => {
  if (!url) return "";
  // Remove baseURL if present
  let endpoint = url.replace(API_BASE_URL, "");
  // Remove /api prefix if present
  endpoint = endpoint.replace(/^\/api/, "");

  if (!endpoint.startsWith("/")) {
    endpoint = "/" + endpoint;
  }
  return endpoint;
};

// Mock API wrapper
const createMockResponse = (data, status = 200) => {
  return Promise.resolve({
    data,
    status,
    statusText: "OK",
    headers: {},
    config: {},
  });
};

const createMockError = (message, status = 400) => {
  return Promise.reject({
    response: {
      status,
      data: { message },
    },
    message,
  });
};

// Override axios methods when using mocks
if (USE_MOCK) {
  // Store original methods
  const originalGet = apiClient.get.bind(apiClient);
  const originalPost = apiClient.post.bind(apiClient);
  const originalPut = apiClient.put.bind(apiClient);

  // Override GET
  apiClient.get = async (url, config) => {
    const endpoint = getEndpoint(url);

    try {
      if (endpoint === "/auth/me") {
        return createMockResponse(await mockApi.getMe());
      } else if (endpoint === "/dashboard/stats") {
        return createMockResponse(await mockApi.getDashboardStats());
      } else if (endpoint === "/employees") {
        return createMockResponse(await mockApi.getEmployees());
      } else if (endpoint === "/employees/export") {
        // For export, return CSV blob
        const csv =
          "Employee ID,First Name,Last Name,Email,Phone,Department,Position,Status,Hire Date,Salary\n";
        const employees = await mockApi.getEmployees();
        const csvRows = employees
          .map(
            (emp) =>
              `${emp.employeeId},${emp.firstName},${emp.lastName},${
                emp.email
              },${emp.phone || ""},${emp.department},${emp.position},${
                emp.status
              },${emp.hireDate},${emp.salary}`
          )
          .join("\n");
        const blob = new Blob([csv + csvRows], { type: "text/csv" });
        return createMockResponse(blob);
      } else if (endpoint === "/attendance") {
        return createMockResponse(await mockApi.getAttendance());
      } else if (endpoint === "/attendance/today") {
        return createMockResponse(await mockApi.getTodayAttendance());
      } else if (endpoint === "/leaves") {
        return createMockResponse(await mockApi.getLeaves());
      } else if (endpoint === "/payroll/payruns") {
        return createMockResponse(await mockApi.getPayruns());
      } else if (
        endpoint.includes("/payroll/payruns/") &&
        endpoint.endsWith("/preview")
      ) {
        const payrunId = endpoint.split("/")[3];
        return createMockResponse(await mockApi.getPayrunPreview(payrunId));
      } else if (endpoint === "/payslips") {
        return createMockResponse(await mockApi.getPayslips());
      } else if (endpoint.includes("/payslips/")) {
        const parts = endpoint.split("/");
        if (endpoint.endsWith("/download") && parts.length >= 4) {
          const payslipId = parts[parts.length - 2];
          const blob = await mockApi.downloadPayslip(payslipId);
          return createMockResponse(blob);
        } else if (parts.length >= 3) {
          const payslipId = parts[parts.length - 1];
          return createMockResponse(await mockApi.getPayslip(payslipId));
        }
      } else if (endpoint === "/settings") {
        return createMockResponse(await mockApi.getSettings());
      }

      // Fallback to original for unmocked endpoints
      return originalGet(url, config);
    } catch (error) {
      return createMockError(error.message || "An error occurred");
    }
  };

  // Override POST
  apiClient.post = async (url, data, config) => {
    const endpoint = getEndpoint(url);

    try {
      if (endpoint === "/auth/login") {
        const result = await mockApi.login(data.email, data.password);
        if (result.accessToken) {
          localStorage.setItem("accessToken", result.accessToken);
          if (result.refreshToken) {
            localStorage.setItem("refreshToken", result.refreshToken);
          }
        }
        return createMockResponse(result);
      } else if (endpoint === "/auth/logout") {
        return createMockResponse(await mockApi.logout());
      } else if (endpoint === "/auth/refresh") {
        const result = await mockApi.refreshToken(data.refreshToken);
        if (result.accessToken) {
          localStorage.setItem("accessToken", result.accessToken);
        }
        return createMockResponse(result);
      } else if (endpoint === "/employees") {
        return createMockResponse(await mockApi.createEmployee(data));
      } else if (endpoint === "/employees/import") {
        // Mock import - return success response
        return createMockResponse({ count: 1, message: "Import successful" });
      } else if (endpoint === "/attendance/check-in") {
        return createMockResponse(await mockApi.checkIn());
      } else if (endpoint === "/attendance/check-out") {
        return createMockResponse(await mockApi.checkOut());
      } else if (endpoint === "/leaves") {
        return createMockResponse(await mockApi.createLeave(data));
      } else if (endpoint === "/payroll/payruns") {
        return createMockResponse(await mockApi.createPayrun(data));
      } else if (
        endpoint.includes("/payroll/payruns/") &&
        endpoint.endsWith("/process")
      ) {
        const payrunId = endpoint.split("/")[3];
        return createMockResponse(await mockApi.processPayrun(payrunId));
      }

      // Fallback to original for unmocked endpoints
      return originalPost(url, data, config);
    } catch (error) {
      return createMockError(error.message || "An error occurred");
    }
  };

  // Override PUT
  apiClient.put = async (url, data, config) => {
    const endpoint = getEndpoint(url);

    try {
      if (endpoint === "/settings") {
        return createMockResponse(await mockApi.updateSettings(data));
      } else if (endpoint === "/profile") {
        return createMockResponse(await mockApi.updateProfile(data));
      } else if (endpoint.includes("/leaves/")) {
        const parts = endpoint.split("/");
        if (endpoint.endsWith("/approve")) {
          const leaveId = parts[parts.length - 2];
          return createMockResponse(await mockApi.approveLeave(leaveId));
        } else if (endpoint.endsWith("/reject")) {
          const leaveId = parts[parts.length - 2];
          return createMockResponse(await mockApi.rejectLeave(leaveId));
        }
      }

      // Fallback to original for unmocked endpoints
      return originalPut(url, data, config);
    } catch (error) {
      return createMockError(error.message || "An error occurred");
    }
  };
}

// Request interceptor - Add JWT token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh, extract data from backend response
apiClient.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === "object" &&
      "status" in response.data &&
      "data" in response.data
    ) {
      if (response.config?.responseType === "blob") { //like CSV export
        return response;
      }
      return {
        ...response,
        data: response.data.data,
      };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = USE_MOCK
            ? await mockApi.refreshToken(refreshToken)
            : await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              });

          const { accessToken } = response.data || response;
          localStorage.setItem("accessToken", accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      if (error.response.status === 404) {
        return Promise.reject(error);
      }
      
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        "An error occurred";
      toast.error(message);
    } else if (error.request && !USE_MOCK) {
      toast.error("Network error. Please check your connection.");
    } else if (!USE_MOCK) {
      toast.error("An unexpected error occurred.");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
