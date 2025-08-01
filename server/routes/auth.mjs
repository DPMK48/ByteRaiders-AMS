// server/routes/auth.mjs
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.mjs";
import authenticateAdmin from "../middleware/authAdmin.mjs";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();


// 🧑‍🎓 Admin registers a student
router.post("/register/student", authenticateAdmin, async (req, res) => {
  const { name, email, password, department } = req.body;
console.log("Registering student:", { name, email, department });
  if (!name || !email || !password || !department) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      department,
    });

     const savedUser = await newUser.save();

    return res.status(201).json({
      message: "Student registered successfully",
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        department: savedUser.department,
        status: savedUser.status,
      },
     });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// 🧑‍💼 Admin registers a staff
router.post("/register/staff", authenticateAdmin, async (req, res) => {
  const { name, email, password, position } = req.body;
  console.log("Registering staff:", { name, email, position });

  if (!name || !email || !password || !position) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "staff",
      position,
    });

     const savedUser = await newUser.save();

    return res.status(201).json({
      message: "staff registered successfully",
      user: newUser});
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// 🔐 Universal login (same as before)
router.post("/login", async (req, res) => {
  let { email, password } = req.body;
  console.log("Login attempt:", { email, password });

  if (!email && req.headers["x-stamped-email"]) {
    email = req.headers["x-stamped-email"];
  }
  console.log("Login attempt:", { email, password });

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || null,
        position: user.position || null,
      },
    });
  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET all staff
router.get("/staff", authenticateAdmin, async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch staff" });
  }
});

// GET all students
router.get("/student", authenticateAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: "student" });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// Update user (student or staff)
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, position, department } = req.body;
    const updates = { name, email };

    if (position) updates.position = position;
    if (department) updates.department = department;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
    console.error("Error updating user:", error.message);
  }
});

// Delete user (student or staff)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
    console.error("Error deleting user:", error.message);
  }
});

export default router;
