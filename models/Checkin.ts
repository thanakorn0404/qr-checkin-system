import mongoose, { Schema, models, model } from "mongoose";

const CheckinSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    // ✅ เพิ่ม: คนที่ login แล้ว (ผูกกับ User)
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    participant: {
      uniqueKey: { type: String, required: true, unique: true, index: true },

      studentId: { type: String, required: true },
      fullName: { type: String, required: true },
      year: { type: String, required: true },
      classGroup: { type: String, required: true },
      major: { type: String, required: true },
      faculty: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },

    studentLat: { type: Number, required: true },
    studentLng: { type: Number, required: true },
    distanceMeters: { type: Number, default: 0 },

    status: { type: String, default: "passed" },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

// ✅ กันซ้ำแบบชัดสุด: 1 คน / 1 กิจกรรม
CheckinSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const Checkin = models.Checkin || model("Checkin", CheckinSchema);