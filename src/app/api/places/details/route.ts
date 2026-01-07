
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("place_id") || "";
  const token = searchParams.get("token") || "";
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) return NextResponse.json({ error: "MISSING_API_KEY" }, { status: 500 });
  if (!placeId) return NextResponse.json({ error: "MISSING_PLACE_ID" }, { status: 400 });

  const url =
    "https://maps.googleapis.com/maps/api/place/details/json" +
    "?place_id=" + encodeURIComponent(placeId) +
    "&fields=geometry,formatted_address,name" +
    "&key=" + key +
    "&sessiontoken=" + encodeURIComponent(token) +
    "&language=tr";

  const r = await fetch(url);
  const j = await r.json();
  return NextResponse.json(j, { status: r.status });
}
