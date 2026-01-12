export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = String(searchParams.get("lat") || "").trim();
    const lng = String(searchParams.get("lng") || "").trim();
    if (!lat || !lng) return Response.json({ bearing: null }, { status: 400 });

    const base = process.env.PLACES_PROXY_URL || "";
    if (!base) return Response.json({ bearing: null }, { status: 200 });

    const url = new URL(base.replace(/\/$/,"") + "/osmr/bearing");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lng", lng);

    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) return Response.json({ bearing: null }, { status: 200 });
    const j = await r.json();
    const b = Number(j?.bearing);
    return Response.json({ bearing: Number.isFinite(b) ? b : null }, { status: 200 });
  } catch {
    return Response.json({ bearing: null }, { status: 200 });
  }
}
