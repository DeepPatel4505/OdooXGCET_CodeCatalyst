import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import payslipRoutes from "./routes/payslip.routes.js";
import salaryStructureRoutes from "./routes/salaryStructure.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import passwordResetRoutes from "./routes/passwordReset.routes.js";
import reportRoutes from "./routes/report.routes.js";

import adminRoutes from "./routes/admin.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import cron from "node-cron";
import { autoCheckoutIncompleteAttendance } from "./utils/attendance.utils.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/payslips", payslipRoutes);
app.use("/api/salary-structures", salaryStructureRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        message: "Route not found",
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);

    // Schedule auto-checkout task to run daily at 6:30 PM
    // Cron format: minute hour day month dayOfWeek
    // '30 18 * * *' means: 30th minute, 18th hour (6:30 PM), every day
    cron.schedule(
        "30 18 * * *",
        async () => {
            console.log(
                `[Scheduled Task] Running auto-checkout at ${new Date().toISOString()}`
            );
            try {
                const result = await autoCheckoutIncompleteAttendance();
                console.log(
                    `[Scheduled Task] Auto-checkout completed: ${result.updated} records updated`
                );
            } catch (error) {
                console.error(`[Scheduled Task] Auto-checkout failed:`, error);
            }
        },
        {
            scheduled: true,
            timezone: "Asia/Kolkata", // Adjust timezone as needed
        }
    );

    console.log(`⏰ Auto-checkout scheduled to run daily at 6:30 PM`);
});
