const API_KEY = process.env.YOUTUBE_API_KEY;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

//
// 1. FETCH DATA
//
async function fetchMusic() {
  const url =
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics` +
    `&chart=mostPopular&videoCategoryId=10&regionCode=US&maxResults=20&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items || [];
}

//
// 2. GENRE DETECTION (simple tagging system)
//
function detectGenre(title) {
  const t = title.toLowerCase();

  if (t.includes("drill")) return "Drill";
  if (t.includes("afro") || t.includes("afrobeats")) return "Afrobeats";
  if (t.includes("remix")) return "Remix";
  if (t.includes("live")) return "Live";
  if (t.includes("official")) return "Mainstream";

  return "Music";
}

//
// 3. TRANSFORM + RANKING (THIS is your chart engine)
//
function buildChart(items) {
  return items
    .map(v => ({
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.medium?.url,
      views: Number(v.statistics.viewCount || 0),
      genre: detectGenre(v.snippet.title),
      publishedAt: v.snippet.publishedAt
    }))
    .sort((a, b) => b.views - a.views) // REAL ranking system
    .slice(0, 10); // enforce Top 10
}

//
// 4. DISCORD EMBED FORMAT (modern Billboard style)
//
function buildEmbeds(chart) {
  return chart.map((v, i) => ({
    title: `#${i + 1} ${v.title}`,
    url: null,
    image: { url: v.thumbnail },
    description:
      `🎧 Genre: **${v.genre}**\n` +
      `👤 ${v.channel}\n` +
      `👁️ ${v.views.toLocaleString()} views`
  }));
}

//
// 5. SEND TO DISCORD
//
async function sendToDiscord(chart) {
  const embeds = buildEmbeds(chart);

  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "🏆 **YouTube Music Chart (Top 10 US)**",
      embeds: embeds
    })
  });
}

//
// 6. MAIN PIPELINE (runs in GitHub Actions)
//
async function main() {
  const items = await fetchMusic();

  const chart = buildChart(items);

  await sendToDiscord(chart);

  console.log("✅ Chart posted successfully");
}

main();
