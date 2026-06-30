const fs = require("fs");

async function getVideos() {
  const res = await fetch("https://rsshub.app/youtube/charts/TopVideos/us");
  const text = await res.text();

  const videoRegex = /watch\?v=([a-zA-Z0-9_-]{11})/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/g;

  let ids = [];
  let titles = [];

  let match;

  while ((match = videoRegex.exec(text)) !== null) {
    ids.push(match[1]);
  }

  while ((match = titleRegex.exec(text)) !== null) {
    titles.push(match[1]);
  }

  const videos = [];

  for (let i = 0; i < Math.min(10, ids.length); i++) {
    videos.push({
      title: titles[i] || "YouTube Music",
      id: ids[i]
    });
  }

  return videos;
}

async function run() {
  const videos = await getVideos();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>YouTube Top Music Videos</title>
<link>https://www.youtube.com</link>
<description>Auto-generated feed</description>
`;

  for (const v of videos) {
    xml += `
<item>
<title><![CDATA[${v.title}]]></title>
<link>https://www.youtube.com/watch?v=${v.id}</link>
<guid>${v.id}</guid>
</item>`;
  }

  xml += `
</channel>
</rss>`;

  fs.writeFileSync("feed.xml", xml);
}

run();
