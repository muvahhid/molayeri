import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input") || "";
  const token = searchParams.get("token") || "";

  const base = process.env.PLACES_PROXY_URL || "";
  if (!base) return NextResponse.json({ error: "MISSING_PROXY_URL" }, { status: 500 });
  if (input.length < 2) return NextResponse.json({ predictions: [] });

  const url =
    base.replace(/\/$/, "") +
    "/places/autocomplete?input=" +
    encodeURIComponent(input) +
    "&token=" +
    encodeURIComponent(token);

  const r = await fetch(url, { cache: "no-store" });
  const txt = await r.text();
  return new NextResponse(txt, {
    status: r.status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
