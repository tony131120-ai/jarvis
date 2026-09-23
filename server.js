import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());
app.use(express.static(__dirname));
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/api/time", (_, res) => {
  res.json({ korean: new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "full", timeStyle: "short" }).format(new Date()) });
});

app.get("/api/weather", async (req, res) => {
  const city = String(req.query.city || "서울").trim();
  try {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ko&format=json`);
    if (!g.ok) throw new Error("geocode");
    const gd = await g.json();
    const p = gd.results?.[0];
    if (!p) return res.status(404).json({ error: "도시를 찾지 못했습니다." });
    const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FSeoul`);
    if (!w.ok) throw new Error("weather");
    const wd = await w.json();
    res.json({ city: p.name, country: p.country, current: wd.current });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "날씨 정보를 가져오지 못했습니다." });
  }
});

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "검색어가 없습니다." });
  try {
    const r = await fetch(`https://www.google.com/search?q=${encodeURIComponent(q)}&hl=ko` , { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await r.text();
    const text = html.replace(/<script[\\s\\S]*?<\\/script>/gi, " ").replace(/<style[\\s\\S]*?<\\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\\s+/g, " ").trim();
    res.json({ query: q, preview: text.slice(0, 900), url: `https://www.google.com/search?q=${encodeURIComponent(q)}` });
  } catch (e) {
    res.json({ query: q, preview: "검색 결과를 직접 열어보세요.", url: `https://www.google.com/search?q=${encodeURIComponent(q)}` });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`JARVIS 2.0 running on ${PORT}`));
