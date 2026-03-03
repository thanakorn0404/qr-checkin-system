import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema(
  {
    uniqueKey: { type: String, required: true, index: true },

    studentId: { type: String, required: true },
    fullName: { type: String, required: true },
    year: { type: String, required: true },
    classGroup: { type: String, required: true },

    major: { type: String, required: true },
    faculty: { type: String, required: true },

    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const CheckinSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    // ❌ ลบ userId ออกให้หมด

    participant: { type: ParticipantSchema, required: true },

    studentLat: Number,
    studentLng: Number,
    distanceMeters: Number,

    status: { type: String, default: "passed" },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

// กัน duplicate
CheckinSchema.index(
  { eventId: 1, "participant.uniqueKey": 1 },
  { unique: true }
);

export const Checkin =
  mongoose.models.Checkin ||
  mongoose.model("Checkin", CheckinSchema);