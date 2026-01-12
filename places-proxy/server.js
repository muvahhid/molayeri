import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const KEY = process.env.GOOGLE_MAPS_API_KEY || "";

// ---- HELPERS ----

function decodePolyline(encoded) {
  let index = 0, lat = 0, lng = 0;
  const points = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// ---- ENDPOINTS ----

app.get("/health", (_req, res) => res.json({ ok: true }));

// 1. AUTOCOMPLETE (Geri Geldi!)
app.get("/places/autocomplete", async (req, res) => {
  try {
    if (!KEY) return res.status(500).json({ error: "MISSING_API_KEY" });
    const input = String(req.query.input || "").trim();
    if (!input) return res.json({ predictions: [], status: "OK" });

    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("language", "tr");
    url.searchParams.set("components", "country:tr");
    url.searchParams.set("key", KEY);

    const r = await fetch(url.toString());
    res.status(r.status).json(await r.json());
  } catch {
    res.status(500).json({ error: "PROXY_ERROR" });
  }
});

// 2. DETAILS (Geri Geldi!)
app.get("/places/details", async (req, res) => {
  try {
    if (!KEY) return res.status(500).json({ error: "MISSING_API_KEY" });
    const placeId = String(req.query.place_id ?? "").trim();
    if (!placeId) return res.status(400).json({ error: "MISSING_PLACE_ID" });

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "formatted_address,geometry,name,place_id");
    url.searchParams.set("language", "tr");
    url.searchParams.set("key", KEY);

    const r = await fetch(url.toString());
    res.status(r.status).json(await r.json());
  } catch {
    res.status(500).json({ error: "PROXY_ERROR" });
  }
});

// 3. DIRECTIONS (Alternatifli & Stitching - Güncel Hal)
app.get("/directions", async (req, res) => {
  try {
    if (!KEY) return res.status(500).json({ error: "MISSING_API_KEY" });
    
    const origin = String(req.query.origin || "").trim();
    const destination = String(req.query.destination || "").trim();
    // Alternatif parametresi
    const alternatives = req.query.alternatives === 'true'; 
    
    if (!origin || !destination) return res.status(400).json({ error: "MISSING_ORIGIN_DESTINATION" });

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("language", "tr");
    if (alternatives) url.searchParams.set("alternatives", "true");
    url.searchParams.set("key", KEY);

    const r = await fetch(url.toString());
    const data = await r.json();

    if (data.status !== "OK") {
        return res.status(400).json(data);
    }

    // TÜM ALTERNATİFLERİ BİRLEŞTİR
    let detailedPoints = [];
    const routes = data.routes || [];
    
    for (const route of routes) {
        const legs = route.legs || [];
        for (const leg of legs) {
            const steps = leg.steps || [];
            for (const step of steps) {
                if (step.polyline?.points) {
                    const stepPoints = decodePolyline(step.polyline.points);
                    detailedPoints = detailedPoints.concat(stepPoints);
                }
            }
        }
    }

    res.json({ 
        ...data, 
        decodedPoints: detailedPoints 
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "PROXY_ERROR" });
  }
});

// 4. ROADS NEAREST (Geri Geldi!)
app.get("/roads/nearest", async (req, res) => {
  try {
    if (!KEY) return res.status(500).json({ error: "MISSING_API_KEY" });
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: "BAD_LAT_LNG" });

    const url = new URL("https://roads.googleapis.com/v1/nearestRoads");
    url.searchParams.set("points", `${lat},${lng}`);
    url.searchParams.set("key", KEY);

    const r = await fetch(url.toString());
    const j = await r.json();

    const sp = j?.snappedPoints?.[0];
    const roadLat = sp?.location?.latitude ?? null;
    const roadLng = sp?.location?.longitude ?? null;
    const roadPlaceId = sp?.placeId ?? null;

    return res.status(200).json({ roadLat, roadLng, roadPlaceId });
  } catch {
    return res.status(500).json({ error: "PROXY_ERROR" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("listening", port));
