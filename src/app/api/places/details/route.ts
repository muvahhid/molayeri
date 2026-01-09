import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("place_id") || "";
  const token = searchParams.get("token") || "";

  const base = process.env.PLACES_PROXY_URL || "";
  if (!base) return NextResponse.json({ error: "MISSING_PROXY_URL" }, { status: 500 });
  if (!placeId) return NextResponse.json({ error: "MISSING_PLACE_ID" }, { status: 400 });

  const url =
    base.replace(/\/$/, "") +
    "/places/details?place_id=" +
    encodeURIComponent(placeId) +
    "&token=" +
    encodeURIComponent(token);

  const r = await fetch(url, { cache: "no-store" });
  const txt = await r.text();
  return new NextResponse(txt, {
    status: r.status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
