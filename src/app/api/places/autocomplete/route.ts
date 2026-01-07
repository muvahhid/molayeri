
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input") || "";
  const token = searchParams.get("token") || "";
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) return NextResponse.json({ error: "MISSING_API_KEY" }, { status: 500 });
  if (input.length < 6) return NextResponse.json({ predictions: [] });

  const url =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json" +
    "?input=" + encodeURIComponent(input) +
    "&key=" + key +
    "&sessiontoken=" + encodeURIComponent(token) +
    "&language=tr";

  const r = await fetch(url);
  const j = await r.json();
  return NextResponse.json(j, { status: r.status });
}
