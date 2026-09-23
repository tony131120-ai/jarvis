import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT =
  process.env.PORT || 10000;

const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY || "";

const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "";

const ELEVENLABS_MODEL =
  process.env.ELEVENLABS_MODEL ||
  "eleven_multilingual_v2";


app.use(
  express.json({
    limit: "2mb"
  })
);


app.use(
  express.static(__dirname)
);


/* =========================================================
   MAIN
========================================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});


/* =========================================================
   TIME
========================================================= */

app.get(
  "/api/time",
  (req, res) => {

    try {

      const now =
        new Intl.DateTimeFormat(
          "ko-KR",
          {
            timeZone:
              "Asia/Seoul",

            dateStyle:
              "full",

            timeStyle:
              "short"
          }
        ).format(
          new Date()
        );


      res.json({
        korean: now
      });

    } catch (error) {

      console.error(
        "TIME ERROR:",
        error
      );

      res.status(500).json({
        error:
          "시간 정보를 가져오지 못했습니다."
      });

    }

  }
);


/* =========================================================
   WEATHER
========================================================= */
const weatherCache = new Map();
app.get("/api/weather", async (req, res) => {
  try {
    const cityInput = String(req.query.city || "서울").trim();
const cacheKey = cityInput;

const cached = weatherCache.get(cacheKey);

if (
  cached &&
  Date.now() - cached.time < 5 * 60 * 1000
) {
  return res.json(cached.data);
}
    // 한국 주요 지역 좌표
    const cities = {
      "서울": { lat: 37.5665, lon: 126.9780, name: "서울" },
      "수원": { lat: 37.2636, lon: 127.0286, name: "수원" },
      "용인": { lat: 37.2411, lon: 127.1776, name: "용인" },
      "인천": { lat: 37.4563, lon: 126.7052, name: "인천" },
      "부산": { lat: 35.1796, lon: 129.0756, name: "부산" },
      "대전": { lat: 36.3504, lon: 127.3845, name: "대전" },
      "대구": { lat: 35.8714, lon: 128.6014, name: "대구" },
      "광주": { lat: 35.1595, lon: 126.8526, name: "광주" },
      "울산": { lat: 35.5384, lon: 129.3114, name: "울산" },
      "제주": { lat: 33.4996, lon: 126.5312, name: "제주" },
      "청주": { lat: 36.6424, lon: 127.4890, name: "청주" },
      "전주": { lat: 35.8242, lon: 127.1480, name: "전주" },
      "춘천": { lat: 37.8813, lon: 127.7298, name: "춘천" },
      "강릉": { lat: 37.7519, lon: 128.8761, name: "강릉" },
      "포항": { lat: 36.0190, lon: 129.3435, name: "포항" }
    };

    let place = cities[cityInput];

    // 등록된 도시가 아니면 Open-Meteo 지오코딩 사용
    if (!place) {
      const geoUrl =
        "https://geocoding-api.open-meteo.com/v1/search" +
        "?name=" +
        encodeURIComponent(cityInput) +
        "&count=1" +
        "&language=ko" +
        "&format=json";

      const geoResponse = await fetch(geoUrl);

      if (!geoResponse.ok) {
        throw new Error("지역 검색 실패");
      }

      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        return res.status(404).json({
          error: "해당 지역을 찾을 수 없습니다."
        });
      }

      const result = geoData.results[0];

      place = {
        lat: result.latitude,
        lon: result.longitude,
        name: result.name || cityInput
      };
    }

    const weatherUrl =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" +
      encodeURIComponent(place.lat) +
      "&longitude=" +
      encodeURIComponent(place.lon) +
      "&current=" +
      [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code",
        "wind_speed_10m"
      ].join(",") +
      "&timezone=Asia%2FSeoul";

    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error(
        `날씨 API 오류: ${weatherResponse.status}`
      );
    }

    const data = await weatherResponse.json();

    if (!data.current) {
      throw new Error("현재 날씨 데이터가 없습니다.");
    }

    const current = data.current;

    const weatherCode = Number(current.weather_code);

    let description = "맑음";

    if (weatherCode === 0) {
      description = "맑음";
    } else if ([1, 2, 3].includes(weatherCode)) {
      description = "구름 많음";
    } else if ([45, 48].includes(weatherCode)) {
      description = "안개";
    } else if (
      [51, 53, 55, 56, 57].includes(weatherCode)
    ) {
      description = "이슬비";
    } else if (
      [61, 63, 65, 66, 67].includes(weatherCode)
    ) {
      description = "비";
    } else if (
      [71, 73, 75, 77].includes(weatherCode)
    ) {
      description = "눈";
    } else if (
      [80, 81, 82].includes(weatherCode)
    ) {
      description = "소나기";
    } else if (
      [85, 86].includes(weatherCode)
    ) {
      description = "눈 소나기";
    } else if (
      [95, 96, 99].includes(weatherCode)
    ) {
      description = "뇌우";
    }

   const result = {
  city: place.name,
  temperature: Math.round(current.temperature_2m),
  feelsLike: Math.round(current.apparent_temperature),
  humidity: Math.round(current.relative_humidity_2m),
  windSpeed: Math.round(current.wind_speed_10m),
  weatherCode,
  description
};

weatherCache.set(cacheKey, {
  time: Date.now(),
  data: result
});

res.json(result);
  } catch (error) {
    console.error("날씨 조회 오류:", error);

    res.status(500).json({
      error: "날씨 정보를 가져오지 못했습니다.",
      detail: error.message
    });
  }
});

