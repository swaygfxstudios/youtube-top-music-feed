const fs = require("fs");

async function run() {
  // TEMP DATA (we replace this with real YouTube data next step)
  const videos = [
    {
      title: "Top Music Video 1",
      id: "video1"
    },
    {
      title: "Top Music Video 2",
      id: "video2"
    },
    {
      title: "Top Music Video 3",
      id: "video3"
    }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>YouTube Top Music Videos</title>
<link>https://www.youtube.com</link>
<description>Auto-generated music feed</description>
`;

  videos.forEach(video => {
    xml += `
<item>
<title><![CDATA[${video.title}]]></title>
<link>https://www.youtube.com/watch?v=${video.id}</link>
<guid>${video.id}</guid>
</item>`;
  });

  xml += `
</channel>
</rss>`;

  fs.writeFileSync("feed.xml", xml);
}

run();
