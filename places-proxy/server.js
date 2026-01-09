import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const KEY = process.env.GOOGLE_MAPS_API_KEY || "";

app.get("/health", (_req, res) => res.json({ ok: true }));

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
    const j = await r.json();
    res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: "PROXY_ERROR" });
  }
});

app.get("/places/details", async (req, res) => {
  try {
    if (!KEY) return res.status(500).json({ error: "MISSING_API_KEY" });

    const placeId = String(req.query.place_id ?? req.query.placeId ?? "").trim();
    if (!placeId) return res.status(400).json({ error: "MISSING_PLACE_ID" });

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "formatted_address,geometry,name,place_id");
    url.searchParams.set("language", "tr");
    url.searchParams.set("key", KEY);

    const r = await fetch(url.toString());
    const j = await r.json();
    res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: "PROXY_ERROR" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("listening", port));
