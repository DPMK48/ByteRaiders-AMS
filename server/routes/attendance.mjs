import express from "express";
import authUser from "../middleware/authUser.mjs";
import Attendance from "../models/Attendance.mjs";
import User from "../models/User.mjs";

const router = express.Router();

// ⏰ Force date logic to Africa/Lagos timezone
function getLagosStartAndEndOfDay() {
  const lagosNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })
  );

  const startOfDay = new Date(lagosNow);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(lagosNow);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

// POST /api/attendance/mark
router.post("/mark", authUser, async (req, res) => {
  const userId = req.user?.userId;
  const { location, qrCodeContent } = req.body;
  console.log(location, qrCodeContent);

  console.log("✅ userId:", userId);
  console.log("✅ location:", location);
  console.log("✅ qrCodeContent:", qrCodeContent);

  if (
    !userId ||
    !location ||
    location.lat == null ||
    location.lng == null ||
    !qrCodeContent
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (qrCodeContent !== "HUB-ATTENDANCE-2025") {
    return res.status(400).json({ error: "Invalid QR Code" });
  }

  const HUB_LAT = 10.272637;
  const HUB_LNG = 9.794106;

  const distance = getDistanceFromLatLonInMeters(
    location.lat,
    location.lng,
    HUB_LAT,
    HUB_LNG
  );
  if (distance > 500) {
    return res
      .status(400)
      .json({ error: "You are too far from the hub location" });
  }

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })
  );
  const { startOfDay, endOfDay } = getLagosStartAndEndOfDay();

  console.log("Server Date:", new Date().toString());

  try {
    let attendance = await Attendance.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    // Helper to emit attendanceUpdated with populated user info
    const emitAttendanceUpdate = async (attendanceDoc) => {
      try {
        const io = req.app.get("io");
        if (!io) return;

        // Ensure we have fresh user data
        const user = await User.findById(userId).lean();

        const payload = {
          _id: attendanceDoc._id,
          userId: user?._id,
          name: user?.name ?? null,
          email: user?.email ?? null,
          role: user?.role ?? null,
          date: attendanceDoc.date,
          checkIn: attendanceDoc.checkInTime
            ? new Date(attendanceDoc.checkInTime).toISOString()
            : null,
          checkOut: attendanceDoc.checkOutTime
            ? new Date(attendanceDoc.checkOutTime).toISOString()
            : null,
          status: attendanceDoc.checkInTime ? "present" : "absent",
        };

        io.emit("attendanceUpdated", payload);
      } catch (err) {
        console.warn("Failed to emit attendanceUpdated:", err.message || err);
      }
    };

    if (!attendance) {
      // First-time check-in
      attendance = new Attendance({
        userId,
        date: now,
        checkInTime: now,
      });
      await attendance.save();

      // emit update
      await emitAttendanceUpdate(attendance);

      return res.status(200).json({
        message: `✅ Checked in successfully at ${now.toLocaleTimeString(
          "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        )}`,
        userId,
        checkInTime: attendance.checkInTime,
        date: attendance.date,
      });
    } else if (!attendance.checkOutTime) {
      // Check-out
      attendance.checkOutTime = now;
      await attendance.save();

      // emit update
      await emitAttendanceUpdate(attendance);

      return res.status(200).json({
        message: `✅ Checked out at ${now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}`,
        userId,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        date: attendance.date,
      });
    } else {
      // Already checked out
      return res.status(200).json({
        message: "✅ You’ve already checked in and out for today",
        userId,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        date: attendance.date,
      });
    }
  } catch (error) {
    console.error("Attendance error:", error);
    return res.status(500).json({ error: "❌ Something went wrong" });
  }
});

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

router.get("/status", authUser, async (req, res) => {
  const userId = req.user?.userId;

  const { startOfDay, endOfDay } = getLagosStartAndEndOfDay();

  try {
    const attendance = await Attendance.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!attendance) {
      return res.status(200).json({ status: "none" });
    } else if (!attendance.checkOutTime) {
      return res.status(200).json({
        status: "checkedIn",
        checkInTime: attendance.checkInTime,
      });
    } else {
      return res.status(200).json({
        status: "checkedOut",
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
      });
    }
  } catch (error) {
    console.error("Status check error:", error);
    return res.status(500).json({ error: "Error checking attendance status" });
  }
});

// GET /api/attendance/today
router.get("/today", authUser, async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  console.log("Server Date:", new Date().toString());

  const userId = req.user.userId;

  console.log("🧠 Checking today's attendance for:", userId, today);

  const { startOfDay, endOfDay } = getLagosStartAndEndOfDay();

  const record = await Attendance.findOne({
    userId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  console.log("📌 Found record:", record); // <-- this will help us

  if (!record) return res.json({ status: "notCheckedIn" });

  if (record.checkInTime && !record.checkOutTime) {
    return res.json({ status: "checkedIn", checkInTime: record.checkInTime });
  }

  return res.json({
    status: "checkedOut",
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
  });
});

// Fetch attendance overview
router.get("/overview", async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate("userId") // userId instead of user
      .lean();

    const formatted = records
      .filter((record) => record.userId) // skip broken references
      .map((record) => ({
        name: record.userId.name,
        email: record.userId.email,
        role: record.userId.role,
        date: record.date,
        checkIn: record.checkInTime
          ? new Date(record.checkInTime).toISOString()
          : null,
        checkOut: record.checkOutTime
          ? new Date(record.checkOutTime).toISOString()
          : null,
        status: record.checkInTime ? "present" : "absent",
      }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching attendance overview:", err);
    res.status(500).json({ message: "Failed to fetch attendance overview" });
  }
});

export default router;
