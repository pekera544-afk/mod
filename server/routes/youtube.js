const router = require('express').Router();
const https = require('https');

// YouTube InnerTube API - YouTube'un kendi internal API'si, key gerektirmez
function ytSearch(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20231121.08.00',
          hl: 'tr',
          gl: 'TR',
        },
      },
      query: query,
      params: 'EgIQAQ%3D%3D', // videos only filter
    });

    const options = {
      hostname: 'www.youtube.com',
      path: '/youtubei/v1/search?prettyPrint=false',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20231121.08.00',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        Origin: 'https://www.youtube.com',
        Referer: 'https://www.youtube.com/',
      },
      timeout: 12000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error('JSON parse failed: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

function parseResults(json) {
  const videos = [];
  try {
    const sections = json?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item?.videoRenderer;
        if (!v || !v.videoId) continue;

        const title = v.title?.runs?.[0]?.text || '';
        const author = v.ownerText?.runs?.[0]?.text || '';
        const durationText = v.lengthText?.simpleText || '';
        const viewText = v.viewCountText?.simpleText || '';
        const videoId = v.videoId;
        const thumbnail = 'https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg';

        // Parse duration string "4:32" or "1:23:45" -> seconds
        let durationSec = 0;
        if (durationText) {
          const parts = durationText.split(':').map(Number);
          if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
          else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        videos.push({
          videoId,
          title,
          author,
          duration: durationSec,
          durationText,
          views: viewText,
          published: v.publishedTimeText?.simpleText || '',
          thumbnail,
        });

        if (videos.length >= 20) break;
      }
      if (videos.length >= 20) break;
    }
  } catch (e) {
    console.error('[YouTube search] Parse error:', e.message);
  }
  return videos;
}

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    console.log('[YouTube search] Searching:', q);
    const json = await ytSearch(q);
    const videos = parseResults(json);
    console.log('[YouTube search] Found:', videos.length, 'results');
    if (videos.length === 0) {
      return res.status(503).json({ error: 'Sonuc bulunamadi veya servis yanit vermedi' });
    }
    res.json(videos);
  } catch (err) {
    console.error('[YouTube search] Error:', err.message);
    res.status(503).json({ error: 'Arama servisi gecici olarak kullanilamiyor: ' + err.message });
  }
});

module.exports = router;
