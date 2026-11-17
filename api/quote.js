// 국내 주식 현재가 조회: /api/quote?codes=005930,000660
// 출처: 네이버 증권 공개 시세(비공식). 장중 실시간에 가깝고, 장 마감 후에는 종가.
import { fetchJSON, send, toNum } from './_util.js';

const CODE_RE = /^[0-9A-Z]{6}$/;

async function fromPolling(codes) {
  const j = await fetchJSON(`https://polling.finance.naver.com/api/realtime/domestic/stock/${codes.join(',')}`, {
    headers: { Referer: 'https://m.stock.naver.com/' },
  });
  const out = {};
  for (const d of j.datas || []) {
    const code = d.itemCode || d.reutersCode;
    const price = toNum(d.closePrice);
    if (!code || !price) continue;
    out[code] = {
      name: d.stockName || '',
      price,
      change: toNum(d.compareToPreviousClosePrice),
      rate: toNum(d.fluctuationsRatio),
      status: d.marketStatus || '',
    };
  }
  return out;
}

async function fromBasic(code) {
  const d = await fetchJSON(`https://m.stock.naver.com/api/stock/${code}/basic`, { headers: { Referer: 'https://m.stock.naver.com/' } });
  const price = toNum(d.closePrice);
  if (!price) return null;
  return { name: d.stockName || '', price, change: toNum(d.compareToPreviousClosePrice), rate: toNum(d.fluctuationsRatio), status: d.marketStatus || '' };
}

export default async function handler(req, res) {
  const codes = [...new Set(String(req.query.codes || '').toUpperCase().split(',').map((s) => s.trim()).filter((s) => CODE_RE.test(s)))].slice(0, 60);
  if (!codes.length) return send(res, 400, { error: 'codes 파라미터가 필요합니다 (예: 005930,000660)' });
  let prices = {};
  const errors = [];
  try { prices = await fromPolling(codes); } catch (e) { errors.push(String(e.message || e)); }
  const missing = codes.filter((c) => !prices[c]);
  await Promise.all(missing.map(async (c) => {
    try { const p = await fromBasic(c); if (p) prices[c] = p; } catch (e) { errors.push(`${c}: ${e.message || e}`); }
  }));
  send(res, 200, { at: new Date().toISOString(), prices, missing: codes.filter((c) => !prices[c]), errors: errors.slice(0, 5) }, 60, 300);
}
