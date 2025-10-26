import Employee from "../models/Employee.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Employee.findOne({ email });
    if (existing) return res.status(400).json({ message: "Employee already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await Employee.create({ name, email, password: hashedPassword });

    res.status(201).json({ message: "Signup successful" });
  } catch (err) {

    res.status(500).json({ error: err.message });
  }
};

export const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;
    const employee = await Employee.findOne({ email });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const valid = await bcrypt.compare(password, employee.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

const token = jwt.sign(
  { id: employee._id, email: employee.email },
  process.env.JWT_SECRET || "your_secret_key",
  { expiresIn: "7d" }
);
    res.json({ token, employee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
