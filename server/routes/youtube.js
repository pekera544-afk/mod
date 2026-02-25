const router = require('express').Router();
const https = require('https');

const INVIDIOUS_INSTANCES = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://invidious.privacyredirect.com',
  'https://yt.cdaut.de',
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); });
  });
}

async function searchYouTube(query) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = base + '/api/v1/search?q=' + encodeURIComponent(query) + '&type=video&fields=videoId,title,author,lengthSeconds,viewCount,publishedText,videoThumbnails';
      const results = await fetchJson(url);
      if (Array.isArray(results) && results.length > 0) return results;
    } catch {}
  }
  throw new Error('Tum Invidious instancelari basarisiz');
}

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const results = await searchYouTube(q);
    const videos = results.slice(0, 20).map(function(v) {
      return {
        videoId: v.videoId,
        title: v.title,
        author: v.author,
        duration: v.lengthSeconds,
        views: v.viewCount,
        published: v.publishedText,
        thumbnail: (v.videoThumbnails && (v.videoThumbnails[3] || v.videoThumbnails[0]) && (v.videoThumbnails[3] || v.videoThumbnails[0]).url) || ('https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg'),
      };
    });
    res.json(videos);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

module.exports = router;
