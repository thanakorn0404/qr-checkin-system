import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import bcrypt from "bcrypt";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI in .env.local");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true, index: true, trim: true },
    studentId: { type: String, index: true },
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "organizer", "admin"], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function upsertUser({ username, studentId, name, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  // ใช้ username เป็น key ถ้ามี, ถ้าเป็น student อาจใช้ studentId เป็น key ได้
  const filter = username ? { username } : { studentId, role: "student" };

  await User.updateOne(
    filter,
    {
      $set: { name, role, isActive: true, passwordHash },
      $setOnInsert: { username, studentId },
    },
    { upsert: true }
  );

  console.log(`✅ upsert ${role}: ${username || studentId}`);
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  // ✅ admin
  await upsertUser({
    username: "admin",
    name: "Administrator",
    role: "admin",
    password: "admin1234",
  });

  // ✅ organizer
  await upsertUser({
    username: "staff",
    name: "Organizer 1",
    role: "organizer",
    password: "staff1234",
  });

  // ✅ student (= user)
  // แนะนำให้ตั้ง username = studentId เพื่อ login ง่าย
  await upsertUser({
    username: "6504305001318",
    studentId: "6504305001318",
    name: "Student 1",
    role: "student",
    password: "6504305001318",
  });

  await mongoose.disconnect();
  console.log("🎉 Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
