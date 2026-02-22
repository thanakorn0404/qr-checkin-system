import { connectDB } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/auth";
import { Event } from "@/models/Event";
import { Checkin } from "@/models/Checkin";

export async function GET() {
  const auth = await requireAuth();
  if (auth.role !== "admin" && auth.role !== "organizer") {
    return new Response("forbidden", { status: 403 });
  }

  await connectDB();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ ok: true, type: "hello" });

      const timer = setInterval(async () => {
        try {
          const now = new Date();

          const events = await Event.find({
            isActive: true,
            endAt: { $gte: now },
          })
            .select("_id")
            .lean();

          const eventIds = events.map((e: any) => e._id);

          const counts = await Checkin.aggregate([
            { $match: { eventId: { $in: eventIds } } },
            { $group: { _id: "$eventId", total: { $sum: 1 } } },
          ]);

          const payload: Record<string, number> = {};
          for (const c of counts as any[]) payload[String(c._id)] = c.total;

          send({ ok: true, type: "counts", payload, at: new Date().toISOString() });
        } catch (err: any) {
          send({ ok: false, type: "error", message: String(err?.message || "unknown") });
        }
      }, 2000);

      // ปิด stream เมื่อ client ปิด
      // @ts-ignore
      controller.signal?.addEventListener?.("abort", () => clearInterval(timer));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