/* =========================================================
   GOOGLE SEARCH
========================================================= */

app.get(
  "/api/search",
  async (req, res) => {

    const query =
      String(
        req.query.q || ""
      ).trim();


    if (!query) {

      return res
        .status(400)
        .json({
          error:
            "검색어가 없습니다."
        });

    }


    const url =
      "https://www.google.com/search?q=" +
      encodeURIComponent(query) +
      "&hl=ko";


    try {

      const response =
        await fetch(
          url,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          }
        );


      const html =
        await response.text();


      const preview =
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

        query,

        preview:
          preview.slice(
            0,
            1200
          ),

        url

      });


    } catch (error) {

      console.error(
        "SEARCH ERROR:",
        error
      );


      res.json({

        query,

        preview:
          "검색 결과를 직접 열어보세요.",

        url

      });

    }

  }
);


/* =========================================================
   ELEVENLABS TTS
========================================================= */

app.post(
  "/api/tts",
  async (req, res) => {

    const text =
      String(
        req.body?.text || ""
      ).trim();


    if (!text) {

      return res
        .status(400)
        .json({
          error:
            "텍스트가 없습니다."
        });

    }


    /*
      ElevenLabs 설정이 없으면
      프론트엔드가 브라우저 TTS로 fallback
    */

    if (
      !ELEVENLABS_API_KEY ||
      !ELEVENLABS_VOICE_ID
    ) {

      return res
        .status(503)
        .json({
          error:
            "ElevenLabs TTS가 설정되지 않았습니다."
        });

    }


    try {

      const response =
        await fetch(
          "https://api.elevenlabs.io/v1/text-to-speech/" +
          encodeURIComponent(
            ELEVENLABS_VOICE_ID
          ),
          {

            method:
              "POST",

            headers: {

              "xi-api-key":
                ELEVENLABS_API_KEY,

              "Content-Type":
                "application/json",

              "Accept":
                "audio/mpeg"

            },

            body:
              JSON.stringify({

                text,

                model_id:
                  ELEVENLABS_MODEL,

                voice_settings: {

                  stability:
                    0.55,

                  similarity_boost:
                    0.70,

                  style:
                    0.25,

                  use_speaker_boost:
                    true

                }

              })

          }
        );


      if (!response.ok) {

        const errorText =
          await response.text();


        console.error(
          "ELEVENLABS ERROR:",
          response.status,
          errorText
        );


        return res
          .status(502)
          .json({
            error:
              "ElevenLabs 음성 생성 실패"
          });

      }


      const audio =
        await response.arrayBuffer();


      res.setHeader(
        "Content-Type",
        "audio/mpeg"
      );


      res.setHeader(
        "Cache-Control",
        "no-store"
      );


      res.send(
        Buffer.from(
          audio
        )
      );


    } catch (error) {

      console.error(
        "TTS ERROR:",
        error
      );


      res
        .status(500)
        .json({
          error:
            "음성 생성 중 오류가 발생했습니다."
        });

    }

  }
);


/* =========================================================
   SERVER
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `E.B. running on port ${PORT}`
    );

    console.log(
      "TTS:",
      ELEVENLABS_API_KEY &&
      ELEVENLABS_VOICE_ID
        ? "ElevenLabs"
        : "Browser fallback"
    );

  }
);
