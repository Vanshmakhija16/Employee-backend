import express from "express";
import { registerEmployee, loginEmployee } from "../controllers/employeeAuthController.js";

const router = express.Router();

router.post("/signup", registerEmployee);
router.post("/login", loginEmployee);

export default router;
