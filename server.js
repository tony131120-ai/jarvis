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

app.get(
  "/api/weather",
  async (req, res) => {

    const city =
      String(
        req.query.city ||
        "서울"
      ).trim();


    try {

      const geocodeResponse =
        await fetch(
          "https://geocoding-api.open-meteo.com/v1/search" +
          "?name=" +
          encodeURIComponent(city) +
          "&count=1" +
          "&language=ko" +
          "&format=json"
        );


      if (!geocodeResponse.ok) {

        throw new Error(
          "Geocoding failed"
        );

      }


      const geocode =
        await geocodeResponse.json();


      const place =
        geocode.results?.[0];


      if (!place) {

        return res
          .status(404)
          .json({
            error:
              "도시를 찾지 못했습니다."
          });

      }


      const weatherResponse =
        await fetch(
          "https://api.open-meteo.com/v1/forecast" +
          "?latitude=" +
          encodeURIComponent(
            place.latitude
          ) +
          "&longitude=" +
          encodeURIComponent(
            place.longitude
          ) +
          "&current=" +
          encodeURIComponent(
            [
              "temperature_2m",
              "apparent_temperature",
              "weather_code",
              "relative_humidity_2m",
              "wind_speed_10m"
            ].join(",")
          ) +
          "&timezone=Asia%2FSeoul"
        );


      if (!weatherResponse.ok) {

        throw new Error(
          "Weather failed"
        );

      }


      const weather =
        await weatherResponse.json();


      res.json({

        city:
          place.name,

        country:
          place.country,

        current:
          weather.current

      });


    } catch (error) {

      console.error(
        "WEATHER ERROR:",
        error
      );


      res
        .status(500)
        .json({
          error:
            "날씨 정보를 가져오지 못했습니다."
        });

    }

  }
);


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
