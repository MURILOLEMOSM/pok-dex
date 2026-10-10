// Lê título e imagem (capa) de qualquer link, no servidor do Netlify (sem CORS, sem login).
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' };
  const url = event.queryStringParameters && event.queryStringParameters.url;
  if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'faltou url' }) };
  try {
    let html = '', finalUrl = url;
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; pokedexbot/1.0)' } });
      finalUrl = r.url || url;
      html = await r.text();
    } catch (e) {}
    let title = null, image = null, author = null;
    let endpoint = null;
    if (/youtube\.com|youtu\.be/.test(finalUrl)) endpoint = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(finalUrl);
    else if (/tiktok\.com/.test(finalUrl)) endpoint = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(finalUrl);
    else if (/vimeo\.com/.test(finalUrl)) endpoint = 'https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(finalUrl);
    if (endpoint) {
      try {
        const o = await fetch(endpoint);
        if (o.ok) { const d = await o.json(); title = d.title || null; image = d.thumbnail_url || null; author = d.author_name || null; }
      } catch (e) {}
    }
    if (!image && /youtube\.com|youtu\.be/.test(finalUrl)) {
      const m = finalUrl.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
      if (m) image = 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg';
    }
    if (!image && /github\.com/.test(finalUrl)) {
      const m = finalUrl.match(/github\.com\/([^\/#?]+)\/([^\/#?]+)/);
      if (m) image = 'https://opengraph.githubassets.com/1/' + m[1] + '/' + m[2].replace(/\.git$/, '');
    }
    const meta = (prop) => {
      const re1 = new RegExp('<meta[^>]+(?:property|name)=["\\\']' + prop + '["\\\'][^>]+content=["\\\']([^"\\\']+)', 'i');
      const re2 = new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+(?:property|name)=["\\\']' + prop + '["\\\']', 'i');
      const mm = html.match(re1) || html.match(re2);
      return mm ? decode(mm[1]) : null;
    };
    if (!title) title = meta('og:title') || meta('twitter:title') || (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || null;
    if (!image) image = meta('og:image') || meta('twitter:image') || meta('og:image:url');
    if (!author) author = meta('og:site_name');
    if (title) title = decode(title).trim().slice(0, 140);
    return { statusCode: 200, headers, body: JSON.stringify({ title, image, author, finalUrl }) };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: String(e) }) };
  }
};
function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'");
}
