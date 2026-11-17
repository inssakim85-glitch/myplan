// 공모주 청약 일정 자동 수집: /api/ipo
// 출처: 38커뮤니케이션 공모주 청약일정(공개 페이지, 비공식). 6시간 캐시.
import { fetchText, send, toNum } from './_util.js';

const BASE = 'https://www.38.co.kr';
const ENC = 'euc-kr';

const strip = (s) => String(s || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();

const kst = () => new Date(Date.now() + 9 * 3600e3);
const ymd = (d) => d.toISOString().slice(0, 10);
const dot2dash = (s) => (s ? s.replace(/\./g, '-') : null);

function parseRange(text) {
  const m = String(text).match(/(\d{4})\.(\d{2})\.(\d{2})\s*~\s*(?:(\d{4})\.)?(\d{2})\.(\d{2})/);
  if (!m) return null;
  let y2 = m[4] ? +m[4] : +m[1];
  if (!m[4] && +m[5] < +m[2]) y2 += 1; // 연말 → 연초로 넘어가는 경우
  return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${y2}-${m[5]}-${m[6]}` };
}

export function parseList(html) {
  const i = html.indexOf('summary="공모주 청약일정"');
  if (i < 0) throw new Error('청약일정 표를 찾지 못했습니다');
  const tbl = html.slice(i, html.indexOf('</table>', i));
  const rows = tbl.split(/<tr[\s>]/i).slice(1);
  const out = [];
  for (const r of rows) {
    const cells = r.split(/<td\b/i).slice(1).map((c) => strip(c.slice(c.indexOf('>') + 1)));
    if (cells.length < 6) continue;
    const range = parseRange(cells[1]);
    if (!range) continue;
    const no = (r.match(/[?&;]no=(\d+)/) || [])[1] || null;
    let name = cells[0];
    let market = '코스닥';
    if (/\(유가\)/.test(name)) { market = '코스피'; name = name.replace(/\(유가\)/, '').trim(); }
    if (/스팩/.test(name)) market = market === '코스피' ? '코스피' : '코스닥';
    const band = (cells[3].match(/([\d,]+)\s*~\s*([\d,]+)/) || []);
    out.push({
      no, name, market,
      subStart: range.start, subEnd: range.end,
      price: toNum(cells[2]) || null,
      bandLow: toNum(band[1]) || null, bandHigh: toNum(band[2]) || null,
      subComp: /:\s*1/.test(cells[4]) ? cells[4] : null,
      leads: cells[5].split(',').map((s) => s.trim()).filter(Boolean),
    });
  }
  return out;
}

export function parseDetail(html) {
  const t = strip(html);
  const g = (re) => { const m = t.match(re); return m ? m[1] : null; };
  const date = (re) => dot2dash(g(re));
  const demand = parseRange(g(/수요예측일\s+([\d.]+\s*~\s*[\d.]+)/) || '');
  return {
    code: g(/종목코드\s+([0-9A-Z]{6})/),
    market: g(/시장구분\s+(코스닥|유가증권|거래소|코넥스|코스피)/),
    demandStart: demand ? demand.start : null,
    demandEnd: demand ? demand.end : null,
    refundDate: date(/환불일\s+(\d{4}\.\d{2}\.\d{2})/),
    listDate: date(/상장일\s+(\d{4}\.\d{2}\.\d{2})/),
    price: toNum(g(/확정공모가\s+([\d,]+)\s*원/)) || null,
    instComp: g(/기관경쟁률\s+([\d,.]+\s*:\s*1)/),
    lockup: g(/의무보유확약\s+([\d.]+\s*%)/),
    depositRate: toNum(g(/청약증거금율\s*:\s*(\d+)\s*%/)) || null,
    industry: g(/업종\s+(.+?)\s+대표자/),
  };
}

// 신규상장 일정(o=nw): 이름 → 상장일
export function parseNewListings(html) {
  const i = html.indexOf('summary="신규상장종목"');
  if (i < 0) return {};
  const tbl = html.slice(i, html.indexOf('</table>', i));
  const map = {};
  for (const r of tbl.split(/<tr[\s>]/i).slice(1)) {
    const cells = r.split(/<td\b/i).slice(1).map((c) => strip(c.slice(c.indexOf('>') + 1)));
    if (cells.length < 2) continue;
    const m = cells[1].match(/(\d{4})\/(\d{2})\/(\d{2})/);
    if (!m) continue;
    map[normName(cells[0])] = `${m[1]}-${m[2]}-${m[3]}`;
  }
  return map;
}
const normName = (s) => String(s || '').replace(/\(유가\)/g, '').replace(/\s+/g, '').trim();

// 청약 마감일 + 2영업일 (공휴일은 반영하지 못함 → 예상치)
function addBizDays(ds, n) {
  const d = new Date(ds + 'T00:00:00Z');
  while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n--; }
  return d.toISOString().slice(0, 10);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  try {
    const [html, nwHtml] = await Promise.all([
      fetchText(`${BASE}/html/fund/index.htm?o=k`, { encoding: ENC, headers: { Referer: BASE + '/' } }),
      fetchText(`${BASE}/html/fund/index.htm?o=nw`, { encoding: ENC, headers: { Referer: BASE + '/' } }).catch(() => ''),
    ]);
    const list = parseList(html);
    const listDates = nwHtml ? parseNewListings(nwHtml) : {};
    const today = ymd(kst());
    const from = ymd(new Date(kst().getTime() - 21 * 864e5)); // 3주 전 마감분까지
    const recent = list.filter((x) => x.subEnd >= from);
    // 상세 페이지는 요청이 몰리면 빈 응답을 주므로, 청약이 가까운 종목만 순차로 천천히 조회
    const near = recent.filter((x) => x.no && x.subEnd >= ymd(new Date(kst().getTime() - 3 * 864e5)) && x.subStart <= ymd(new Date(kst().getTime() + 21 * 864e5))).slice(0, 10);
    const details = {};
    for (const x of near) {
      try {
        const h = await fetchText(`${BASE}/html/fund/?o=v&no=${x.no}`, { encoding: ENC, headers: { Referer: `${BASE}/html/fund/index.htm?o=k` }, timeout: 5000 });
        if (h && h.length > 1000) details[x.no] = parseDetail(h);
      } catch (e) { /* 건너뜀 */ }
      await sleep(350);
    }
    const items = recent.map((x) => {
      const d = (x.no && details[x.no]) || {};
      const market = d.market ? (/유가|거래소|코스피/.test(d.market) ? '코스피' : d.market) : x.market;
      const listDate = d.listDate || listDates[normName(x.name)] || null;
      const refundDate = d.refundDate || addBizDays(x.subEnd, 2);
      return {
        id: '38-' + (x.no || normName(x.name)),
        src: '38커뮤니케이션',
        srcUrl: x.no ? `${BASE}/html/fund/?o=v&no=${x.no}` : `${BASE}/html/fund/index.htm?o=k`,
        name: x.name, code: d.code || null, market,
        subStart: x.subStart, subEnd: x.subEnd,
        refundDate, refundEst: !d.refundDate,
        listDate,
        price: x.price || d.price || null, bandLow: x.bandLow, bandHigh: x.bandHigh,
        leads: x.leads, subComp: x.subComp, instComp: d.instComp || null, lockup: d.lockup || null,
        depositRate: d.depositRate || 50, industry: d.industry || null,
        state: x.subStart > today ? '예정' : x.subEnd >= today ? '청약중' : '마감',
      };
    }).sort((a, b) => a.subStart.localeCompare(b.subStart));
    send(res, 200, { updatedAt: new Date().toISOString(), source: '38커뮤니케이션', detailCount: Object.keys(details).length, items }, 21600, 86400);
  } catch (e) {
    send(res, 502, { error: '공모주 일정을 가져오지 못했습니다', detail: String(e.message || e) });
  }
}
