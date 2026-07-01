const fs = require("fs");

const API_KEY = process.env.YOUTUBE_API_KEY;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

const BRAND_NAME = "SWAYGFX•STUDIOS®";
const BRAND_URL = "https://youtube.com/@swaygfx?si=kQVTyTVwhpkVJFQk";

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
  const data = await res.json();

  return data.items || [];
}

//
// ─────────────────────────────
// 2. MEMORY
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
// 3. SCORE SYSTEM
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
// 4. BUILD CHART
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
// 5. MOVEMENT SIGNALS
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

    let signal = "NEW";

    if (prev) {
      const diff = prev.rank - rank;

      if (diff >= 2) signal = "RISING";
      else if (diff === 1) signal = "UP";
      else if (diff <= -2) signal = "FALLING";
      else signal = "STABLE";
    }

    if (rank <= 5 && !prev) {
      signal = "BREAKOUT";
    }

    return { ...v, rank, signal };
  });
}

//
// ─────────────────────────────
// 6. MAIN EMBEDS (CLEAN TOP 10)
// ─────────────────────────────
//
function buildMainEmbeds(chart) {
  return chart.map(v => ({
    title: `#${v.rank} ${v.title}`,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    image: { url: v.thumbnail },
    description:
      `${v.signal}\n` +
      `${v.channel}\n` +
      `${v.views.toLocaleString()} views`
  }));
}

//
// ─────────────────────────────
// 7. BRAND FOOTER CARD (ONLY BRANDING)
// ─────────────────────────────
//
function buildBrandEmbed() {
  return {
    title: `Powered by ${BRAND_NAME}`,
    url: BRAND_URL,
    description: "—"
  };
}

//
// ─────────────────────────────
// 8. DISCORD SENDER
// ─────────────────────────────
//
async function sendToDiscord(chart) {
  const mainEmbeds = buildMainEmbeds(chart);
  const brandEmbed = buildBrandEmbed();

  // Message 1: Chart
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "🏆 Weekly YouTube Music Video Chart",
      embeds: mainEmbeds
    })
  });

  // Message 2: Brand (footer card only)
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [brandEmbed]
    })
  });
}

//
// ─────────────────────────────
// 9. MAIN PIPELINE
// ─────────────────────────────
//
async function main() {
  try {
    const raw = await fetchMusicVideos();

    const baseChart = buildChart(raw);

    const previous = loadPrevious();

    const finalChart = applySignals(baseChart, previous);

    await sendToDiscord(finalChart);

    saveCurrent(baseChart);

    console.log("✅ Weekly chart published cleanly");

  } catch (err) {
    console.log("❌ ERROR:", err.message);
    process.exit(1);
  }
}

main();
