// server/models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
  },
  checkInTime: {
    type: Date,
  },
  checkOutTime: {
    type: Date,
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  qrCodeContent: {
    type: String,
  },
   status: { type: String, enum: ["present"], default: "present" },
  
});

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
