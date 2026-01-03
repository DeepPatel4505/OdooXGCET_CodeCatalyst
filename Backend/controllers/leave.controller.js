import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getLeaves = async (req, res, next) => {
  try {
    const { status, employeeId } = req.query;
    const user = req.user;

    const where = {};

    if (user.role === "employee") {
      where.userId = user.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    } else if (
      user.role === "admin" ||
      user.role === "hr" ||
      user.role === "payroll"
    ) {
      if (user.companyId) {
        const companyEmployees = await prisma.employee.findMany({
          where: { companyId: user.companyId },
          select: { id: true },
        });
        const companyEmployeeIds = companyEmployees.map((e) => e.id);
        if (companyEmployeeIds.length > 0) {
          where.employeeId = { in: companyEmployeeIds };
        } else {
          where.employeeId = { in: [] };
        }
      }
    }

    if (status) {
      where.status = status;
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedLeaves = leaves.map((leave) => ({
      id: leave.id,
      employeeId: leave.employeeId,
      employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`,
      employee: {
        id: leave.employee.id,
        employeeId: leave.employee.employeeId,
        firstName: leave.employee.firstName,
        lastName: leave.employee.lastName,
      },
      userId: leave.userId,
      type: leave.type,
      startDate: leave.startDate.toISOString().split("T")[0],
      endDate: leave.endDate.toISOString().split("T")[0],
      days: leave.days,
      reason: leave.reason,
      documentUrl: leave.documentUrl || null,
      status: leave.status,
      approvedBy: leave.approvedById,
      approvedAt: leave.approvedAt?.toISOString() || null,
      rejectionReason: leave.rejectionReason,
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    }));

    res.json({
      status: "success",
      data: formattedLeaves,
    });
  } catch (error) {
    next(error);
  }
};

export const createLeave = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    let { days } = req.body;
    days = parseInt(days);
    const user = req.user;

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee record not found",
        error: "Not Found",
      });
    }

    // Validate sick leave: must be in the past
    if (type === "sick") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      if (start > today) {
        return res.status(400).json({
          status: "error",
          message: "Sick leave dates must be in the past",
          error: "Validation Error",
        });
      }
    }

    // Check for overlapping leave requests
    const start = new Date(startDate);
    const end = new Date(endDate);

    const overlappingLeaves = await prisma.leave.findMany({
      where: {
        employeeId: employee.id,
        status: {
          in: ["pending", "approved"],
        },
        OR: [
          {
            AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
          },
        ],
      },
    });

    if (overlappingLeaves.length > 0) {
      return res.status(400).json({
        status: "error",
        message:
          "You already have a leave request for these dates. Please check your existing leave requests.",
        error: "Validation Error",
      });
    }

    // Handle document upload for sick leave
    let documentUrl = null;
    if (req.file && type === "sick") {
      documentUrl = `/uploads/leaves/${req.file.filename}`;
    }

    // Require document for sick leave
    if (type === "sick" && !documentUrl) {
      return res.status(400).json({
        status: "error",
        message: "Document is required for sick leave requests",
        error: "Validation Error",
      });
    }

    const leaveData = {
      employeeId: employee.id,
      userId: user.id,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days: parseInt(days),
      reason,
      status: "pending",
    };

    // Only include documentUrl if it has a value
    if (documentUrl) {
      leaveData.documentUrl = documentUrl;
    }

    const leave = await prisma.leave.create({
      data: leaveData,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({
      status: "success",
      data: {
        id: leave.id,
        employeeId: leave.employeeId,
        employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`,
        type: leave.type,
        startDate: leave.startDate.toISOString().split("T")[0],
        endDate: leave.endDate.toISOString().split("T")[0],
        days: leave.days,
        reason: leave.reason,
        documentUrl: leave.documentUrl || null,
        status: leave.status,
        approvedBy: leave.approvedById,
        approvedAt: leave.approvedAt?.toISOString() || null,
        rejectionReason: leave.rejectionReason,
        createdAt: leave.createdAt.toISOString(),
        updatedAt: leave.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const approveLeave = async (req, res, next) => {
  try {
    const { leaveId } = req.params;
    const user = req.user;

    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      return res.status(404).json({
        status: "error",
        message: "Leave request not found",
        error: "Not Found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        status: "error",
        message: "Leave request is not pending",
        error: "Validation Error",
      });
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      status: "success",
      data: {
        id: updated.id,
        employeeId: updated.employeeId,
        employeeName: `${updated.employee.firstName} ${updated.employee.lastName}`,
        type: updated.type,
        startDate: updated.startDate.toISOString().split("T")[0],
        endDate: updated.endDate.toISOString().split("T")[0],
        days: updated.days,
        reason: updated.reason,
        documentUrl: updated.documentUrl || null,
        status: updated.status,
        approvedBy: updated.approvedById,
        approvedAt: updated.approvedAt?.toISOString() || null,
        rejectionReason: updated.rejectionReason,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectLeave = async (req, res, next) => {
  try {
    const { leaveId } = req.params;
    const { rejectionReason } = req.body;
    const user = req.user;

    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      return res.status(404).json({
        status: "error",
        message: "Leave request not found",
        error: "Not Found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        status: "error",
        message: "Leave request is not pending",
        error: "Validation Error",
      });
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: "rejected",
        rejectionReason: rejectionReason || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      status: "success",
      data: {
        id: updated.id,
        employeeId: updated.employeeId,
        employeeName: `${updated.employee.firstName} ${updated.employee.lastName}`,
        type: updated.type,
        startDate: updated.startDate.toISOString().split("T")[0],
        endDate: updated.endDate.toISOString().split("T")[0],
        days: updated.days,
        reason: updated.reason,
        documentUrl: updated.documentUrl || null,
        status: updated.status,
        approvedBy: updated.approvedById,
        approvedAt: updated.approvedAt?.toISOString() || null,
        rejectionReason: updated.rejectionReason,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
