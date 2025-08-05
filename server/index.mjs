import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.mjs";
import User from "./models/User.mjs";

import authRoutes from "./routes/auth.mjs";
import attendanceRoutes from "./routes/attendance.mjs";

dotenv.config();
console.log("🧪 MONGO_URI:", process.env.MONGO_URI);

const app = express();
const PORT = process.env.PORT || 5000;

// 🔧 Middleware
const allowedOrigins = [
  "http://localhost:5173",           // local dev
  "https://ams-frontend-iota.vercel.app"     // deployed frontend
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// 🔗 Routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

// ✅ Connect to DB and then start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    User.findOne({ email: "dorathypaul@gmail.com" })
      .then((existingAdmin) => {
        if (!existingAdmin) {
          return User.create({
            name: "Dorathy",
            email: "dorathypaul@gmail.com",
            password:
              "$2b$10$r/1eL5AdaKZ3L/mzNA62Nu412MoMo1N.Cgvo4p/opoHtEJM6.f/0S",
            role: "admin",
          });
        } else {
          console.log("⚠️ Default admin already exists");
        }
      })
      .then(() => {
        console.log("✅ Default admin user created");
      })
      .catch((err) => {
        console.error("❌ Error creating default admin user:", err.message);
      });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
