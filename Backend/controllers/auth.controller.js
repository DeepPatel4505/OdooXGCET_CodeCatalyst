import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/password.utils.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.utils.js";
import {
  generateEmployeeId,
  generateCompanyCode,
} from "../utils/employee.utils.js";

const prisma = new PrismaClient();

export const login = async (req, res, next) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({
        status: "error",
        message: "Login ID and password are required",
        error: "Validation Error",
      });
    }

    // Find user by either email or employeeId
    // employeeId IS the login ID - they are the same value stored in the database
    // Supports both login methods: email address or employeeId (login ID)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginId },
          { employeeId: loginId }, // employeeId = login ID (same value)
        ],
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            logo: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid login ID or password",
        error: "Unauthorized",
      });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid login ID or password",
        error: "Unauthorized",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); 

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      status: "success",
      data: {
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await prisma.refreshToken.delete({
        where: { token },
      });
    }

    res
      .status(200)
      .json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token",
        error: "Unauthorized",
      });
    }

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({
        status: "error",
        message: "Refresh token expired or invalid",
        error: "Unauthorized",
      });
    }

    const accessToken = generateAccessToken(decoded.userId);

    res.json({
      status: "success",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    res.json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req, res, next) => {
  try {
    // Check if any companies already exist - registration is only allowed for initial setup
    const existingCompanies = await prisma.company.findMany({
      take: 1,
    });

    if (existingCompanies.length > 0) {
      return res.status(403).json({
        status: "error",
        message: "Registration is disabled. Please contact your HR or Admin to create an account.",
        error: "Forbidden",
      });
    }

    const { companyName, name, email, phone, password, companyLogo } = req.body;

    if (!companyName || companyName.length < 2) {
      return res.status(400).json({
        status: "error",
        message: "Company name is required and must be at least 2 characters",
        error: "Validation Error",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User with this email already exists",
        error: "Validation Error",
      });
    }

    let company = await prisma.company.findUnique({
      where: { name: companyName },
    });

    if (!company) {
      const companyCode = await generateCompanyCode(companyName);

      try {
        company = await prisma.company.create({
          data: {
            name: companyName,
            code: companyCode,
            logo: companyLogo || null,
          },
        });
      } catch (error) {
        if (error.code === "P2002" && error.meta?.target?.includes("code")) {
          const fallbackCode = `${companyName
            .substring(0, 2)
            .toUpperCase()}${Date.now().toString().slice(-4)}`;
          company = await prisma.company.create({
            data: {
              name: companyName,
              code: fallbackCode,
              logo: companyLogo || null,
            },
          });
        } else {
          throw error;
        }
      }
    }

    // Split name
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    if (firstName.length < 2 || lastName.length < 2) {
      return res.status(400).json({
        status: "error",
        message:
          "First name and last name must each be at least 2 characters long",
        error: "Validation Error",
      });
    }

    const hireDate = new Date();

    // Generate employeeId which IS the login ID (they are the same value)
    // Format: CompanyCode + First2LettersOfFirstName + First2LettersOfLastName + Year + SerialNumber
    const employeeId = await generateEmployeeId(
      company.code,
      firstName,
      lastName,
      hireDate,
      company.id
    );

    const hashedPassword = await hashPassword(password);

    // Store employeeId in user table - this is the login ID
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "admin",
        phone: phone || null,
        department: "General",
        position: "Owner",
        employeeId, // This is the login ID (same value)
        companyId: company.id,
      },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    // Store employeeId in employee table - this is the login ID
    await prisma.employee.create({
      data: {
        employeeId, // This is the login ID (same value)
        userId: user.id,
        email,
        firstName,
        lastName,
        phone: phone || null,
        department: "General",
        position: "Owner",
        status: "active",
        hireDate,
        salary: 0,
        companyId: company.id,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const userWithCompany = await prisma.user.findUnique({
      where: { id: user.id },
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

    res.status(201).json({
      status: "success",
      data: {
        accessToken,
        refreshToken,
        user: userWithCompany,
      },
    });
  } catch (error) {
    next(error);
  }
};
