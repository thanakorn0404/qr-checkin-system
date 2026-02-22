import mongoose, { Schema, models, model } from "mongoose";

const EventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },

    // ✅ สถานที่/ห้อง/อาคาร (optional)
    locationName: { type: String, default: "" },

    // ✅ หมายเหตุ/เงื่อนไข (optional)
    notes: { type: String, default: "" },

    // ✅ Geofence แบบกรอบสี่เหลี่ยม
    geoBox: {
      north: { type: Number, required: false },
      south: { type: Number, required: false },
      east: { type: Number, required: false },
      west: { type: Number, required: false },
    },

    // (optional) circle เดิม เผื่อใช้ย้อนหลัง
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    radiusMeters: { type: Number, required: false, default: 100 },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },

    // ✅ ผู้จัด: เก็บ userId จาก login อัตโนมัติ (admin/organizer)
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // token สำหรับ QR
    qrToken: { type: String, required: true, unique: true, index: true },

    // ✅ เปิด/ปิดกิจกรรม
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ ต้องมี geoBox ครบ 4 ค่า หรือ circle
EventSchema.pre("validate", function () {
  const e: any = this;

  const hasGeoBox =
    e.geoBox &&
    typeof e.geoBox.north === "number" &&
    typeof e.geoBox.south === "number" &&
    typeof e.geoBox.east === "number" &&
    typeof e.geoBox.west === "number";

  const hasCircle = typeof e.latitude === "number" && typeof e.longitude === "number";

  if (!hasGeoBox && !hasCircle) {
    throw new Error("Event must have geoBox or latitude/longitude");
  }
});

export const Event = models.Event || model("Event", EventSchema);
