// 공통 유틸 (Vercel 함수에서 import)
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export async function fetchText(url, { encoding = 'utf-8', headers = {}, timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9', ...headers }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    const buf = await r.arrayBuffer();
    return new TextDecoder(encoding).decode(buf);
  } finally { clearTimeout(t); }
}

export async function fetchJSON(url, opts) {
  return JSON.parse(await fetchText(url, opts));
}

export function send(res, status, body, cacheSeconds = 0, swr = 0) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (cacheSeconds) res.setHeader('Cache-Control', `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${swr || cacheSeconds * 4}`);
  else res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

export const toNum = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
