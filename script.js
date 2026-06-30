async function getVideos() {
  return [
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
}
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
