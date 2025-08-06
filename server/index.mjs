import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";
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
  "http://localhost:5173", // local dev
  "https://ams-frontend-iota.vercel.app", // deployed frontend (example)
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

// 🔗 Routes (these will be attached to the Express app)
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

// ✅ Connect to DB and then start server with Socket.IO attached
connectDB()
  .then(() => {
    // Create HTTP server so Socket.IO can attach to it
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = new IOServer(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
      // path: "/socket.io" // default path is fine
    });

    // Connection logging
    io.on("connection", (socket) => {
      console.log("🔌 Socket connected:", socket.id);

      socket.on("disconnect", (reason) => {
        console.log("⛔ Socket disconnected:", socket.id, reason);
      });
    });

    // expose io to routes via app.get('io')
    app.set("io", io);

    // Start the HTTP+Socket.IO server
    server.listen(PORT, () => {
      console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
    });

    // Create default admin user if missing (unchanged)
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
