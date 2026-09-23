import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


// ===============================
// 시간
// ===============================

app.get("/api/time", (_, res) => {
  const korean = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
    timeStyle: "short"
  }).format(new Date());

  res.json({
    korean
  });
});


// ===============================
// 날씨
// ===============================

app.get("/api/weather", async (req, res) => {

  const city =
    String(req.query.city || "서울").trim();

  try {

    const geocodeUrl =
      "https://geocoding-api.open-meteo.com/v1/search" +
      "?name=" +
      encodeURIComponent(city) +
      "&count=1" +
      "&language=ko" +
      "&format=json";

    const g =
      await fetch(geocodeUrl);

    if (!g.ok) {
      throw new Error("geocode failed");
    }

    const gd =
      await g.json();

    const p =
      gd.results?.[0];

    if (!p) {

      return res.status(404).json({
        error:
          "도시를 찾지 못했습니다."
      });

    }

    const weatherUrl =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" +
      encodeURIComponent(p.latitude) +
      "&longitude=" +
      encodeURIComponent(p.longitude) +
      "&current=" +
      "temperature_2m," +
      "apparent_temperature," +
      "weather_code," +
      "relative_humidity_2m," +
      "wind_speed_10m" +
      "&timezone=Asia%2FSeoul";

    const w =
      await fetch(weatherUrl);

    if (!w.ok) {
      throw new Error("weather failed");
    }

    const wd =
      await w.json();

    res.json({
      city: p.name,
      country: p.country,
      current: wd.current
    });

  } catch (e) {

    console.error(
      "Weather error:",
      e
    );

    res.status(500).json({
      error:
        "날씨 정보를 가져오지 못했습니다."
    });

  }

});


// ===============================
// 검색
// ===============================

app.get("/api/search", async (req, res) => {

  const q =
    String(req.query.q || "").trim();

  if (!q) {

    return res.status(400).json({
      error:
        "검색어가 없습니다."
    });

  }

  const searchUrl =
    "https://www.google.com/search?q=" +
    encodeURIComponent(q);

  try {

    const r =
      await fetch(
        searchUrl + "&hl=ko",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0"
          }
        }
      );

    if (!r.ok) {
      throw new Error(
        "Google request failed"
      );
    }

    const html =
      await r.text();

    /*
      중요:
      정규식의 백슬래시는
      반드시 한 번만 사용한다.
    */

    const text =
      html
        .replace(
          /<script[\s\S]*?<\/script>/gi,
          " "
        )
        .replace(
          /<style[\s\S]*?<\/style>/gi,
          " "
        )
        .replace(
          /<[^>]+>/g,
          " "
        )
        .replace(
          /&quot;/g,
          '"'
        )
        .replace(
          /&#39;/g,
          "'"
        )
        .replace(
          /&amp;/g,
          "&"
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    res.json({
      query: q,
      preview: text.slice(0, 900),
      url: searchUrl
    });

  } catch (e) {

    console.error(
      "Search error:",
      e
    );

    res.json({
      query: q,
      preview:
        "검색 결과를 직접 열어보세요.",
      url: searchUrl
    });

  }

});


// ===============================
// 서버 시작
// ===============================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `JARVIS 2.0 running on port ${PORT}`
    );

  }
);
