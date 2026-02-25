const router = require('express').Router();
const axios = require('axios');

const INVIDIOUS_INSTANCES = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://yt.cdaut.de',
  'https://invidious.privacyredirect.com',
  'https://invidious.protokolla.fi',
];

async function searchYouTube(query) {
  let lastErr = null;
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = base + '/api/v1/search?q=' + encodeURIComponent(query) + '&type=video&fields=videoId,title,author,lengthSeconds,viewCount,publishedText,videoThumbnails';
      const { data } = await axios.get(url, { timeout: 7000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Tum instancelar basarisiz');
}

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const results = await searchYouTube(q);
    const videos = results.slice(0, 20).map(function(v) {
      const thumb = v.videoThumbnails && v.videoThumbnails.length > 0
        ? (v.videoThumbnails.find(t => t.quality === 'medium') || v.videoThumbnails[0]).url
        : 'https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg';
      const thumbUrl = thumb && thumb.startsWith('/') ? 'https://inv.tux.pizza' + thumb : thumb;
      return {
        videoId: v.videoId,
        title: v.title,
        author: v.author,
        duration: v.lengthSeconds,
        views: v.viewCount,
        published: v.publishedText,
        thumbnail: thumbUrl,
      };
    });
    res.json(videos);
  } catch (err) {
    console.error('[YouTube search]', err.message);
    res.status(503).json({ error: 'Arama servisi gecici olarak kullanilamiyor', details: err.message });
  }
});

module.exports = router;
