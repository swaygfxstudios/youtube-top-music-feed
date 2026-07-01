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
// 3. VIDEO VIRAL SCORE
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
// 4. BUILD CHART (TOP 10 ENGINE)
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
// 6. MAIN DISCORD EMBEDS
// ─────────────────────────────
//
function buildMainEmbeds(chart) {
  return chart.map(v => ({
    title: `#${v.rank} ${v.title}`,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    image: { url: v.thumbnail },
    description:
      `${v.signal}\n` +
      `🎬 Weekly Music Video Chart\n` +
      `👤 ${v.channel}\n` +
      `👁️ ${v.views.toLocaleString()} views`
  }));
}

//
// ─────────────────────────────
// 7. BRAND FOOTER CARD (SUBTLE SIGNATURE)
// ─────────────────────────────
//
function buildBrandEmbed() {
  return {
    title: `Powered by ${BRAND_NAME}`,
    url: BRAND_URL,
    thumbnail: {
      url: "https://yt3.googleusercontent.com/ytc/AIdxxxx_default_profile_image" 
      // NOTE: replace this with your actual profile image URL if you want it cleaner
    },
    description:
      "Music Video Intelligence System\n" +
      "Designed & operated by SWAYGFX•STUDIOS®\n\n" +
      "—"
  };
}

//
// ─────────────────────────────
// 8. DISCORD SENDER
// ─────────────────────────────
//
async function sendToDiscord(chart) {
  const embeds = [
    ...buildMainEmbeds(chart),
    buildBrandEmbed()
  ];

  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "🏆 Weekly YouTube Music Video Chart (US)",
      embeds
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

    console.log("✅ Weekly chart + brand card published");

  } catch (err) {
    console.log("❌ SYSTEM ERROR:", err.message);
    process.exit(1);
  }
}

main();