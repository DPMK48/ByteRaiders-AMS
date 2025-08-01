// server/models/User.mjs
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "student", "staff"],
    default: "student", // default if not provided
  },
  status: {
    type: String,
    enum: ["present", "absent"],
    default: "absent",
  },
  department: {
    type: String,
    required: function () {
      return this.role === "student";
    },
  },
  position: {
    type: String,
    required: function () {
      return this.role === "staff";
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
