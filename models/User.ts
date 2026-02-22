// models/User.ts
import mongoose, { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },

    // student profile
    studentId: { type: String, index: true },
    name: { type: String, default: "" },
    year: { type: String, default: "" },
    classGroup: { type: String, default: "" },
    major: { type: String, default: "" },
    faculty: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },

    role: { type: String, enum: ["admin", "organizer", "student"], default: "student" },
    isActive: { type: Boolean, default: true },

    passwordHash: { type: String, required: true },

    // ✅ บังคับเปลี่ยนรหัสผ่านหลัง login ครั้งแรก
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);