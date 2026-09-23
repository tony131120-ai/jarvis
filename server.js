import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   시간
========================= */

app.get("/api/time", (req, res) => {
  const now = new Date();

  const text = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
    timeStyle: "medium"
  }).format(now);

  res.json({ text });
});

/* =========================
   날씨
========================= */

function weatherText(code) {
  const map = {
    0: "맑음",
    1: "대체로 맑음",
    2: "부분적으로 흐림",
    3: "흐림",
    45: "안개",
    48: "안개",
    51: "이슬비",
    53: "이슬비",
    55: "이슬비",
    61: "약한 비",
    63: "비",
    65: "강한 비",
    71: "약한 눈",
    73: "눈",
    75: "강한 눈",
    80: "소나기",
    81: "소나기",
    82: "강한 소나기",
    95: "뇌우",
    96: "뇌우",
    99: "강한 뇌우"
  };

  return map[code] || "날씨 정보";
}

app.get("/api/weather", async (req, res) => {
  const city = String(req.query.city || "서울").trim();

  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=ko&format=json`
    );

    if (!geoResponse.ok) {
      throw new Error("geocoding failed");
    }

    const geo = await geoResponse.json();

    const place = geo.results?.[0];

    if (!place) {
      return res.status(404).json({
        error: "도시를 찾지 못했습니다."
      });
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FSeoul`
    );

    if (!weatherResponse.ok) {
      throw new Error("weather failed");
    }

    const weather = await weatherResponse.json();
    const current = weather.current;

    res.json({
      city: place.name,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind: current.wind_speed_10m,
      condition: weatherText(current.weather_code)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "날씨 정보를 가져오지 못했습니다."
    });
  }
});

/* =========================
   검색
========================= */

app.get("/api/search", (req, res) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      error: "검색어가 없습니다."
    });
  }

  const url =
    `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=ko`;

  res.json({
    query: q,
    url
  });
});

/* =========================
   서버
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`이비 서버 실행 중: ${PORT}`);
});
