const fs = require("fs");

function run() {
  const videos = [
    {
      title: "Top Music Video 1",
      id: "demo1"
    },
    {
      title: "Top Music Video 2",
      id: "demo2"
    },
    {
      title: "Top Music Video 3",
      id: "demo3"
    }
  ];

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
