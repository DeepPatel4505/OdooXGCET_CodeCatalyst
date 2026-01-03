import express from "express";
import {
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
} from "../controllers/passwordReset.controller.js";

const router = express.Router();

router.post("/request", requestPasswordReset);
router.post("/reset", resetPassword);
router.get("/verify", verifyResetToken);

export default router;

