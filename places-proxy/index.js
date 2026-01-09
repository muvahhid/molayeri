import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const KEY = process.env.GOOGLE_MAPS_API_KEY || "";

app.get("/", (_req, res) => res.status(200).send("OK"));

app.get("/autocomplete", async (req, res) => {
  try {
    if (!KEY) return res.status(500).json({ error: "MISSING_API_KEY" });

    const input = String(req.query.input || "").trim();
    const country = String(req.query.country || "tr").trim();
    const lang = String(req.query.lang || "tr").trim();

    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("components", `country:${country}`);
    url.searchParams.set("language", lang);
    url.searchParams.set("key", KEY);

    const r = await fetch(url);
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.get("/details", async (req, res) => {
  try {
    if (!KEY) return res.status(500).json({ error: "MISSING_API_KEY" });

    const placeId = String(req.query.place_id || "").trim();
    const lang = String(req.query.lang || "tr").trim();

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "geometry,name,formatted_address");
    url.searchParams.set("language", lang);
    url.searchParams.set("key", KEY);

    const r = await fetch(url);
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("listening on", port));
