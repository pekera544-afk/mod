const router = require('express').Router();
const axios = require('axios');

// Piped instances (more reliable than Invidious for search)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://piped-api.garudalinux.org',
];

// Invidious fallback
const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://yt.cdaut.de',
];

async function searchViaPiped(query) {
  for (const base of PIPED_INSTANCES) {
    try {
      const { data } = await axios.get(base + '/search', {
        params: { q: query, filter: 'videos' },
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return data.items.filter(v => v.type === 'stream' || v.url).map(v => {
          const videoId = (v.url || '').replace('/watch?v=', '');
          return {
            videoId,
            title: v.title,
            author: v.uploaderName || v.channel || '',
            duration: v.duration || 0,
            views: v.views || 0,
            published: v.uploadedDate || '',
            thumbnail: v.thumbnail || ('https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg'),
          };
        }).filter(v => v.videoId);
      }
    } catch (e) {
      console.log('[YouTube search] Piped ' + base + ' failed:', e.message);
    }
  }
  return null;
}

async function searchViaInvidious(query) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const { data } = await axios.get(base + '/api/v1/search', {
        params: { q: query, type: 'video' },
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (Array.isArray(data) && data.length > 0) {
        return data.map(v => {
          const thumb = v.videoThumbnails && v.videoThumbnails.length > 0
            ? (v.videoThumbnails.find(t => t.quality === 'medium') || v.videoThumbnails[0]).url || ''
            : '';
          const thumbUrl = thumb.startsWith('/') ? base + thumb : thumb || ('https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg');
          return {
            videoId: v.videoId,
            title: v.title,
            author: v.author || '',
            duration: v.lengthSeconds || 0,
            views: v.viewCount || 0,
            published: v.publishedText || '',
            thumbnail: thumbUrl,
          };
        });
      }
    } catch (e) {
      console.log('[YouTube search] Invidious ' + base + ' failed:', e.message);
    }
  }
  return null;
}

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    // Try Piped first (more reliable)
    let results = await searchViaPiped(q);
    // Fallback to Invidious
    if (!results || results.length === 0) {
      results = await searchViaInvidious(q);
    }
    if (!results || results.length === 0) {
      return res.status(503).json({ error: 'Arama servisi gecici olarak kullanilamiyor. Lutfen tekrar deneyin.' });
    }
    res.json(results.slice(0, 20));
  } catch (err) {
    console.error('[YouTube search] Fatal:', err.message);
    res.status(503).json({ error: 'Arama servisi hata verdi', details: err.message });
  }
});

module.exports = router;
