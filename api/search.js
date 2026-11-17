// 종목명 → 종목코드 검색: /api/search?q=삼성전자
import { fetchJSON, send } from './_util.js';

export default async function handler(req, res) {
  const q = String(req.query.q || '').trim().slice(0, 40);
  if (!q) return send(res, 400, { error: 'q 파라미터가 필요합니다' });
  try {
    const j = await fetchJSON(`https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock`, { headers: { Referer: 'https://m.stock.naver.com/' } });
    const items = (j.items || [])
      .filter((it) => it && it.code && /^[0-9A-Z]{6}$/.test(it.code) && (!it.nationCode || it.nationCode === 'KOR'))
      .slice(0, 10)
      .map((it) => ({ code: it.code, name: it.name, market: it.typeName || it.typeCode || '' }));
    send(res, 200, { items }, 86400);
  } catch (e) {
    send(res, 502, { error: '종목 검색에 실패했습니다', detail: String(e.message || e) });
  }
}
