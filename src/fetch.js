const API_KEY = process.env.YOUTUBE_API_KEY;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

// 1. Fetch YouTube Music Chart
async function fetchMusic() {
  const url =
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics` +
    `&chart=mostPopular&videoCategoryId=10&regionCode=US&maxResults=10&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items;
}

// 2. Format for Discord
function formatChart(items) {
  return items.map((v, i) => {
    const title = v.snippet.title;
    const channel = v.snippet.channelTitle;
    const views = Number(v.statistics.viewCount).toLocaleString();

    return `${i + 1}. ${title} — ${channel} (${views} views)`;
  }).join("\n");
}

// 3. Send to Discord
async function sendToDiscord(message) {
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: message
    })
  });
}

// 4. Main execution
async function main() {
  const items = await fetchMusic();

  const chart = formatChart(items);

  const message =
`🏆 YouTube Music Chart (US)

${chart}

🔄 Auto-updated via GitHub Actions`;

  await sendToDiscord(message);

  console.log("Chart posted to Discord");
}

main();
