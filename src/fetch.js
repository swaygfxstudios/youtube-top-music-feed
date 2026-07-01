const fs = require("fs");

const API_KEY = process.env.YOUTUBE_API_KEY;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

//
// ─────────────────────────────
// 0. SYSTEM CHECK (pre-flight)
// ─────────────────────────────
//
function validateEnv() {
  if (!API_KEY) throw new Error("Missing YOUTUBE_API_KEY");
  if (!WEBHOOK) throw new Error("Missing DISCORD_WEBHOOK_URL");
}

//
// ─────────────────────────────
// 🌈 BRIGHT CINEMATIC PALETTE (shared visual system)
// ─────────────────────────────
//
const CINEMATIC_PALETTE = [
  0xff4d4d, // red
  0xffa64d, // orange
  0xffd24d, // gold
  0x66e066, // green
  0x4dd2ff, // sky blue
  0x4d79ff, // royal blue
  0xb84dff, // purple
  0xff4dd2, // pink
  0x00e6b8, // aqua
  0xffffff  // clean highlight
];

function getPanelColor(rank) {
  return CINEMATIC_PALETTE[(rank - 1) % CINEMATIC_PALETTE.length];
}

//
// ─────────────────────────────
// 1. FETCH YOUTUBE MUSIC VIDEOS
// ─────────────────────────────
//
async function fetchMusicVideos() {
  const url =
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics` +
    `&chart=mostPopular&videoCategoryId=10&regionCode=US&maxResults=20&key=${API_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.items || [];
}

//
// ─────────────────────────────
// 2. MEMORY (chart history)
// ─────────────────────────────
//
function loadPrevious() {
  try {
    return JSON.parse(fs.readFileSync("output/lastChart.json", "utf8"));
  } catch {
    return [];
  }
}

function saveCurrent(chart) {
  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("output/lastChart.json", JSON.stringify(chart, null, 2));
}

//
// ─────────────────────────────
// 3. VIRAL SCORE (video intelligence)
// ─────────────────────────────
//
function calculateVideoScore(video) {
  const views = video.views;

  const ageHours =
    (Date.now() - new Date(video.publishedAt).getTime()) / 36e5;

  const freshnessBoost = Math.max(0, 72 - ageHours);

  return (views * 0.8) + (freshnessBoost * 40000);
}

//
// ─────────────────────────────
// 4. BUILD CHART (Top 10 engine)
// ─────────────────────────────
//
function buildChart(items) {
  return items
    .map(v => ({
      videoId: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.medium?.url,
      views: Number(v.statistics.viewCount || 0),
      publishedAt: v.snippet.publishedAt
    }))
    .map(v => ({
      ...v,
      score: calculateVideoScore(v)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

//
// ─────────────────────────────
// 5. MOVEMENT + SIGNALS
// ─────────────────────────────
//
function applySignals(current, previous) {
  const prevMap = new Map();

  previous.forEach((v, i) => {
    prevMap.set(v.videoId, { rank: i + 1 });
  });

  return current.map((v, i) => {
    const rank = i + 1;
    const prev = prevMap.get(v.videoId);

    let signal = "🆕 NEW ENTRY";

    if (prev) {
      const diff = prev.rank - rank;

      if (diff >= 2) signal = "📈 RISING";
      else if (diff === 1) signal = "↗ UP";
      else if (diff <= -2) signal = "📉 FALLING";
      else signal = "➖ STABLE";
    }

    if (rank <= 5 && !prev) {
      signal = "⚡ EARLY VIDEO TREND";
    }

    return { ...v, rank, signal };
  });
}
//
// ─────────────────────────────
// 6. DISCORD SEND (CLEAN PRESENTATION)
// ─────────────────────────────
//
async function sendToDiscord(chart, attempt = 1) {
  try {
    const embeds = chart.map(v => ({
      title: `#${v.rank} ${v.title}`,

      url: `https://www.youtube.com/watch?v=${v.videoId}`,

      image: {
        url: v.thumbnail
      },

      color: getPanelColor(v.rank),

      description:
        `👀 **${v.views.toLocaleString()} views**`
    }));

    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: "🏆 **YouTube Music Video Chart (US)**",
        embeds
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Discord API error ${res.status}: ${text}`);
    }

    console.log("✅ Discord message sent");

  } catch (err) {
    console.log(`❌ Discord send failed (attempt ${attempt}):`, err.message);

    if (attempt < 2) {
      console.log("🔁 Retrying...");
      await new Promise(r => setTimeout(r, 2000));
      return sendToDiscord(chart, attempt + 1);
    }

    throw err;
  }
}
//
// ─────────────────────────────
// 7. MAIN PIPELINE
// ─────────────────────────────
//
async function main() {
  try {
    console.log("🚀 Starting chart engine...");

    validateEnv();

    const raw = await fetchMusicVideos();

    console.log(`📡 Fetched ${raw.length} videos`);

    const baseChart = buildChart(raw);

    const previous = loadPrevious();

    const finalChart = applySignals(baseChart, previous);

    await sendToDiscord(finalChart);

    saveCurrent(baseChart);

    console.log("✅ Chart cycle complete");

  } catch (err) {
    console.log("🔥 SYSTEM FAILURE:", err.message);
    process.exit(1);
  }
}

main();
