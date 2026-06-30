const fs = require("fs");

const API_KEY = process.env.YOUTUBE_API_KEY;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

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
// 2. MEMORY (previous chart snapshot)
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
// 3. VIRAL VIDEO SCORE (video-first logic)
// ─────────────────────────────
//
function calculateVideoScore(video) {
  const views = video.views;

  const ageHours =
    (Date.now() - new Date(video.publishedAt).getTime()) / 36e5;

  // freshness boost = early viral detection signal
  const freshnessBoost = Math.max(0, 72 - ageHours);

  // video dominance score (views + early traction)
  return (views * 0.8) + (freshnessBoost * 40000);
}

//
// ─────────────────────────────
// 4. BUILD MUSIC VIDEO CHART
// ─────────────────────────────
//
function buildChart(items) {
  return items
    .map(v => ({
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
// 5. MOVEMENT + EARLY TREND SIGNALS
// ─────────────────────────────
//
function applySignals(current, previous) {
  const prevMap = new Map();

  previous.forEach((v, i) => {
    prevMap.set(v.title, { rank: i + 1 });
  });

  return current.map((v, i) => {
    const rank = i + 1;
    const prev = prevMap.get(v.title);

    let signal = "🆕 NEW ENTRY";

    if (prev) {
      const diff = prev.rank - rank;

      if (diff >= 2) signal = "📈 RISING";
      else if (diff === 1) signal = "↗ Up";
      else if (diff <= -2) signal = "📉 FALLING";
      else signal = "➖ Stable";
    }

    // early breakout detection (video-specific logic)
    if (rank <= 5 && !prev) {
      signal = "⚡ EARLY VIDEO TREND";
    }

    return {
      ...v,
      rank,
      signal
    };
  });
}

//
// ─────────────────────────────
// 6. APPLE-STYLE DISCORD OUTPUT
// ─────────────────────────────
//
function buildEmbeds(chart) {
  return chart.map(v => ({
    title: `#${v.rank} ${v.title}`,
    image: { url: v.thumbnail },
    description:
      `${v.signal}\n` +
      `🎬 Music Video Chart\n` +
      `👤 ${v.channel}\n` +
      `👁️ ${v.views.toLocaleString()} views`
  }));
}

async function sendToDiscord(chart) {
  const embeds = buildEmbeds(chart);

  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "🏆 YouTube Music Video Chart (US)",
      embeds
    })
  });
}

//
// ─────────────────────────────
// 7. MAIN PIPELINE
// ─────────────────────────────
//
async function main() {
  const raw = await fetchMusicVideos();

  const baseChart = buildChart(raw);

  const previous = loadPrevious();

  const finalChart = applySignals(baseChart, previous);

  await sendToDiscord(finalChart);

  saveCurrent(baseChart);

  console.log("✅ Music Video Chart updated");
}

main();
