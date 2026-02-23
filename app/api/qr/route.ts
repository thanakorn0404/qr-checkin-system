import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";

const QuerySchema = z.object({
  data: z.string().min(1),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ data: url.searchParams.get("data") });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "missing_data" }, { status: 400 });
  }

  const pngBuffer = await QRCode.toBuffer(parsed.data.data, {
    type: "png",
    margin: 2,
    width: 320,
    errorCorrectionLevel: "M",
  });

return new NextResponse(new Uint8Array(pngBuffer), {
  headers: {
    "Content-Type": "image/png",
    "Cache-Control": "no-store",
  },
});
}
