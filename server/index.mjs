import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.mjs";
import User from "./models/User.mjs";

import authRoutes from "./routes/auth.mjs";
import attendanceRoutes from "./routes/attendance.mjs";
// import devTestRoutes from "./routes/devtest.mjs";
// import adminRoutes from "./routes/admin.mjs";

dotenv.config();
console.log("🧪 MONGO_URI:", process.env.MONGO_URI);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  //     User.create({
  //       name: "Dorathy",
  //       email: "dorathypaul@gmail.com",
  //       password: "$2b$10$r/1eL5AdaKZ3L/mzNA62Nu412MoMo1N.Cgvo4p/opoHtEJM6.f/0S",
  //       role: "admin",
  //     }).then(() => {
  //       console.log("✅ Default admin user created")
  //     }).catch((err) => {
  //       console.error("❌ Error creating default admin user:", err.message);
  //     }
  // );
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err.message);
  process.exit(1);
});

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
// app.use("/api/admin", adminRoutes);

// app.use("/devtest", devTestRoutes);

