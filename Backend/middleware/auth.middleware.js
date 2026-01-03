import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "No token provided",
        error: "Unauthorized",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          phone: true,
          department: true,
          position: true,
          employeeId: true,
          companyId: true,
          company: {
            select: {
              id: true,
              name: true,
              code: true,
              logo: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "User not found",
          error: "Unauthorized",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          status: "error",
          message: "Token expired",
          error: "Unauthorized",
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has required role(s)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
        error: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Insufficient permissions",
        error: "Forbidden",
      });
    }

    next();
  };
};
