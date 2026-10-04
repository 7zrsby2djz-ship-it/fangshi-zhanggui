(() => {
'use strict';
/* ================= data ================= */
const D = __GAME_DATA__;
const M = D.meta, IT = D.items, NP = D.npcs, PL = D.places, NEWS = D.news.news;
const DEALS = {}; D.deals.forEach(d => { DEALS[d.id] = d; });
const IN = D.intel || {}, ACC = D.accuse || [];
const MON = () => (S && S.month) || 1;
const inMonth = x => x.month === 'all' || (x.month || 1) === MON();
const MD = () => ({ marketDay: M.marketDay, dues: M.dues, duesHigh: M.duesHigh, ...((M.months || {})[MON()] || {}) });
const LAST_MONTH = Math.max(1, ...D.deals.map(d => typeof d.month === 'number' ? d.month : 1));
const MONTH_CN = ['', '一', '二', '三', '四', '五', '六'];
const monthLabel = m => '第' + MONTH_CN[m || 1] + '個月';
const dayLabel = (day, m) => ((m || 1) !== MON() ? '上個月' : '') + (M.dayNames[day - 1] || '');
const countedIds = () => D.deals.filter(d => !['d13', 'd14', 'm218', 'm220'].includes(d.id) && !d.extra && (d.month === 'all' ? MON() === 1 : inMonth(d))).map(d => d.id);
const SAVE_KEY = 'fangshi-rework-v2';
const SLOT = ['上午', '中午', '下午'];
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const lvName = n => n <= 9 ? `煉氣${CN[n]}層` : (['築基初期', '築基中期', '築基後期'][n - 10] || '深不可測');
const PUBLIC_VERIFY = ['bai', 'tie', 'ge'];
const TEA = { 1: 3, 2: 4, 3: 6 };

/* ================= ink icons (48×48, currentColor ink; accents use theme vars) ================= */
const CIN = 'stroke="var(--cinnabar)"', JADE = 'stroke="var(--jade)"', GOLD = 'stroke="var(--gold)"';
const ICON = {
  cover_steel_buckle: `<path d="M13 12v20q11 10 22 0V12h-6v17q-5 4-10 0V12z"/><circle cx="16" cy="16" r="1"/><circle cx="32" cy="16" r="1"/>`,
  jug_frame_sleeve: `<path d="M10 13h12v25H10zM27 13h12v25H27zM10 20h12M27 20h12M14 13v-4h4v4M31 13v-4h4v4"/>`,
  sample_tool_set: `<path d="M8 10l9 29M12 9l9 29M27 15h14v25H27zM29 10h10v5M25 22h18M25 33h18"/>`,
  dry_mint_leaf: `<path d="M13 37c2-9 7-17 20-27 3 13-1 26-12 29-4 1-7 0-8-2z"/><path d="M13 37l18-23M19 30l-1-8M24 24l7 1" stroke-width="1.2"/>`,
  chiyan: `<path d="M24 41V13"/><path d="M24 23C17 21 13 16 12 9c6 1 11 5 12 14z"/><path d="M24 30c7-2 11-7 12-13-6 1-11 5-12 13z"/><path d="M24 13c-3-4-2-8 0-10 2 2 3 6 0 10z"/><path d="M24 41l-5 4M24 41v5M24 41l5 4"/><path d="M15 12l7 8M33 20l-7 6" ${GOLD} stroke-width="1.2"/>`,
  dingshen: `<path d="M12 34h24"/><path d="M14 34h20l-3 8H17z"/><path d="M24 34V15"/><circle cx="24" cy="14" r="1.6" fill="var(--cinnabar)" stroke="none"/><path d="M24 11c-3-3 3-5 0-8"/><path d="M28 12c3-3-1-5 2-8" stroke-width="1.2" opacity=".55"/>`,
  bishui: `<rect x="15" y="5" width="18" height="38" rx="1"/><path d="M20 11h8M24 11v19M19 18c3-2 7 2 10 0M20 25c3-2 6 2 8 0M21 34l3 4 3-4" ${CIN}/>`,
  langya: `<path d="M18 6c-1 12 2 26 12 37 1-9 1-23-2-37z"/><path d="M18 9c4 2 7 2 10 0"/><path d="M20 7v3M26 7v2.5" ${CIN} stroke-width="1.4"/>`,
  hantie: `<path d="M8 32l6-14 14-4 12 8-2 14-16 4z"/><path d="M14 18l8 8 6-12M22 26v14M22 26l18-4" stroke-width="1.2"/><path d="M29 26l5-2M30 31l5-2" ${JADE} stroke-width="1.4"/>`,
  liaoshang: `<path d="M20 15h8v4c6 2 9 7 9 12 0 7-6 11-13 11s-13-4-13-11c0-5 3-10 9-12z"/><path d="M19 9h10v6H19z" ${CIN}/><rect x="19" y="27" width="10" height="8" stroke-width="1.2"/>`,
  yangqi: `<path d="M8 34h32"/><path d="M8 34c6 6 26 6 32 0"/><circle cx="18" cy="29" r="4"/><circle cx="30" cy="29" r="4"/><circle cx="24" cy="21" r="4"/><circle cx="24" cy="21" r="1" fill="var(--jade)" stroke="none"/>`,
  xuechan: `<path d="M7 13h34v5H7z"/><rect x="9" y="18" width="30" height="21" rx="2"/><path d="M24 23v10M19.7 25.5l8.6 5M19.7 30.5l8.6-5" ${JADE}/><path d="M12 36l4-2-1 2 4-2" stroke-width="1"/>`,
  lingsui: `<path d="M10 30c-2-8 4-18 14-19s17 7 15 17-11 13-19 11c-6-1-9-4-10-9z"/><path d="M16 28c4-4 8 2 12-4 2-3 5-2 6-4" ${CIN}/><circle cx="15" cy="20" r=".8" fill="currentColor"/><circle cx="31" cy="33" r=".8" fill="currentColor"/>`,
  duanshui: `<path d="M13 36L36 8c3-2 5 0 3 3L16 39z"/><path d="M10 33l8 8"/><path d="M13 38l-7 7" stroke-width="3.2"/><path d="M26 21l2 2-2 1 2 2" ${GOLD} stroke-width="1.5"/>`,
  duandao: `<path d="M15 34l19-20 4-2-2 4-19 19z"/><path d="M12 31l7 7"/><path d="M15 36l-7 7" stroke-width="3.2"/>`,
  yujian: `<rect x="14" y="7" width="20" height="35" rx="3"/><circle cx="24" cy="12" r="1.6"/><path d="M24 10c-4-5-8-5-10-7"/><path d="M19 19h10M19 25h10M19 31h10" stroke-dasharray="1 3" opacity=".5"/>`,
  zhuji: `<circle cx="24" cy="21" r="7"/><path d="M12 15a14 14 0 0 1 24 0M10 23a14 14 0 0 0 4 8M38 23a14 14 0 0 1-4 8" ${GOLD} stroke-width="1.2" stroke-dasharray="2 3"/><path d="M24 28v7"/><path d="M14 35h20l-3 7H17z"/>`,
  hudeng: `<path d="M24 3v6M18 9h12"/><path d="M17 12c-3 6-3 14 0 20h14c3-6 3-14 0-20z"/><path d="M18 12h12M18 32h12"/><path d="M24 12v20" stroke-width="1" opacity=".5"/><path d="M24 27c-2-2-1-5 0-6 1 1 2 4 0 6z" ${CIN}/><path d="M24 32c-2 6 2 8-2 14 6-3 7-9 4-14"/>`,
  zhangce: `<path d="M10 8h24v34H10z"/><path d="M10 14h4M10 22h4M10 30h4M10 38h4"/><rect x="20" y="12" width="8" height="15" stroke-width="1.2"/><path d="M34 29l3 2-2 3 3 2-2 3 2 2" stroke-width="1.3"/>`,
  zhangye: `<path d="M12 9l3-3 3 2 3-2 3 2 3-2 3 2 3-2 3 2v33H12z"/><path d="M31 13v22M26 13v26M21 13v16" stroke-width="1.1"/><circle cx="18" cy="36" r="3" ${CIN}/>`,
  jiansui: `<path d="M24 4c-4 0-4 5 0 5s4-5 0-5zM24 9v5"/><path d="M24 14c-6 0-6 6 0 6s6-6 0-6zM20 17h8"/><path d="M21 20l-3 18M23 20l-1 19M25 20l1 19M27 20l3 18"/><path d="M17 39c3 5 11 5 14 0" stroke-width="3" opacity=".75"/>`,
  yupai: `<path d="M24 3v7"/><path d="M14 10h20v24l-10 10-10-10z"/><path d="M24 17v14M18 21l12 6M18 27l12-6" ${JADE}/>`,
  dangpiao: `<rect x="9" y="7" width="30" height="35" rx="1"/><path d="M15 14h18M15 20h18M15 26h10"/><rect x="25" y="29" width="9" height="9" ${CIN}/>`,
  box: `<path d="M7 18h34v22H7z"/><path d="M7 18l4-8h26l4 8"/><rect x="21" y="18" width="6" height="7"/><path d="M7 30h34" stroke-width="1"/>`,
  pkg: `<path d="M8 20l16-8 16 8v16l-16 8-16-8z"/><path d="M8 20l16 8 16-8M24 28v16"/><path d="M16 16l16 8" stroke-width="1"/><circle cx="24" cy="28" r="3" fill="var(--cinnabar)" stroke="none"/>`,
  mask: `<path d="M10 14c4-6 24-6 28 0 2 10-4 22-14 26-10-4-16-16-14-26z"/><path d="M15 20c2-3 6-3 7 1-3 2-5 2-7-1zM33 20c-2-3-6-3-7 1 3 2 5 2 7-1z"/><path d="M19 32l2 3 2-3M25 32l2 3 2-3"/><path d="M14 13l6 3M34 13l-6 3" ${CIN}/>`,
  info: `<path d="M9 12h30v24H9z"/><path d="M9 12l15 13 15-13"/><path d="M30 31l5 5" ${CIN}/>`,
  luopan: `<circle cx="24" cy="25" r="16"/><circle cx="24" cy="25" r="10" stroke-width="1.1"/><path d="M24 15l3 10-3 10-3-10z"/><path d="M24 15l3 10h-6z" fill="var(--cinnabar)" stroke="none"/><circle cx="24" cy="25" r="1.6" fill="currentColor" stroke="none"/><path d="M24 7v2M24 41v2M6 25h2M40 25h2" stroke-width="1.2"/>`,
  yaopai: `<path d="M24 3v5"/><rect x="14" y="8" width="20" height="30" rx="4"/><path d="M14 38l10 6 10-6"/><path d="M19 16c3-2 7 2 10 0M19 22c3-2 7 2 10 0" ${JADE}/><path d="M22 29h4v5h-4z" stroke-width="1.2"/>`,
  sidai: `<path d="M14 18c-4 6-5 15-1 21 3 4 19 4 22 0 4-6 3-15-1-21z"/><path d="M14 18c4-3 16-3 20 0"/><path d="M18 15l-2-5M30 15l2-5M16 10c4 2 12 2 16 0" stroke-width="1.3"/><path d="M20 22l1 2M24 21l1 2M28 22l1 2" stroke-width="1" stroke-dasharray="1 2"/><path d="M22 34h4" ${CIN}/>`,
  canye: `<path d="M10 10h22l6 6v26H10z"/><path d="M32 10v6h6"/><path d="M30 20v18M25 20v18M20 20v14" stroke-width="1.1"/><path d="M10 42l3-3 3 2 3-3 3 2" stroke-width="1.3"/><path d="M14 16h8" ${CIN}/>`,
  dues: `<rect x="7" y="10" width="34" height="28" rx="2"/><path d="M7 18h34M14 10v28M24 10v28M34 10v28" stroke-width="1.1"/><circle cx="14" cy="14" r="2"/><circle cx="24" cy="25" r="2"/><circle cx="34" cy="30" r="2"/><circle cx="14" cy="28" r="2"/>`
};
/* ----- ink portraits: one head per person, features swapped by expression ----- */
const FACES = ['neutral', 'smile', 'laugh', 'cold', 'angry', 'shock', 'sad', 'cry', 'uneasy', 'think', 'sweat', 'smug'];
function portrait(who, f = 'neutral', cls = '') {
  const L = who === 'me' ? { head: 'long', hair: 'messy', beard: 'stubble', age: 'mid' } : ((NP[who] || {}).look);
  if (!L) return '';
  if (!FACES.includes(f)) f = 'neutral';
  const P = [], A = (d, extra = '') => P.push(`<path d="${d}" ${extra}/>`);
  const head = { round: 'M19 34c0-10 6-17 13-17s13 7 13 17-6 18-13 18-13-8-13-18z', long: 'M20 33c0-11 5-17 12-17s12 6 12 17c0 11-5 20-12 20s-12-9-12-20z', square: 'M19 30c0-9 6-14 13-14s13 5 13 14v8c0 9-6 14-13 14s-13-5-13-14z', thin: 'M21 33c0-10 5-16 11-16s11 6 11 16-5 19-11 19-11-9-11-19z' }[L.head || 'round'];
  A('M13 64c2-7 9-11 19-11s17 4 19 11'); A('M27 53l5 5 5-5', 'stroke-width="1.3"');
  A(head, 'fill="var(--sheet)"');
  const hair = {
    topknot: 'M19 30c1-9 6-13 13-13s12 4 13 13c-4-5-9-7-13-7s-9 2-13 7zM29 17c0-3 1-5 3-5s3 2 3 5',
    bun: 'M19 32c0-10 6-15 13-15s13 5 13 15c-3-6-8-9-13-9s-10 3-13 9zM20 30c-3 4-3 12-1 16M44 30c3 4 3 12 1 16M38 16a5 5 0 1 0 0.1 0',
    bald: 'M25 21c2-1 4-1 5 0',
    hat: 'M17 26h30M20 26l2-9h20l2 9M24 17v-3h16v3',
    crown: 'M19 30c1-9 6-13 13-13s12 4 13 13c-4-5-9-7-13-7s-9 2-13 7zM27 16h10l-1-5h-8z',
    scarf: 'M18 31c0-11 6-16 14-16s14 5 14 16c-4-3-9-5-14-5s-10 2-14 5zM18 31c-1 6 0 12 2 16M46 31c1 6 0 12-2 16',
    messy: 'M19 31c0-9 5-14 13-14s13 5 13 14M19 27l3-6 2 4 3-7 3 5 3-6 3 5 3-4 2 5 3-1',
    veil: 'M17 30c0-11 7-16 15-16s15 5 15 16v20M17 30v20'
  }[L.hair || 'topknot'];
  if (hair) A(hair, L.hair === 'bun' ? 'fill="none"' : '');
  if (L.age === 'old') { A('M24 26h5M35 26h5', 'stroke-width="1" opacity=".6"'); A('M22 44c1 2 2 3 3 3M42 44c-1 2-2 3-3 3', 'stroke-width="1" opacity=".6"'); }
  // brows
  const BR = { neutral: ['M24 31h5', 'M35 31h5'], smile: ['M24 30q2.5-1.5 5 0', 'M35 30q2.5-1.5 5 0'], laugh: ['M24 29q2.5-2 5 0', 'M35 29q2.5-2 5 0'], cold: ['M24 32h5', 'M35 32h5'], angry: ['M24 29l5 3', 'M40 29l-5 3'], shock: ['M24 28q2.5-2.5 5 0', 'M35 28q2.5-2.5 5 0'], sad: ['M24 31l5-2', 'M40 31l-5-2'], cry: ['M24 31l5-2', 'M40 31l-5-2'], uneasy: ['M24 31q1.2-1.6 2.5 0t2.5 0', 'M35 31q1.2-1.6 2.5 0t2.5 0'], think: ['M24 31h5', 'M35 29.5q2.5-1.5 5 0'], sweat: ['M24 30l5-1', 'M40 30l-5-1'], smug: ['M24 31h5', 'M35 30l5 1'] }[f];
  BR.forEach(b => A(b, `stroke-width="${f === 'angry' ? 2.4 : 1.7}"`));
  // eyes
  if (L.blind) { A('M24.5 35.5h4.5M35 35.5h4.5', 'stroke-width="1.6"'); }
  else {
    const dot = (x, y, r = 1.3) => P.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`);
    if (f === 'smile' || f === 'laugh') { A('M24.5 36q2.25-2.5 4.5 0M35 36q2.25-2.5 4.5 0'); }
    else if (f === 'shock') { P.push('<circle cx="26.7" cy="35.5" r="2.4"/><circle cx="37.3" cy="35.5" r="2.4"/>'); dot(26.7, 35.5, .9); dot(37.3, 35.5, .9); }
    else if (f === 'cold' || f === 'smug') { A('M24.5 35h4.5M35 35h4.5'); dot(26.5, 36.3, 1); dot(37, 36.3, 1); }
    else if (f === 'uneasy') { dot(28.2, 35.8); dot(38.8, 35.8); }
    else if (f === 'think') { dot(27.5, 34.6); dot(38, 34.6); }
    else if (f === 'cry' || f === 'sad') { A('M24.5 35.5q2.25 1.5 4.5 0M35 35.5q2.25 1.5 4.5 0'); }
    else if (f === 'sweat') { A('M24.5 35.8l2.2-1 2.3 1M35 35.8l2.2-1 2.3 1'); }
    else { dot(26.7, 35.6); dot(37.3, 35.6); }
  }
  if (L.mask) A('M31 26c4-2 11-2 14 2 1 6-1 12-6 15-3-2-6-5-8-9z', 'fill="var(--sheet)"'), A('M36 33.5c1.2-1.4 3-1.4 4 .4-1.4 1-2.8 1-4-.4z'), A('M34 27l3 2M43 28l-3 2', 'stroke="var(--cinnabar)"');
  // mouth
  const MO = { neutral: 'M29.5 45h5', smile: 'M28.5 44q3.5 3 7 0', laugh: 'M28 43.5q4 6 8 0z', cold: 'M29 45.5h6', angry: 'M28.5 46.5q3.5-3 7 0', shock: 'M30.5 46a1.6 2.2 0 1 0 3.2 0a1.6 2.2 0 1 0 -3.2 0', sad: 'M29 46.5q3-2 6 0', cry: 'M28.5 47q3.5-3.5 7 0', uneasy: 'M28.5 45.5q1.2-1.4 2.4 0t2.3 0t2.3 0', think: 'M31 45.5h4', sweat: 'M28.5 45q1.8 1.6 3.5 0t3.5 0', smug: 'M29 45.5q3.5 1 6.5-1.5' }[f];
  A(MO, f === 'laugh' ? 'fill="var(--sheet)"' : '');
  if (L.beard === 'goatee') A('M30 49c1 4 3 5 4 0', 'stroke-width="1.3"');
  if (L.beard === 'full') A('M22 43c1 7 5 11 10 11s9-4 10-11', 'stroke-width="1.3"');
  if (L.beard === 'stubble') A('M27 49.5h.1M30 50.5h.1M33 50.5h.1M36 49.5h.1', 'stroke-width="1.4"');
  if (L.scar) A('M22 29l9 17', 'stroke="var(--cinnabar)" stroke-width="1.4"');
  if (L.bandage) A('M15 58l6 2 1-4-6-2z', 'stroke-width="1.2"');
  if (L.mole) P.push('<circle cx="40" cy="42" r=".9" fill="currentColor" stroke="none"/>');
  // comic marks
  if (f === 'angry') A('M45 22l3-1-1 3M48 25l1 3-3-1', 'stroke="var(--cinnabar)" stroke-width="1.5"');
  if (f === 'shock') A('M14 22l3 3M12 30h4M50 22l-3 3M52 30h-4', 'stroke-width="1.3"');
  if (f === 'cry') A('M26 38c-1 3-1 5 0 6M38 38c1 3 1 5 0 6', 'stroke="var(--jade)" stroke-width="1.5"');
  if (f === 'uneasy' || f === 'sweat') A('M46 24c-2 3-2 5 0 6 2-1 2-3 0-6z', 'stroke="var(--jade)" stroke-width="1.3"');
  if (f === 'smile' && L.blush) A('M22 40h3M39 40h3', 'stroke="var(--cinnabar)" stroke-width="1" opacity=".7"');
  return `<svg class="face ${cls}" viewBox="8 8 48 56" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P.join('')}</svg>`;
}
const icon = (id, cls = '') => ICON[id] ? `<svg class="ico ${cls}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON[id]}</svg>` : '';

/* ================= utils ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = x => x >= 30 ? Math.round(x) : Math.round(x * 2) / 2;
const fmt = n => { n = Math.round(n * 10) / 10; return Number.isInteger(n) ? String(n) : n.toFixed(1); };
function cnNum(n) {
  n = Math.floor(n);
  if (n < 11) return CN[n];
  if (n < 20) return '十' + (n % 10 ? CN[n % 10] : '');
  if (n < 100) return CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
  const h = Math.floor(n / 100), r = n % 100;
  return CN[h] + '百' + (r === 0 ? '' : r < 10 ? '零' + CN[r] : cnNum(r).replace(/^十/, '一十'));
}
const cnPrice = p => cnNum(p) + '塊' + (p % 1 ? '半' : '');
function monthsText(n) { const y = Math.floor(n / 12), m = n % 12; return (y ? cnNum(y) + '年' : '') + (y && m ? '又' : '') + (m ? cnNum(m) + '個月' : ''); }
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
const rnd = key => hash(S.seed + '|' + key);
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ================= state ================= */
let S = null;
const UI = { view: 'title', tab: 'main', sheet: null, toast: null, night: { invest: 0, burn: false, pill: false } };

function newGame(seed) {
  const bestScores = copyState(S && S.v === 2 && S.bestScores || {});
  const s = { bestScores,
    monthTwoVersion: 1, monthTwo: freshMonthTwo(), monthOneVersion: 1, monthOne: { s02: 'pending', s05: 'pending' }, v: 2, storyVersion: 'taiwan-m1m2-v1', unitsVersion: 2, saveRevision: 0, opportunities: { O101: freshOpportunity(), ...Object.fromEntries(M2_IDS.map(id => [id, freshM2Record(id)])) }, newsRead: {}, visitSeq: 0, seed, day: 1, slot: 0, phase: 'morning',
    stones: M.startStones, level: M.startLevel, xp: M.startXp, spirit: 0,
    stance: '收斂', stanceDays: { 收斂: 0, 外放: 0 }, wind: 0,
    lots: [], lotSeq: 0, flags: {}, rel: {}, met: {}, mem: {}, tags: {}, notes: {}, homes: {},
    rep: { loose: 0, sect: 0, ghost: 0 }, repTag: {}, done: {}, events: [], cards: [], todayNews: [],
    codex: {}, teaBought: {}, overheard: {}, herbBought: {}, commission: null, pillYesterday: false,
    enc: null, place: null, night: null, dues: null, debt: 0, lifespan: M.lifespan,
    stats: { saw: 0, fooled: 0, wronged: 0 }, complaints: [], log: [], sold: [], dayStartStones: M.startStones, lifespanLeft: M.lifespan
  };
  migrate(s);
  S = s;
  M.startLots.forEach(l => addLot({ item: l.item, qty: l.qty, cost: l.cost, label: l.label, known: true }));
  beginDay();
  return s;
}

const DEFAULTS = () => ({ month: 1, monthStartLevel: M.startLevel, history: [], statLog: [], intel: {}, isold: {}, heat: 0, extraNews: [], accused: {}, baiSold: {}, intelSeenN: 0 });
function migrate(s) { const d = DEFAULTS(); for (const k in d) if (s[k] === undefined) s[k] = d[k]; return s; }

/* ----- lots ----- */
function addLot(o) {
  const it = IT[o.item]; if (!it) return null;
  const lot = { id: ++S.lotSeq, item: o.item, qty: o.qty || 1, cost: o.cost ?? 0, q: o.q ?? 1, flags: o.flags || [], label: o.label || it.name, known: !!o.known || (o.q ?? 1) >= 0.95 && !(o.flags || []).length, perishDay: o.perishDay || null, from: o.from || null };
  S.lots.push(lot); S.codex[o.item] = true; return lot;
}
const held = item => S.lots.filter(l => l.item === item).reduce((a, l) => a + l.qty, 0);
const holdFlag = f => S.lots.some(l => l.flags.includes(f) && l.qty > 0);
function takeQty(item, qty, lotId) {
  let need = qty;
  const order = S.lots.filter(l => l.item === item && (!lotId || l.id === lotId));
  for (const l of order) { const t = Math.min(l.qty, need); l.qty -= t; need -= t; if (!need) break; }
  S.lots = S.lots.filter(l => l.qty > 0);
  return qty - need;
}
const lotById = id => S.lots.find(l => l.id === id);
const tradeQty = (item, qty) => qty / ((IT[item] || {}).priceQty || 1);
const moneyFor = (item, unit, qty) => unit * tradeQty(item, qty);
const quoteUnit = item => IT[item].priceUnit || IT[item].unit;
const quantityText = (item, qty) => item === 'hantie' ? (qty >= 1000 ? fmt(qty / 1000) + '公斤' : fmt(qty) + '公克') : fmt(qty) + (IT[item] ? IT[item].unit : '件');
const lotValue = (l, day = S.day, trueQ = false) => moneyFor(l.item, price(l.item, day) * ((trueQ || l.known) ? l.q : 1), l.qty);

/* ----- relations ----- */
const rel = n => S.rel[n] || 0;
function addRel(n, d) { S.rel[n] = rel(n) + d; S.met[n] = true; }
function addMem(n, t) { (S.mem[n] = S.mem[n] || []).push({ day: S.day, m: MON(), t }); S.met[n] = true; }
function attitude(n) { const r = rel(n); return r <= -4 ? '結仇' : r <= -2 ? '有隙' : r >= 4 ? '交心' : r >= 2 ? '熟客' : '生客'; }
function bucketOf(npc) { const n = NP[npc]; if (!n) return 'eq'; if (n.level >= 10 && S.level < 10) return 'far'; const d = S.level - n.level; return d >= 3 ? 'up' : d <= -3 ? 'down' : 'eq'; }
function callYou(npc) { const c = (NP[npc] || {}).call || {}; const b = bucketOf(npc); return (b === 'far' || b === 'down' ? c.down : b === 'up' ? c.up : c.eq) || '老闆'; }
const sub = (t, npc) => String(t ?? '').replace(/〈你〉/g, callYou(npc));
const quote = t => /^[「（…]/.test(t) ? t : '「' + t + '」';
const npcLv = n => NP[n].conceal ? '修為看不透' : lvName(NP[n].level);

/* ================= prices ================= */
function newsMult(item, day) { let m = 1; for (const n of NEWS) if (inMonth(n)) for (const e of (n.effects || [])) if (e.item === item && day >= e.from && day <= e.to) m *= e.mult; return m; }
function price(item, day = S.day) { const b = IT[item] && IT[item].base; if (!b) return 0; return rp(b * newsMult(item, day) * (1 + (hash(S.seed + item + (MON() > 1 ? 'm' + MON() : '') + day) - 0.5) * 0.08)); }

/* ================= needs & effects ================= */
function needOk(need, enc) {
  if (!need) return true;
  if (need.has) for (const [k, v] of Object.entries(need.has)) if (held(k) < v) return false;
  if (need.flag) for (const f of need.flag) if (!S.flags[f]) return false;
  if (need.not) for (const f of need.not) if (S.flags[f]) return false;
  if (need.anyFlag && !need.anyFlag.some(f => S.flags[f])) return false;
  if (need.rel) for (const [k, v] of Object.entries(need.rel)) if (rel(k) < v) return false;
  if (need.stones && S.stones < need.stones) return false;
  if (need.appraised && !(enc && enc.appraised)) return false;
  if (need.holdFlag && !holdFlag(need.holdFlag)) return false;
  if (need.holdAny && !need.holdAny.some(holdFlag)) return false;
  if (need.noticed && !(enc && (enc.appraised || enc.press > 0))) return false;
  if (need.backFlag && !(enc && enc.back && (enc.back.flags || []).includes(need.backFlag))) return false;
  if (need.intel && !need.intel.every(i => S.intel[i])) return false;
  if (need.notIntel && need.notIntel.some(i => S.intel[i])) return false;
  if (need.lotKnown && !S.lots.some(l => l.item === need.lotKnown && l.known)) return false;
  if (need.anyOf && !need.anyOf.some(n => needOk(n, enc))) return false;
  if (need.month && need.month !== MON()) return false;
  if (need.relMax) for (const [k, v] of Object.entries(need.relMax)) if (rel(k) > v) return false;
  return true;
}
function applyFx(fx, ctx = {}) {
  if (!fx) return [];
  const notes = [];
  if (fx.bounty) { const b = S.flags.bounty_seen ? 60 : 40; S.stones += b; notes.push('＋' + b + ' 靈石'); }
  if (fx.stones) { S.stones += fx.stones; notes.push((fx.stones > 0 ? '＋' : '－') + fmt(Math.abs(fx.stones)) + ' 靈石'); }
  (fx.give || []).forEach(g => { addLot({ item: g.item, qty: g.qty, cost: g.cost, q: g.q, flags: g.flags, label: g.label, perishDay: g.perishDay, known: true }); notes.push('得到「' + (g.label || IT[g.item].name) + '」'); });
  (fx.take || []).forEach(t => takeQty(t.item, t.qty));
  if (fx.rel) for (const [k, v] of Object.entries(fx.rel)) addRel(k, v);
  if (fx.relByPrice && ctx.price != null) { const r = fx.relByPrice; addRel(r.npc, ctx.price >= r.atLeast ? r.good : r.bad); }
  if (fx.rep) for (const [k, v] of Object.entries(fx.rep)) S.rep[k] = (S.rep[k] || 0) + v;
  if (fx.tag) Object.assign(S.repTag, fx.tag);
  (fx.flag || []).forEach(f => { S.flags[f] = true; });
  (fx.event || []).forEach(e => S.events.push({ id: e.id, day: e.at || S.day + (e.in || 1) }));
  if (fx.mem) for (const [k, v] of Object.entries(fx.mem)) addMem(k, v);
  (fx.home || []).forEach(h => { S.homes[h] = true; });
  (fx.codex || []).forEach(c => { S.codex[c] = true; });
  if (fx.confiscate) S.lots = S.lots.filter(l => !l.flags.includes(fx.confiscate));
  if (fx.confiscateItem) S.lots = S.lots.filter(l => l.item !== fx.confiscateItem);
  if (fx.wind) S.wind += fx.wind;
  if (fx.removeEvent) S.events = S.events.filter(e => e.id !== fx.removeEvent);
  if (fx.buyback) { let got = 0; for (const l of S.lots.filter(x => x.flags.includes(fx.buyback.flag))) { got += rp(moneyFor(l.item, l.cost, l.qty) * fx.buyback.ratio); l.qty = 0; } S.lots = S.lots.filter(l => l.qty > 0); if (got) { S.stones += got; notes.push('＋' + fmt(got) + ' 靈石'); } }
  if (fx.refundLot) { let got = 0; for (const l of S.lots.filter(x => x.item === fx.refundLot.item)) { got += rp(moneyFor(l.item, l.cost, l.qty) * fx.refundLot.ratio); l.qty = 0; } S.lots = S.lots.filter(l => l.qty > 0); if (got) { S.stones += got; notes.push('＋' + fmt(got) + ' 靈石'); } }
  if (fx.unfool) { S.stats.fooled = Math.max(0, S.stats.fooled - 1); S.flags['won_' + fx.unfool] = true; }
  if (fx.spreadText) S.extraNews.push({ day: S.day + 1, src: '坊間', text: fx.spreadText });
  if (fx.sellHot) {
    let got = 0;
    for (const [item, unit] of Object.entries(fx.sellHot)) for (const l of S.lots.filter(x => x.item === item && x.flags.includes('stolen') || x.item === item && x.flags.includes('sting'))) { got += moneyFor(l.item, unit, l.qty); l.qty = 0; if (l.flags.includes('entrusted')) { addRel('aheng', -5); addMem('aheng', '託你交給派出所的雪蟾酥，你賣去了鬼市。'); S.flags.betrayed_aheng = true; } }
    S.lots = S.lots.filter(l => l.qty > 0); S.stones += got; notes.push('＋' + fmt(got) + ' 靈石');
  }
  return notes;
}

/* ================= day flow ================= */
function beginDay() {
  S.phase = 'morning'; S.slot = 0; S.place = null; S.enc = null; S.night = null;
  S.spirit = M.spirit[S.level] || 2; S.dayStartStones = S.stones; S.cards = [];
  if (S.day === 1 && MON() === 1) S.cards.push({ title: D.events.e_intro.title, text: D.events.e_intro.text });
  if (S.day === 1 && MON() > 1) {
    S.cards.push({ title: '長生典的字條', text: `天還沒亮，門縫裡又塞進來一張字條：「許先生，還剩${monthsText(S.lifespan)}。」`, face: 'think' });
    for (const c of ((D.events.monthStart || {})[MON()] || [])) if (needOk(c.need || {})) S.cards.push({ title: c.title, text: c.text, notes: applyFx(c.fx), face: c.face });
  }
  // perish
  for (const l of [...S.lots]) if (l.perishDay && S.day >= l.perishDay) {
    S.lots = S.lots.filter(x => x !== l);
    S.cards.push({ title: '東西壞了', text: (D.events.melt[l.item] || D.events.melt.default.replace('{name}', l.label)) });
    if (l.flags.includes('entrusted')) { addRel('aheng', -3); addMem('aheng', '託你交的雪蟾酥，在你手上化了。'); }
  }
  // scheduled events
  for (const ev of S.events.filter(e => e.day === S.day)) runEvent(ev);
  S.events = S.events.filter(e => e.day !== S.day);
  if (MON() === 1 && S.day === 4 && S.flags.aheng_entrust && !S.flags.aheng_taken) S.cards.push({ title: D.events.e_aheng_warn.title, text: D.events.e_aheng_warn.text });
  // complaints
  for (const c of S.complaints.filter(c => c.day === S.day)) {
    S.stones -= c.refund; S.rep.loose -= 1; S.repTag.loose = '賣次貨';
    addLot({ item: c.item, qty: c.qty, cost: c.cost, q: c.q, flags: c.flags, label: c.label, known: true });
    S.cards.push({ title: '有人回來退貨', text: `昨天在你這兒買${c.label}的人回來了，把東西摔在櫃上：「${D.events.complaint[c.reason] || D.events.complaint.default}」你退了 ${fmt(c.refund)} 塊靈石。` });
  }
  S.complaints = S.complaints.filter(c => c.day !== S.day);
  // commission
  if (S.commission && !S.commission.done && S.day >= S.commission.ready) {
    S.commission.done = true; addLot({ item: PL.smith.commission.item, qty: 1, cost: S.commission.cost, known: true });
    S.cards.push({ title: '刀好了', text: PL.smith.commission.done });
  }
  // news
  S.todayNews = NEWS.filter(n => inMonth(n) && n.day === S.day && (!n.cond || S.flags[n.cond]) && !(n.notCond && S.flags[n.notCond])).map(n => n.id);
  if (S.todayNews.includes('n_bounty')) S.flags.bounty_seen = true;
  tickOpportunities();
}
function runEvent(evo) {
  const id = typeof evo === 'string' ? evo : evo.id;
  if (id.startsWith('leak:')) {
    const I = IN[id.slice(5)]; if (!I || !I.leak) return;
    const c = I.leak.cases.find(x => needOk(x.if || {})); if (!c) return;
    S.cards.push({ title: c.title || '風聲', text: c.text, notes: applyFx(c.fx), face: c.face || 'sweat' }); return;
  }
  if (id.startsWith('burn:')) {
    const iid = id.slice(5), I = IN[iid], paid = (S.isold[iid] || {}).price || 0;
    const back = Math.min(paid, Math.max(0, S.stones));
    S.stones -= back; addRel('bai', -2); S.flags.bai_burned = true; S.isold[iid].burned = true;
    addMem('bai', `你賣給她的「${I.short}」，是假的。`);
    S.cards.push({ title: '聽雨樓來人', text: I.burn, notes: back ? ['－' + fmt(back) + ' 靈石'] : [], face: 'sweat' }); return;
  }
  if (id.startsWith('heat:')) { const h = D.heat[id.slice(5)]; if (!h) return; applyFx(h.fx); S.cards.push({ title: h.title, text: h.text, face: 'uneasy' }); return; }
  const ev = D.events[id]; if (!ev) return;
  if (evo.refund) { S.stones -= evo.refund; if (evo.back) addLot({ ...evo.back, known: true }); }
  if (!ev.cases) { S.cards.push({ title: ev.title, text: ev.text }); return; }
  const c = ev.cases.find(x => needOk(x.if || {}, evo));
  if (!c) return;
  const notes = applyFx(c.fx);
  if (evo.refund) notes.unshift('退錢 ' + fmt(evo.refund) + ' 靈石');
  S.cards.push({ title: ev.title, text: c.text, notes, face: c.face });
}
function openShop() { S.phase = 'day'; UI.tab = 'main'; }
function advanceSlot() {
  S.slot++; S.place = null; S.enc = null; S.phase = 'day';
  if (S.slot >= 3) {
    if (S.day === M.days && !S.dues) startDues();
    else S.phase = 'night';
  }
}
function endDay() {
  closeOpportunityWindow();
  if (MON() === 1 && S.day === 2 && S.monthOne.s02 === 'pending') S.monthOne.s02 = 'unseen';
  if (MON() === 1 && S.day === 6 && S.monthOne.s05 === 'pending') S.monthOne.s05 = 'unseen';
  S.stanceDays[S.stance] = (S.stanceDays[S.stance] || 0) + 1;
  for (const d of D.deals) {
    if (['d13', 'd14', 'm218', 'm220'].includes(d.id) || S.done[d.id] || d.extra || !inMonth(d) || d.days[1] !== S.day) continue;
    if (d.missed && needOk(d.need)) applyFx(d.missed);
    S.done[d.id] = needOk(d.need) ? 'missed' : 'na';
  }
  S.day++;
  if (S.day > M.days) { finish(); return; }
  beginDay();
}
function finish() {
  S.cards = [];
  for (const ev of S.events) if (ev.day > M.days) runEvent(ev);
  for (const c of S.complaints) { S.stones -= c.refund; S.rep.loose -= 1; S.repTag.loose = '賣次貨'; S.cards.push({ title: '有人回來退貨', text: `在你這兒買${c.label}的人回來了：「${D.events.complaint[c.reason] || D.events.complaint.default}」你退了 ${fmt(c.refund)} 塊靈石。` }); }
  S.complaints = [];
  S.events = [];
  S.phase = 'end'; S.lifespanLeft = S.lifespan - 1;
  const sc = scoreTotal(), best = (S.bestScores || {})[MON()];
  S.finalScore = sc; S.prevBest = best ? best.score : null;
  if (!best || sc > best.score) (S.bestScores = S.bestScores || {})[MON()] = { score: sc, grade: gradeOf(), at: Date.now() };
}
function goalLevel() { return (S.monthStartLevel || M.startLevel) + 1; }
function nextMonth() {
  if (MON() >= LAST_MONTH) return;
  S.history.push({ m: MON(), grade: gradeOf(), score: S.finalScore, stats: { ...S.stats } });
  S.month = MON() + 1; S.day = 1; S.lifespan -= 1; S.monthStartLevel = S.level;
  const melted = S.lots.filter(l => l.perishDay); S.lots = S.lots.filter(l => !l.perishDay);
  if (S.commission && !S.commission.done) S.commission.ready = Math.max(2, S.commission.ready - M.days);
  Object.assign(S, { stats: { saw: 0, fooled: 0, wronged: 0 }, teaBought: {}, overheard: {}, herbBought: {}, baiSold: {}, dues: null, wind: 0, stanceDays: { 收斂: 0, 外放: 0 }, log: [], events: [], complaints: [], extraNews: [], finalScore: null, prevBest: null });
  S.flags['month' + (S.month - 1) + '_done'] = true;
  S.heat = Math.floor((S.heat || 0) / 2); delete S.flags.heat3; delete S.flags.heat5;
  for (const d of D.deals) if (d.month === 'all' && S.done[d.id] && !['special', 'special2'].includes(S.done[d.id])) delete S.done[d.id];
  S.smithBought = {};
  beginDay();
  for (const l of melted) S.cards.unshift({ title: '東西壞了', text: (D.events.melt[l.item] || D.events.melt.default.replace('{name}', l.label)) });
}
function gradeOf() { const m = S.stats.fooled + S.stats.wronged; return S.debt > 0 || m >= 4 ? '下' : (S.level >= goalLevel() && m <= 1) ? '上' : '中'; }
function scoreRows() {
  const nw = netWorth(true);
  return [
    { k: 'saw', label: '看穿', n: S.stats.saw, per: 10 },
    { k: 'fooled', label: '吃虧', n: S.stats.fooled, per: -15 },
    { k: 'wronged', label: '錯怪好人', n: S.stats.wronged, per: -10 },
    { label: '境界（這個月每升一層）', n: Math.max(0, S.level - (S.monthStartLevel || M.startLevel)), per: 30 },
    { label: '身家（每十靈石）', n: Math.floor(Math.max(0, nw) / 10), per: 1 },
    { label: '名聲（居民圈＋資源圈）', n: (S.rep.loose || 0) + (S.rep.sect || 0), per: 5 },
    { label: '欠老錢', n: S.debt ? 1 : 0, per: -30 }
  ];
}
const scoreTotal = () => scoreRows().reduce((a, r) => a + r.n * r.per, 0);

/* ================= encounters ================= */
function dealAvail(d) { return !['d13', 'd14', 'm218', 'm220'].includes(d.id) && inMonth(d) && !S.done[d.id] && S.day >= d.days[0] && S.day <= d.days[1] && needOk(d.need); }
function nextShopDeal() { return D.deals.filter(d => d.where === 'shop' && dealAvail(d)).sort((a, b) => a.days[1] - b.days[1] || (b.prio || 0) - (a.prio || 0) || a.id.localeCompare(b.id))[0] || null; }

function startDeal(id, from) {
  if (['d13', 'd14', 'm218', 'm220'].includes(id)) return null;
  const d = DEALS[id]; const npc = d.npc;
  if (id !== 'd18') S.met[npc] = true;
  if (S.stance === '外放') S.wind++;
  const enc = { deal: id, npc, side: d.side, item: d.item, qty: d.qty || 1, price: d.price, tea: TEA[NP[npc].traits.patience] || 4, th: [], press: 0, haggle: 0, asked: false, silent: false, appraised: false, verified: [], cold: false, done: null, from, lot: null };
  enc.teaMax = enc.tea;
  if (d.side === 'buy') {
    const lots = S.lots.filter(l => l.item === d.item && !protectedLot(l));
    lots.sort((a, b) => (b.known ? b.q : 1) - (a.known ? a.q : 1));
    enc.lot = lots[0] ? lots[0].id : null;
    enc.qty = Math.min(d.qty || 1, lots[0] ? lots[0].qty : 0);
  }
  if (IT[d.item]) S.codex[d.item] = true;
  if (d.intro) enc.th.push({ k: 'narr', t: sub(d.intro, npc) });
  if (id === 'd18') {
    const high = S.wind >= M.windHigh || S.stones >= M.richHigh;
    enc.due = high ? MD().duesHigh : MD().dues; enc.high = high;
    enc.th.push({ k: 'npc', t: high ? d.openHigh.replace('一百', cnNum(MD().duesHigh)) : d.open.replace('八十', cnNum(MD().dues)) });
    if (S.debt > 0) { enc.debtDue = rp(S.debt * 1.3); enc.due += enc.debtDue; enc.th.push({ k: 'narr', t: `老錢也從對門走了過來，手裡拿著一張借據：「許老弟，上個月墊的 ${fmt(S.debt)}，三分利，${fmt(enc.debtDue)}。一起算了吧。」` }); enc.th.push({ k: 'sys', t: `規費加還錢記，一共 ${fmt(enc.due)}。` }); }
  } else enc.th.push({ k: 'npc', t: sub(d.open, npc) });
  enc.face = d.openFace || baseFace(npc);
  // realm & stance layer: adjust the opening price and say so
  if ((d.side === 'sell' || d.side === 'buy') && !d.extra && id !== 'd01') {
    const b = bucketOf(npc);
    if (b === 'eq' && S.stance === '收斂') { /* nothing to say */ } else {
    let m = d.side === 'sell' ? ({ up: .93, eq: 1, down: 1.06, far: 1.1 })[b] : ({ up: 1.06, eq: 1, down: .95, far: .92 })[b];
    m *= d.side === 'sell' ? (S.stance === '收斂' ? 1.04 : .96) : (S.stance === '收斂' ? .97 : 1.03);
    const np = rp(d.price * m);
    if (np !== d.price && d.price >= 2) {
      enc.price = np;
      const better = d.side === 'sell' ? np < d.price : np > d.price;
      let line;
      if (S.stance === '外放' && better) line = `你沒有收斂氣息。${NP[npc].name}頓了頓，改口：「${cnPrice(np)}。」`;
      else if (b === 'up') line = `${NP[npc].name}看了一眼你的修為，語氣客氣了些：「給${callYou(npc)}算${cnPrice(np)}。」`;
      else if (better) line = `${NP[npc].name}想了想，改口：「${cnPrice(np)}。」`;
      else line = `${NP[npc].name}打量了你一下，把價錢${d.side === 'sell' ? '往上提了提' : '往下壓了壓'}：「${cnPrice(np)}。」`;
      enc.th.push({ k: 'narr', t: line });
    }
    }
  }
  if (id === 'd01' && S.newsRead.n_vein) enc.th.push({ k: 'narr', t: '許衡抽出讀過的報紙。那段寫的是「聽說」，沒有寫誰去過，也沒寫什麼時候能出貨。老錢說有人轉述，未必是另一個來源。' });
  pushTells(enc, 'open');
  S.enc = enc; S.phase = 'enc';
  learnTrigger(id + ':open');
  return enc;
}
function pushTells(enc, after) {
  const d = DEALS[enc.deal]; if (!d || !d.tells) return;
  const bonus = S.flags.lamp && enc.from === 'shop' ? 2 : 0;
  const diff = S.level - NP[enc.npc].level + bonus;
  for (const t of d.tells) if (t.after === after && diff >= t.need && !enc.th.some(x => x.t === t.text)) { enc.th.push({ k: 'tell', t: t.text }); if (t.f) enc.face = t.f; }
}
function spend(enc, n) {
  enc.tea -= n;
  if (enc.tea <= 0 && !enc.cold) { enc.tea = 0; enc.cold = true; say(enc, quote(sub(NP[enc.npc].cold, enc.npc)), 'cold'); }
}
const pride3 = enc => NP[enc.npc].traits.pride >= 3;
const baseFace = npc => ((NP[npc] || {}).look || {}).base || 'neutral';
function say(e, t, f) { e.th.push({ k: 'npc', t, f }); if (f) e.face = f; }

function canAct(act) {
  const e = S.enc; if (!e || e.done) return false;
  if (e.generic) {
    if (act === 'chat') return !e.chatted && !e.cold;
    if (act === 'haggle') return !!e.lot && !e.haggled && !e.cold;
    return false;
  }
  const d = DEALS[e.deal];
  if (e.cold && act !== 'appraise' && act !== 'verify') return false;
  switch (act) {
    case 'ask': return !!d.ask && !e.asked;
    case 'press': return !!d.press && e.press < d.press.length;
    case 'silence': return !!d.silence && !e.silent;
    case 'haggle': return !!d.haggle && e.haggle < d.haggle.length && (d.side !== 'buy' || e.qty > 0);
    case 'appraise': return !!d.appraise && !e.appraised && S.spirit > 0;
    case 'verify': return verifyList().some(v => !v.used) && S.slot < 2;
  }
  return false;
}
function actAsk() {
  const e = S.enc, d = DEALS[e.deal];
  e.asked = true; e.th.push({ k: 'me', t: d.ask.q || '這東西，怎麼來的？' }); say(e, sub(d.ask.a, e.npc), d.ask.f || baseFace(e.npc));
  pushTells(e, 'ask'); learnTrigger(e.deal + ':ask'); spend(e, 1);
}
function actPress() {
  const e = S.enc, d = DEALS[e.deal], p = d.press[e.press++];
  e.th.push({ k: 'me', t: p.q }); say(e, sub(p.a, e.npc), p.f || baseFace(e.npc));
  pushTells(e, 'press'); learnTrigger(e.deal + ':press' + (e.press - 1));
  spend(e, 2 + (pride3(e) && ['down', 'far'].includes(bucketOf(e.npc)) ? 1 : 0));
}
function d01CurrentQuote(e) {
  return `這批${quantityText(e.item, e.qty)}，總共 ${fmt(moneyFor(e.item, e.price, e.qty))} 塊。`;
}
function actSilence() {
  const e = S.enc, d = DEALS[e.deal];
  e.silent = true; e.th.push({ k: 'me', t: '（你沒有說話，只是看著對方。）', f: 'think' });
  if (d.silenceRaise && d.silenceRaise > e.price) e.price = d.silenceRaise;
  if (d.silenceDrop && d.silenceDrop < e.price) e.price = d.silenceDrop;
  if (e.deal === 'd01') say(e, '老錢往後靠。「好啦，' + d01CurrentQuote(e) + '現在就給你。你也不用再慢慢零賣，省多少事。」', baseFace(e.npc));
  else if (typeof d.silence === 'object') { e.th.push({ k: 'narr', t: sub(d.silence.narr, e.npc) }); if (d.silence.f) e.face = d.silence.f; } else say(e, sub(d.silence, e.npc), d.silenceFace || baseFace(e.npc));
  pushTells(e, 'silence'); learnTrigger(e.deal + ':silence');
  spend(e, 1 + (pride3(e) ? 1 : 0));
}
function actHaggle() {
  const e = S.enc, d = DEALS[e.deal];
  e.th.push({ k: 'me', t: d.side === 'buy' ? '再加一點。' : d.side === 'task' ? '辛苦費，再加一點。' : '便宜點。' });
  if (bucketOf(e.npc) === 'far' || (bucketOf(e.npc) === 'down' && pride3(e))) {
    e.haggle = d.haggle.length; say(e, quote(sub(NP[e.npc].refuse, e.npc)), 'cold'); spend(e, 2); return;
  }
  let step = null;
  while (e.haggle < d.haggle.length) {
    const s = d.haggle[e.haggle++];
    const better = d.side === 'sell' ? s.price < e.price : s.price > e.price;
    if (better) { step = s; break; }
  }
  if (step) { e.price = step.price; say(e, e.deal === 'd01' ? '「' + d01CurrentQuote(e) + '就這個價。」' : sub(step.a, e.npc), step.f || 'think'); }
  else say(e, quote(sub(NP[e.npc].refuse, e.npc)), 'cold');
  pushTells(e, 'haggle'); spend(e, 2);
}
function actAppraise() {
  const e = S.enc, d = DEALS[e.deal];
  S.spirit--; e.appraised = true;
  e.th.push({ k: 'me', t: `（你以靈識探向${d.itemName || (IT[d.item] && IT[d.item].name) || '那件東西'}。）` });
  for (const a of d.appraise) if (S.level >= a.realm) e.th.push({ k: 'sys', t: a.text });
  e.th.push({ k: 'narr', t: '以你的靈識，只看得到這麼多。' });
  learnTrigger(e.deal + ':appraise');
}
function verifyList() {
  const e = S.enc; if (!e || e.generic) return [];
  const d = DEALS[e.deal]; if (!d.verify) return [];
  return d.verify.filter(v => v.who !== e.npc && !(v.notFlag && S.flags[v.notFlag]) && (S.met[v.who] || PUBLIC_VERIFY.includes(v.who))).map(v => ({ ...v, used: e.verified.includes(v.who) }));
}
function actVerify(who) {
  const e = S.enc, d = DEALS[e.deal], v = d.verify.find(x => x.who === who);
  if (!v || S.slot >= 2) return;
  if (v.cost && S.stones < v.cost) { toast('靈石不夠'); return; }
  S.stones -= v.cost || 0; S.slot++; e.verified.push(who); S.met[who] = true;
  e.th.push({ k: 'me', t: `（「我想一下。」你出門去找${NP[who].name}${v.cost ? `，花了 ${v.cost} 塊靈石` : ''}。回來時，已經是${SLOT[S.slot]}。）` });
  e.th.push({ k: 'npc', who, t: sub(v.a, who), f: v.f || baseFace(who) });
  if (!learnTrigger(`${e.deal}:verify:${who}`)) noteGeneric(`${NP[who].name}談「${d.title}」：${sub(v.a, who)}`, 'verify');
}

/* ----- options ----- */
const OPT_ORDER = ['deal', 'special', 'special2', 'sellhot', 'mask', 'info_yao', 'info_liu', 'info_pkg', 'pay', 'poor', 'decline', 'expose', 'report', 'refer'];
function encOptions() {
  const e = S.enc; if (!e) return [];
  if (e.generic) {
    const out = [];
    if (e.lot) {
      const l = lotById(e.lot);
      out.push({ key: 'sell', label: '賣給他', desc: `收 ${fmt(moneyFor(e.item, e.price, e.qty))} 靈石`, primary: true });
      if (l && l.known && l.q < 0.9) out.push({ key: 'honest', label: '照實說', desc: `說清楚成色，照成色賣：${fmt(moneyFor(e.item, rp(e.price * l.q), e.qty))} 靈石` });
    }
    out.push({ key: 'decline', label: e.lot ? '不賣' : '送客', desc: '' });
    return out;
  }
  const d = DEALS[e.deal], out = [];
  if (d.infoBarter) for (const id of Object.keys(S.intel).filter(i => IN[i] && intelSolo(IN[i]))) { const o = intelOffer(id); if (o.price) out.push({ key: 'barter:' + id, label: `拿「${IN[id].short}」換`, desc: '不收錢。這則消息就出去了' }); }
  if (d.infoBuyer) for (const id of Object.keys(S.intel).filter(i => IN[i])) { const o = intelOffer(id, 1.1); if (o.price) out.push({ key: 'info:' + id, label: `賣「${IN[id].short}」`, desc: `${o.price} 靈石` }); }
  for (const key of OPT_ORDER) {
    const o = d.opts[key]; if (!o) continue;
    if (key === 'pay') {
      if (S.stones < e.due && pawnable().length) { const v = pawnable().reduce((a, l) => a + pawnValue(l), 0); out.push({ key: 'goods', label: '拿貨抵', desc: `管理單位照市價七成收貨抵規費（你的貨約值 ${fmt(v)}）`, primary: true }); }
      out.push({ key, label: S.stones >= e.due ? `照付（${e.due}）` : `差 ${fmt(e.due - S.stones)}，請老錢墊付`, desc: S.stones >= e.due ? '' : '要還，有利息', primary: S.stones >= e.due || !pawnable().length });
      continue;
    }
    if (key === 'poor' && (!e.high || e.poorTried)) continue;
    const okNeed = needOk(o.need, e);
    if (!okNeed && !o.fail) continue;
    let label = o.label, desc = '';
    const unit = o.price ?? e.price;
    if (key === 'deal') {
      label = label || (d.side === 'sell' ? '買下' : d.side === 'buy' ? '賣給他' : '答應');
      if (d.side === 'sell') desc = `付 ${fmt(moneyFor(e.item, unit, e.qty))} 靈石`;
      else if (d.side === 'buy') desc = e.qty > 0 ? `交${quantityText(e.item, e.qty)}，收 ${fmt(moneyFor(e.item, unit, e.qty))} 靈石` : '你手上沒有這貨';
      else if (d.price) desc = `收 ${fmt(unit)} 靈石辛苦費`;
    } else if (key === 'decline') { label = label || '婉拒'; desc = '不傷和氣'; }
    else if (key === 'expose') { label = label || '拆穿'; desc = label === '點破' ? '把你看出來的毛病說出來' : '當面說破。說錯了，得罪的是無辜的人'; }
    else if (key === 'report') { label = label || '報派出所'; desc = '交給派出所處理。居民圈會記得'; }
    else if (key === 'refer') { label = label || '轉介給錢記'; desc = '把這筆生意送去對門'; }
    else if (o.price) desc = `付 ${fmt(moneyFor(e.item, o.price, e.qty))} 靈石`;
    let disabled = false;
    if ((key === 'deal' || o.price) && d.side === 'sell' && S.stones < moneyFor(e.item, unit, e.qty)) { disabled = true; desc = '靈石不夠'; }
    if (key === 'deal' && d.side === 'buy' && e.qty <= 0) disabled = true;
    out.push({ key, label, desc, disabled, primary: key === 'deal' });
  }
  return out;
}
function decide(key) {
  const e = S.enc; if (!e || e.done) return;
  if (e.generic) return decideGeneric(key);
  const d = DEALS[e.deal];
  if (e.deal === 'd18') return decideDues(key);
  if (e.deal === 'd01' && key === 'decline' && e.price < 7) {
    e.th.push({ k: 'me', t: '我還沒問清楚，今天先不賣。' });
    e.price = e.price < 6.5 ? 6.5 : 7;
    e.th.push({ k: 'npc', t: `那這批 ${quantityText(e.item, e.qty)}，${fmt(moneyFor(e.item, e.price, e.qty))} 塊呢？老錢扶著推車，還沒走。` });
    return;
  }
  if (key.startsWith('info:')) return decideInfo(key.slice(5));
  if (key.startsWith('barter:')) return decideBarter(key.slice(7));
  let o = d.opts[key]; if (!o) return;
  let ok = needOk(o.need, e);
  const res = ok ? o : o.fail;
  if (!res) return;
  const unit = o.price ?? e.price;
  const label0 = (encOptions().find(x => x.key === key) || {}).label || o.label || key;
  let notes = [];
  if (ok && (key === 'deal' || o.price != null)) {
    if (d.side === 'sell') {
      const total = moneyFor(e.item, unit, e.qty);
      if (S.stones < total) { toast('靈石不夠'); return; }
      S.stones -= total;
      if (d.item === 'box') { /* the box's contents come through fx */ }
      else if (IT[d.item]) addLot({ item: d.item, qty: e.qty, cost: unit, q: d.lot && d.lot.q, flags: d.lot && d.lot.flags, label: d.lot && d.lot.label, perishDay: d.lot && d.lot.perishDay, from: d.id });
      notes.push('－' + fmt(total) + ' 靈石');
    } else if (d.side === 'buy') {
      const l = lotById(e.lot); if (protectedLot(l)) return;
      const q = Math.min(e.qty, l.qty);
      takeQty(d.item, q, l.id); S.stones += moneyFor(d.item, unit, q); notes.push('＋' + fmt(moneyFor(d.item, unit, q)) + ' 靈石');
      if (d.dirty && l.flags.includes(d.dirty.flag)) { if (d.dirty.event) S.events.push({ id: d.dirty.event, day: S.day + 1, refund: moneyFor(d.item, unit, q), back: { item: l.item, qty: q, cost: l.cost, q: l.q, flags: l.flags, label: l.label } }); if (d.dirty.fx) applyFx(d.dirty.fx); }
      if (d.honestyTest) {
        if (l.q < 0.8) S.events.push({ id: 'e_xiaoman_back', day: S.day + 1, refund: moneyFor(d.item, unit, q), back: { ...l, qty: q } });
        else { addRel('zhang', 1); addRel('xiaoman', 1); }
      }
      if (l.q < 0.7 && !d.honestyTest) scheduleComplaint(l, q, unit);
    } else if (d.side === 'task' && key === 'deal' && d.price) { S.stones += unit; notes.push('＋' + fmt(unit) + ' 靈石'); }
  }
  notes = notes.concat(applyFx(res.fx, { price: unit, enc: e }));
  let extraText = '';
  for (const x of (res.extra || [])) if (needOk(x.if || {}, e)) { notes = notes.concat(applyFx(x.fx)); extraText += x.text || ''; }
  if (ok) learnTrigger(`${e.deal}:opt:${key}`);
  if (!(d.repeatable && key === 'decline')) S.done[e.deal] = key;
  const SEAL = { deal: d.side === 'sell' ? '買下' : d.side === 'buy' ? '賣出' : '答應', decline: '婉拒', expose: '拆穿', report: '報案', refer: '轉介', sellhot: '銷贓', mask: '鬼面', pay: '照付', poor: '哭窮' };
  const seal = !ok ? '不成' : (res.seal || o.seal || (label0.length <= 2 ? label0 : SEAL[key] || '另議'));
  e.done = { key, label: ok ? label0 : '沒談成', notes, seal };
  e.th.push({ k: 'res', t: sub(res.text, e.npc) + extraText, notes });
  e.face = res.f || (key === 'expose' ? (o.right ? 'shock' : 'angry') : key === 'report' ? 'shock' : key === 'deal' ? 'smile' : e.face);
  // judgement stats
  if (!d.neutral && !d.extra) {
    let kind = null;
    if (key === 'expose') kind = o.right ? 'saw' : 'wronged';
    else if ((d.verdict || []).includes(key) && ok) kind = 'saw';
    else if (key === 'deal') kind = 'fooled';
    if (kind && (d.noJudge || []).includes(key)) kind = null;
    if (kind) { S.stats[kind]++; S.statLog.push({ deal: e.deal, kind, key, day: S.day, m: MON() }); }
  }
  S.log.push({ day: S.day, t: `${e.deal === 'd18' ? '管理單位' : NP[e.npc].name}：${d.title}（${e.done.label}）` });
  scanLearn();
}
function scheduleComplaint(l, qty, unit) {
  const reason = l.flags.includes('painted') ? 'painted' : l.flags.includes('damp') ? 'damp' : 'default';
  if (rnd('cmp' + l.id + S.day) < 0.65) S.complaints.push({ day: S.day + 1, item: l.item, qty, refund: rp(moneyFor(l.item, unit, qty)), cost: l.cost, q: l.q, flags: l.flags, label: l.label, reason });
}
const pawnable = () => S.lots.filter(l => !protectedLot(l) && IT[l.item].base && IT[l.item].base < 100 && !l.flags.some(f => ['stolen', 'sect', 'sting'].includes(f)));
const pawnValue = l => moneyFor(l.item, rp(price(l.item) * 0.7 * (l.known ? l.q : Math.min(1, l.q + 0.2))), l.qty);
function decideDues(key) {
  const e = S.enc, d = DEALS.d18;
  if (key === 'goods') {
    const ls = pawnable().sort((a, b) => pawnValue(b) - pawnValue(a));
    const took = [];
    for (const l of ls) { if (S.stones >= e.due) break; S.stones += pawnValue(l); took.push(l.label + '×' + l.qty); S.lots = S.lots.filter(x => x !== l); }
    e.th.push({ k: 'npc', t: `收費者讓人把${took.join('、')}搬走：「照市價七成，算你抵了。」` });
    if (S.stones >= e.due) { S.stones -= e.due; if (e.debtDue) S.debt = 0; e.th.push({ k: 'res', t: d.opts.pay.text, notes: ['－' + e.due + ' 靈石', '貨抵：' + took.join('、')] }); e.done = { key: 'pay', label: '貨抵' }; S.dues = { paid: true, amount: e.due }; }
    return;
  }
  if (key === 'poor') {
    e.poorTried = true;
    if ((S.stanceDays['收斂'] || 0) >= 4 && S.wind < M.windHigh) { e.due = MD().dues + (e.debtDue || 0); e.th.push({ k: 'npc', t: d.opts.poor.text.replace('八十', cnNum(MD().dues)) }); }
    else { e.th.push({ k: 'npc', t: d.opts.poor.fail.text.replace('一百', cnNum(MD().duesHigh)) }); applyFx(d.opts.poor.fail.fx); }
    return;
  }
  if (key === 'pay') {
    if (S.stones >= e.due) { S.stones -= e.due; if (e.debtDue) { S.debt = 0; addMem('qian', '你把上個月的借款連本帶利還清了。'); } e.th.push({ k: 'res', t: d.opts.pay.text + (e.debtDue ? '老錢把借據撕掉，點了點頭。' : ''), notes: ['－' + e.due + ' 靈石'] }); e.done = { key, label: '照付' }; }
    else {
      const owe = e.due - S.stones; S.debt = rp(owe); S.stones = 0; S.flags.debt = true; addMem('qian', `月底替你墊了 ${fmt(owe)} 靈石的規費。`);
      e.th.push({ k: 'res', t: `老錢在門口探頭：「差多少？我先替你墊上。」他把 ${fmt(owe)} 塊靈石放在櫃上：「三分利，下個月還。不急，不急。」`, notes: ['欠老錢 ' + fmt(owe)] });
      e.done = { key, label: '墊付' };
    }
    S.dues = { paid: true, amount: e.due };
  }
}

/* ----- generic walk-ins ----- */
function startWalkin() {
  const W = PL.walkins, k = 'w' + S.day + '-' + S.slot;
  const who = W.who[Math.floor(rnd(k + 'who') * W.who.length)];
  const dem = ((MON() > 1 ? W['demand' + MON()] : W.demand) || {})[S.day] || {};
  const sellable = S.lots.filter(l => !protectedLot(l) && (IT[l.item].sell || []).includes('walk') && !l.flags.some(f => ['sect', 'sting', 'contraband'].includes(f)));
  if (S.stance === '外放') S.wind++;
  const enc = { generic: true, who, npc: null, tea: 3, teaMax: 3, th: [], done: null, from: 'shop', chatted: false, haggled: false, lot: null };
  if (sellable.length && rnd(k + 'want') < 0.8) {
    const weights = sellable.map(l => dem[IT[l.item].cat] ?? 1);
    let r = rnd(k + 'pick') * weights.reduce((a, b) => a + b, 0), lot = sellable[0];
    for (let i = 0; i < sellable.length; i++) { r -= weights[i]; if (r <= 0) { lot = sellable[i]; break; } }
    const it = IT[lot.item];
    enc.lot = lot.id; enc.item = lot.item;
    enc.qty = Math.min(lot.qty, (1 + Math.floor(rnd(k + 'q') * (it.base >= 30 ? 1 : 3))) * (it.priceQty || 1));
    let p = price(lot.item) * (0.95 + rnd(k + 'p') * 0.14) * (S.stance === '外放' ? 1.03 : 1);
    enc.price = rp(p);
    enc.th.push({ k: 'narr', t: `${who}進了門。` });
    enc.th.push({ k: 'npc', t: `「老闆，${it.name}有嗎？${quantityText(enc.item, enc.qty)}，${cnPrice(enc.price)}／${quoteUnit(enc.item)}。」` });
    S.codex[lot.item] = true;
  } else {
    enc.th.push({ k: 'narr', t: `${who}進了門，看了一圈，什麼都沒買。` });
  }
  S.enc = enc; S.phase = 'enc';
}
function actChat() {
  const e = S.enc; e.chatted = true; e.tea -= 1;
  e.th.push({ k: 'me', t: '最近坊市裡有什麼新鮮事？' });
  const pool = ((MON() > 1 ? D.news['gossip' + MON()] : D.news.gossip) || {})[S.day] || [];
  const give = S.stance === '收斂' || rnd('g' + S.day + S.slot) < 0.3;
  S.gossipSeen = S.gossipSeen || {};
  const line = pool.find(g => !S.gossipSeen[g]);
  if (S.heat >= 5) { e.th.push({ k: 'npc', t: '他看了你一眼：「跟你說了，明天全坊市都知道。」' }); return; }
  if (give && line) { S.gossipSeen[line] = true; e.th.push({ k: 'npc', t: `「${line}」` }); noteGeneric('散客說：' + line, 'street'); }
  else e.th.push({ k: 'npc', t: give ? '「沒什麼新鮮的。」' : '他看了看你的修為，只點了點頭，沒多說。' });
}
function actGenericHaggle() {
  const e = S.enc; e.haggled = true;
  e.th.push({ k: 'me', t: '這價錢低了，再加一點。' });
  if (rnd('h' + S.day + S.slot) < 0.6) { e.price = rp(e.price * 1.07); e.th.push({ k: 'npc', t: `「行，${cnPrice(e.price)}。」` }); }
  else { e.th.push({ k: 'npc', t: '「那算了。」他轉身走了。' }); e.done = { key: 'decline', label: '沒談成' }; }
}
function decideGeneric(key) {
  const e = S.enc, l = lotById(e.lot);
  if (key === 'sell' || key === 'honest') {
    if (protectedLot(l)) return;
    const unit = key === 'honest' ? rp(e.price * l.q) : e.price;
    const q = Math.min(e.qty, l.qty);
    takeQty(l.item, q, l.id); S.stones += moneyFor(l.item, unit, q);
    if (key === 'honest') { S.rep.loose += 1; S.repTag.loose = '實在'; e.th.push({ k: 'res', t: `你把成色說清楚了。他想了想，照成色付了錢：「小許實在。」`, notes: ['＋' + fmt(moneyFor(l.item, unit, q)) + ' 靈石'] }); }
    else { e.th.push({ k: 'res', t: '他付了錢，把東西收好走了。', notes: ['＋' + fmt(moneyFor(l.item, unit, q)) + ' 靈石'] }); if (l.q < 0.7) scheduleComplaint(l, q, unit); }
    e.done = { key, label: key === 'honest' ? '照實' : '賣出' };
    S.log.push({ day: S.day, t: `散客買走${IT[l.item].name}×${q}` });
  } else { e.done = { key, label: '送客' }; e.th.push({ k: 'res', t: '他走了。' }); }
}
function closeEnc() {
  const e = S.enc; if (!e || !e.done) return;
  const from = e.from;
  if (e.deal === 'd14' && S.monthOne.s05 === 'legacy_active') S.monthOne.s05 = 'legacy_completed';
  if (M2_REPLACED.includes(e.deal) && S.monthTwo.legacy[e.deal] === 'active') S.monthTwo.legacy[e.deal] = 'completed';
  S.enc = null;
  if (from === 'shop') { S.phase = 'day'; advanceSlot(); }
  else if (from === 'dues') { S.phase = 'night'; }
  else { S.phase = 'place'; }
}
function startDues() { S.dues = { paid: false }; startDeal('d18', 'dues'); }

/* ================= places ================= */
function placeOpen(id) {
  const p = PL[id]; if (!p) return false;
  if (id === 'tie_workshop' && (MON() !== 2 || !S.monthTwo.tieAddress || S.day === 3 && (!D.month2.offers.O202.gate || !S.monthTwo.plan))) return false;
  if (id === 'tao_workshop' && (MON() !== 2 || !S.monthTwo.taoAddress || S.monthTwo.s11 !== 'heard')) return false;
  if (p.days && !p.days.includes(S.day)) return false;
  if (closedDays(p).includes(S.day)) return 'closed';
  return p.hours.includes(S.slot);
}
function closedDays(p) { return Array.isArray(p.closed) ? (MON() === 1 ? p.closed : []) : ((p.closed || {})[MON()] || []); }
function enterPlace(id) {
  if (placeOpen(id) !== true || S.slot >= 3 || !['day', 'place'].includes(S.phase)) return;
  S.visitSeq++; S.place = { id, session: S.month + ':' + S.day + ':' + S.visitSeq, acted: false, homeSeen: null }; S.phase = 'place';
  const p = PL[id]; if (p.npc) S.met[p.npc] = true;
  if (id === 'huichun') { (p.sells || []).forEach(s => { S.codex[s.item] = true; }); (p.display || []).forEach(x => { S.codex[x] = true; }); }
  if (id === 'pawn') S.codex.dangpiao = true;
}
function leavePlace() { advanceSlot(); }
function stallsToday() { return PL.market.stalls.filter(s => inMonth(s) && S.day >= s.days[0] && S.day <= s.days[1] && !(s.deal && DEALS[s.deal] && !S.done[s.deal] && !needOk(DEALS[s.deal].need))); }
const stallDeal = s => (s.deals || (s.deal ? [s.deal] : [])).map(id => DEALS[id]).find(d => d && dealAvail(d)) || DEALS[(s.deals || [s.deal])[0]];
function smithOffer(l) {
  const b = PL.smith.buys[l.item]; if (!b) return null;
  if (b.fixed) return b.fixed * l.q;
  let p = (b.useBase ? IT[l.item].base : price(l.item)) * b.mult * l.q; if (b.aliveBonus && l.flags.includes('alive')) p *= b.aliveBonus;
  return rp(p);
}
function sellToSmith(id) {
  const l = lotById(id); if (protectedLot(l)) return; const p = smithOffer(l); if (p == null) return;
  const total = PL.smith.buys[l.item].fixed ? p : moneyFor(l.item, p, l.qty);
  S.stones += total; S.lots = S.lots.filter(x => x !== l); S.met.tie = true;
  if (l.flags.includes('stolen') && l.item === 'duanshui') { addMem('tie', '你把那把斷水刀賣給了他。他什麼都沒問。'); }
  if (l.item === 'lingsui') S.flags.gave_tie_lingsui = true;
  learnTrigger('smith:' + l.item);
  S.place.say = PL.smith.buys[l.item].say; S.place.sayWho = 'tie'; toast(`賣給鐵師傅，＋${fmt(total)} 靈石`);
}
function commission() {
  const c = PL.smith.commission;
  if (ordinaryHeld(c.needItem) < c.needQty || S.stones < c.fee || S.commission) return;
  if (!takeOrdinary(c.needItem, c.needQty)) return; S.stones -= c.fee; S.commission = { ready: S.day + c.days, done: false, cost: c.fee + moneyFor(c.needItem, 8, c.needQty) };
  S.homes.tie = true; addRel('tie', 1); S.place.say = c.say; S.place.sayWho = 'tie'; toast('鐵師傅接了活。三天。');
}
function huichunOffer(l) {
  const it = IT[l.item]; if (!(it.sell || []).includes('huichun')) return null;
  if (l.flags.some(f => ['sect', 'sting', 'stolen'].includes(f))) return 'refuse-sect';
  if (l.flags.includes('painted')) return 'refuse-paint';
  return rp(price(l.item) * PL.huichun.buyMult * l.q);
}
function sellToHuichun(id) {
  const l = lotById(id); if (protectedLot(l)) return; const o = huichunOffer(l); if (o == null) return;
  if (o === 'refuse-sect') { S.place.say = '「寒潭宗的東西，回春藥行不收。小許，這東西你最好別留。」'; l.known = true; return; }
  if (o === 'refuse-paint') { S.place.say = '張老闆把葉子翻過來，對著光看了一眼：「金線是畫的。小許，回春藥行不收這種東西。」'; l.known = true; addRel('zhang', -1); S.flags.zhang_saw_fake = true; return; }
  const total = moneyFor(l.item, o, l.qty); S.stones += total; l.known = true; S.lots = S.lots.filter(x => x !== l);
  S.place.say = l.q < 0.9 ? `「成色差了些，${cnPrice(o)}一${IT[l.item].unit}。」張老闆慢慢點了靈石。` : '張老闆點了點頭，慢慢點了靈石。';
  toast(`賣給回春藥行，＋${fmt(total)} 靈石`);
}
function buyFromHuichun(item) {
  const s = PL.huichun.sells.find(x => x.item === item), p = rp(price(item) * s.mult);
  if (S.stones < p) { toast('靈石不夠'); return; }
  S.stones -= p; addLot({ item, qty: 1, cost: p, known: true }); toast(`買了一${IT[item].unit}${IT[item].name}`);
}
function herbStock() { return PL.herbStock.find(h => inMonth(h) && S.day >= h.days[0] && S.day <= h.days[1]); }
function buyHerb() {
  const h = herbStock(); const n = S.herbBought[S.day] || 0;
  if (!h || n >= h.max || S.stones < h.price) return;
  S.stones -= h.price; S.herbBought[S.day] = n + 1; S.met.ge = true;
  const ex = S.lots.find(l => l.from === 'ge' + S.day);
  if (ex) ex.qty++; else addLot({ item: h.item, qty: 1, cost: h.price, q: h.q, label: h.q < 0.7 ? '老葛的赤炎草（早熟）' : '老葛的赤炎草', known: true, from: 'ge' + S.day });
}
function buyTea(i) {
  const t = D.news.teahouse.filter(x => inMonth(x) && x.day === S.day)[i]; if (!t) return;
  const b = S.teaBought[S.day] = S.teaBought[S.day] || [];
  if (b.includes(i) || S.stones < t.price) return;
  S.stones -= t.price; b.push(i); S.log.push({ day: S.day, t: '聽雨樓：' + t.text, rumor: true });
  noteGeneric('聽雨樓的消息單：' + t.text, 'bai');
}
function overhear() { if (S.overheard[S.day]) return; S.overheard[S.day] = true; const oh = D.news.overhear.find(o => inMonth(o) && o.day === S.day); if (oh && !learnTrigger('oh:' + MON() + ':' + S.day)) noteGeneric('在聽雨樓聽到隔壁桌說：' + oh.text, 'bai'); }
function askBai(who) {
  const c = PL.tea.askCost; if (S.stones < c) { toast('靈石不夠'); return; }
  S.stones -= c; S.place.say = '「' + (PL.tea.about[who] || '這個人，我不熟。') + '」'; S.place.sayWho = 'bai'; UI.sheet = null;
  addMem(who, '白七娘說：' + (PL.tea.about[who] || ''));
  noteGeneric(`白七娘說起${NP[who].name}：「${PL.tea.about[who] || '這個人，我不熟。'}」`, 'bai');
}
function turnIn(kind, answer) {
  const z = 'zhou';
  if (kind === 'xuechan') {
    const lot = S.lots.find(l => l.item === 'xuechan'); if (!lot) return;
    const reward = S.flags.bounty_seen ? 60 : 40;
    S.lots = S.lots.filter(l => l !== lot);
    let text;
    if (lot.flags.includes('entrusted')) {
      S.stones += reward / 2; addRel('aheng', 2); addRel(z, 1); S.rep.loose += 1; S.repTag.loose = '守信'; S.flags.aheng_paid = true;
      text = `周正收下玉匣，記了一筆，給了你 ${reward} 塊。你把一半包好，託人送去給阿蘅。`;
      addMem('aheng', '你把賞錢分了她一半。');
    } else if (answer === 'aheng') {
      S.stones += reward; addRel(z, 2); addRel('aheng', -5); S.flags.aheng_taken = true; S.rep.loose -= 2; S.repTag.loose = '會報案'; S.rep.sect += 1;
      text = `「採藥的阿蘅？」周正記下了名字，給了你 ${reward} 塊：「小許明事理。」`;
      addMem('aheng', '你把她的名字報給了派出所。');
    } else {
      S.stones += reward; addRel(z, -1);
      text = `「路過的散修？」周正看了你很久，還是給了你 ${reward} 塊：「下回記清楚些。」`;
    }
    S.flags.xuechan_turned = true; S.place.say = text; addMem(z, '你交出了寒潭宗的雪蟾酥。');
  }
  if (kind === 'duanshui') {
    const lot = S.lots.find(l => l.item === 'duanshui'); if (!lot) return;
    S.lots = S.lots.filter(l => l !== lot); S.stones += 20; addRel(z, 1); S.flags.knife_turned = true;
    S.place.say = '周正接過刀，翻過來看了看刀柄：「余小六的刀。」他給了你二十塊。';
  }
  if (kind === 'sting') {
    S.lots = S.lots.filter(l => !l.flags.includes('sting')); S.events = S.events.filter(e => e.id !== 'e_sting'); addRel(z, 1); S.flags.passed_sting = true;
    S.place.say = '周正看著那三枚療傷丹，笑了：「你倒是機靈。」他把丹藥收了，沒罰你。';
  }
  UI.sheet = null;
}
function redeem() { if (S.stones < M.redeemCost) return; S.stones -= M.redeemCost; S.lifespan++; S.place.say = '「許先生，已換回一個月。」典主在當票上添了一筆。'; }
function visitHome(npc) { S.place.homeSeen = npc; S.place.acted = true; S.met[npc] = true; learnTrigger('home:' + npc);
  if (npc === 'yao') { S.flags.knows_yao_paints = true; addMem('yao', '家裡桌上有一碟金粉和一支極細的狼毫筆，筆尖是濕的。'); }
  if (npc === 'aheng') { S.flags.saw_aheng_home = true; addMem('aheng', '門口有一雙男人的鞋，鞋底是鬼市巷子的黑泥。'); }
  if (npc === 'tie') addMem('tie', '屋裡有一張給孩子坐的小板凳。');
}
function homesKnown() { return Object.keys(NP).filter(n => NP[n].home && !(n === 'yao' && S.flags.yao_left) && !(n === 'aheng' && S.flags.ahe_taken && MON() > 1) && (S.homes[n] || (n === 'aheng' && (rel('aheng') >= 2 || S.flags.aheng_entrust)))); }

/* ================= intel ================= */
function learnIntel(id, src) {
  if (S.intel[id] || !IN[id]) return false;
  S.intel[id] = { day: S.day, m: MON(), src };
  if (S.enc && S.enc.th) S.enc.th.push({ k: 'note', t: '記進消息簿：' + IN[id].short });
  return true;
}
function learnTrigger(trig) {
  let hit = false;
  for (const [id, I] of Object.entries(IN)) if ((I.from || []).includes(trig)) { hit = true; learnIntel(id, trig); }
  return hit;
}
function noteGeneric(text, src) { const k = 'g' + Math.floor(hash(text) * 1e9); if (!S.intel[k]) S.intel[k] = { day: S.day, m: MON(), src, text }; }
function scanLearn() {
  for (const [id, I] of Object.entries(IN)) {
    if (S.intel[id]) continue;
    if ((I.flag && I.flag.some(f => S.flags[f])) || (I.need && needOk(I.need))) learnIntel(id, 'flag');
  }
  scanOpportunities();
}
const FRESH = [1, 0.85, 0.7, 0.55];
const intelShared = I => (I.sharedIf || []).some(f => S.flags[f]);
const intelSolo = I => !!I.exclusive && !intelShared(I);
const intelDead = I => ((I.month || 1) !== MON() && !I.evergreen) || (I.expire && S.day > I.expire) || (I.expireFlag || []).some(f => S.flags[f]);
const intelAgeDays = rec => (MON() - (rec.m || 1)) * M.days + S.day - rec.day;
const intelPublic = I => I.public && ((I.month || 1) < MON() || S.day >= I.public);
function intelAge(rec) { const a = intelAgeDays(rec); return a <= 0 ? '新鮮' : a === 1 ? '還熱' : a === 2 ? '溫了' : '舊了'; }
function intelOffer(id, premium = 1) {
  const rec = S.intel[id]; if (!rec) return { price: 0, why: '' };
  if (!IN[id]) return { price: 0, why: rec.src === 'bai' ? '聽雨樓自己的消息' : rec.src === 'street' ? '坊間人人都在說' : '這種話，她自己問得到' };
  const I = IN[id];
  if (S.isold[id]) return { price: 0, why: S.isold[id].barter ? '已經拿去換過了' : '已經賣給她了' };
  if (I.fromBai) return { price: 0, why: '聽雨樓自己的消息' };
  if (I.refuse) return { price: 0, why: '她不收', refuse: I.refuse };
  if (!I.value) return { price: 0, why: '這也算消息？' };
  if (intelDead(I)) return { price: 0, why: '舊聞，沒人要了' };
  if (I.fixedPrice) return { price: I.fixedPrice, why: '' };
  let v = I.value * FRESH[Math.min(3, Math.max(0, intelAgeDays(rec)))];
  if (intelPublic(I)) v *= 0.25; else if (intelSolo(I)) v *= 1.2;
  if (I.hot && (I.month || 1) === MON() && S.day >= I.hot[0] && S.day <= I.hot[1]) v *= 1.25;
  if (S.flags.bai_burned) v *= 0.6;
  if (S.heat >= 5) v *= 0.8;
  const price = Math.round(v * premium);
  return { price, why: price ? '' : '不值什麼錢了' };
}
function baiSays(I, p) { return I.baiText || (p >= 15 ? '白七娘的笑深了一點：「這一則，值錢。」' : p >= 8 ? '白七娘點點頭：「還算新鮮。」' : '白七娘撥了撥算盤：「聊勝於無。」'); }
function sellIntel(id, premium = 1) {
  const I = IN[id], o = intelOffer(id, premium); if (!I || !o.price) return null;
  const solo = intelSolo(I);
  S.stones += o.price; S.isold[id] = { day: S.day, m: MON(), price: o.price };
  S.heat += 1 + (solo ? 1 : 0);
  if (I.sellFlag) S.flags[I.sellFlag] = true;
  addMem('bai', `你賣給她一則消息：${I.short}。`);
  if (I.leak) S.events.push({ id: 'leak:' + id, day: S.day + 1 });
  if (I.truth === false) S.events.push({ id: 'burn:' + id, day: Math.max(S.day + 1, I.reveal || 0) });
  if (I.spread && !I.suppress) S.extraNews.push({ day: S.day + 1, src: '聽雨樓傳出', text: I.spread });
  for (const lv of Object.keys(D.heat || {}).map(Number).sort((a, b) => a - b)) if (S.heat >= lv && !S.flags['heat' + lv]) { S.flags['heat' + lv] = true; S.events.push({ id: 'heat:' + lv, day: S.day + 1 }); }
  S.log.push({ day: S.day, t: `賣給白七娘：${I.short}（${o.price} 靈石）` });
  return o.price;
}
function sellAtTea(id) {
  const I = IN[id]; if (!I) return;
  const o = intelOffer(id);
  UI.sheet = null; S.place.sayWho = 'bai';
  if (o.refuse) { S.place.say = o.refuse; return; }
  if ((S.baiSold[S.day] || 0) >= 2) return;
  const p = sellIntel(id); if (p == null) return;
  S.baiSold[S.day] = (S.baiSold[S.day] || 0) + 1;
  S.place.say = baiSays(I, p); toast(`＋${p} 靈石`);
}
function decideBarter(id) {
  const e = S.enc, d = DEALS[e.deal], I = IN[id], o = d.opts.barter; if (!I || !o) return;
  const solo = intelSolo(I);
  S.isold[id] = { day: S.day, m: MON(), price: 0, barter: true }; S.heat += 1 + (solo ? 1 : 0);
  if (I.sellFlag) S.flags[I.sellFlag] = true;
  if (I.leak) S.events.push({ id: 'leak:' + id, day: S.day + 1 });
  if (I.spread && !I.suppress) S.extraNews.push({ day: S.day + 1, src: '聽雨樓傳出', text: I.spread });
  for (const lv of Object.keys(D.heat || {}).map(Number).sort((a, b) => a - b)) if (S.heat >= lv && !S.flags['heat' + lv]) { S.flags['heat' + lv] = true; S.events.push({ id: 'heat:' + lv, day: S.day + 1 }); }
  e.th.push({ k: 'me', t: `（你把「${I.short}」說給她聽。）` });
  const notes = applyFx(o.fx);
  e.th.push({ k: 'res', t: sub(o.text, e.npc), notes });
  e.done = { key: 'barter', label: '拿消息換', notes, seal: '換訊' }; S.done[e.deal] = 'barter';
  S.log.push({ day: S.day, t: `拿「${I.short}」跟白七娘換了消息` });
  scanLearn();
}
function decideInfo(id) {
  const e = S.enc, I = IN[id]; const p = sellIntel(id, 1.1); if (p == null) return;
  e.th.push({ k: 'me', t: `（你把「${I.short}」說給她聽。）` });
  e.th.push({ k: 'res', t: baiSays(I, p), notes: ['＋' + fmt(p) + ' 靈石'] });
  e.done = { key: 'info', label: '賣消息', notes: [], seal: '賣訊' }; S.done[e.deal] = 'info';
}
/* ----- accusations ----- */
const accuseList = () => ACC.filter(a => !S.accused[a.id] && needOk(a.show));
function evidenceHad(a) {
  return a.evidence.filter(ev => ev.lotKnown ? S.lots.some(l => l.item === ev.lotKnown && l.known) : ev.lotFlag ? S.lots.some(l => l.known && l.flags.includes(ev.lotFlag)) : ev.has ? held(ev.has) > 0 : ev.intel ? !!S.intel[ev.intel] : ev.flag ? !!S.flags[ev.flag] : false);
}
function accuse(id) {
  const a = ACC.find(x => x.id === id); if (!a || S.accused[id]) return;
  const strength = evidenceHad(a).length;
  const c = a.cases.find(c => {
    const f = { ...(c.if || {}) };
    if (f.dayAfter != null && !(S.day > f.dayAfter)) return false;
    if (f.strength != null && strength < f.strength) return false;
    delete f.dayAfter; delete f.strength; return needOk(f);
  });
  UI.sheet = null; if (!c) return;
  S.accused[id] = true;
  const notes = applyFx(c.fx);
  S.place.say = c.text; S.place.sayWho = 'zhou';
  if (notes.length) toast(notes.join('　'));
  S.log.push({ day: S.day, t: '派出所：' + a.label });
}

/* ================= night ================= */
function meditate(invest, burn, pill) {
  invest = Math.max(0, Math.min(invest, S.stones, M.nightCap));
  let gain = invest * (burn ? 1.4 : 1);
  let burnQ = 1;
  if (burn) { const bl = S.lots.find(l => l.item === 'dingshen' && !protectedLot(l)); burnQ = bl ? bl.q : 1; takeOrdinary('dingshen', 1); gain = invest * (1 + 0.4 * burnQ); }
  if (pill) { takeOrdinary('yangqi', 1); gain += S.pillYesterday ? 9 : 18; }
  S.stones -= invest; S.xp += Math.round(gain); S.pillYesterday = !!pill;
  const before = S.level; let need = M.xpNeed[S.level];
  while (S.level < 9 && S.xp >= need) { S.xp -= need; S.level++; need = M.xpNeed[S.level]; }
  S.night = { invest, gain: Math.round(gain), up: S.level > before, weak: burn && burnQ < 0.9 };
}
function netWorth(trueQ = true) { return S.stones + S.lots.reduce((a, l) => a + (externalLot(l) ? 0 : lotValue(l, Math.min(S.day, M.days), trueQ)), 0) + reservedStockValue() - S.debt; }

/* ================= rendering ================= */
const $app = $('#app'), $bar = $('#bar'), $hud = $('#hud'), $sheet = $('#sheet');
function sealSVG(word) {
  const w = String(word).slice(0, 2);
  return `<svg class="seal-stamp" viewBox="0 0 100 100" aria-hidden="true"><defs><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></defs><g filter="url(#rough)" fill="none" stroke="var(--cinnabar)" stroke-width="5"><rect x="8" y="8" width="84" height="84" rx="6"/></g><text x="50" y="${w.length > 1 ? 47 : 64}" text-anchor="middle" font-family="var(--serif)" font-weight="900" font-size="${w.length > 1 ? 30 : 44}" fill="var(--cinnabar)" filter="url(#rough)">${esc(w[0])}</text>${w.length > 1 ? `<text x="50" y="80" text-anchor="middle" font-family="var(--serif)" font-weight="900" font-size="30" fill="var(--cinnabar)" filter="url(#rough)">${esc(w[1])}</text>` : ''}</svg>`;
}
function teaSVG(ratio) {
  const steam = ratio > 0.67 ? 3 : ratio > 0.34 ? 2 : ratio > 0 ? 1 : 0;
  const wisps = [0, 1, 2].map(i => `<path d="M${15 + i * 7} 14 q-3 -4 0 -7 q3 -3 0 -6" fill="none" stroke="var(--ink-2)" stroke-width="1.5" stroke-linecap="round" opacity="${i < steam ? 0.9 : 0.12}"/>`).join('');
  return `<svg viewBox="0 0 44 44" aria-hidden="true">${wisps}<path d="M8 20 h26 l-3 14 q-1 4 -5 4 h-10 q-4 0 -5 -4 z" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1.6"/><path d="M34 23 q5 0 5 4 q0 4 -6 5" fill="none" stroke="var(--ink)" stroke-width="1.6"/><path d="M10 25 h22" stroke="var(--jade)" stroke-width="${steam ? 3 : 0}" opacity=".5"/></svg>`;
}
const teaWord = r => r > 0.67 ? '熱' : r > 0.34 ? '溫' : r > 0 ? '涼' : '冷';

function renderHUD() {
  if (!S || UI.view === 'title') { $hud.hidden = true; return; }
  $hud.hidden = false;
  const dn = (MON() > 1 ? `<small class="mon">${monthLabel(MON())}</small>` : '') + (M.dayNames[Math.min(S.day, M.days) - 1] || '月底');
  const mk = MD().marketDay;
  const tag = S.day === mk ? '市集日' : S.day < mk ? M.dayNames[mk - 1] + '市集' : S.day === M.days ? '月底' : '';
  const slots = ['辰', '午', '申', '戌'].map((s, i) => {
    const cur = S.phase === 'end' ? 4 : S.phase === 'morning' ? -1 : (S.phase === 'night' || S.phase === 'dues' || S.slot >= 3) ? 3 : S.slot;
    return `<span class="${i < cur ? 'past' : i === cur ? 'now' : ''}">${s}</span>`;
  }).join('');
  const need = M.xpNeed[S.level];
  const sp = M.spirit[S.level] || 2;
  $hud.innerHTML = `<div class="hud-top"><div class="hud-day">${dn}${tag ? `<span class="tagline">${tag}</span>` : ''}</div><div class="track" aria-label="時段">${slots}</div></div>
  <div class="hud-stats"><span class="stone">靈石 <b>${fmt(S.stones)}</b></span><span>${lvName(S.level)}<span class="xpbar" title="修為 ${S.xp}/${need}"><i style="width:${Math.min(100, S.xp / need * 100)}%"></i></span></span><span>靈識 <span class="dots">${'●'.repeat(S.spirit)}<s>${'●'.repeat(Math.max(0, sp - S.spirit))}</s></span></span>
  <span class="stance" role="group" aria-label="氣息"><button data-act="stance" data-v="收斂" class="${S.stance === '收斂' ? 'on' : ''}">收斂</button><button data-act="stance" data-v="外放" class="${S.stance === '外放' ? 'on' : ''}">外放</button></span></div>`;
}

function renderTitle() {
  const saved = S && S.phase !== 'end';
  return `<section class="title">
    <div class="stack">
      <div class="ticket"><span class="label">長生典 · 當票</span><p class="q">${esc(D.intro.ticket)}</p><div class="left">還剩${monthsText(M.lifespan)}</div>
      <svg class="seal" viewBox="0 0 60 60" aria-hidden="true"><rect x="4" y="4" width="52" height="52" rx="4" fill="none" stroke="var(--cinnabar)" stroke-width="3"/><text x="30" y="27" text-anchor="middle" font-family="var(--serif)" font-weight="900" font-size="17" fill="var(--cinnabar)">長生</text><text x="30" y="47" text-anchor="middle" font-family="var(--serif)" font-weight="900" font-size="17" fill="var(--cinnabar)">典押</text></svg></div>
      <p class="lede">${esc(D.intro.lede)}</p>
    </div>
    <h1 class="title-v">坊市掌櫃<small>許衡的店 · ${saved ? monthLabel(S.month) : monthLabel(1)}</small></h1>
  </section>
  <section class="card stack"><p class="lede">${esc(D.intro.how)}</p><p class="lede small muted">${esc(D.intro.stance)}</p><p class="lede"><b>${esc(D.intro.goal)}</b></p></section>
  <p class="small muted">前兩月的商機與外出相遇已接入；普通生意與拒絕路線都可以繼續。</p><div class="title-actions">${loadProblem ? `<p>這份新故事進度無法安全載入：${esc(loadProblem)}</p><button class="btn quiet" data-act="rawexport">匯出原檔保留</button>` : saved ? `<button class="btn primary wide" data-act="continue">繼續：${S.month > 1 ? monthLabel(S.month) + '・' : ''}${M.dayNames[Math.min(S.day, M.days) - 1]}</button><button class="btn quiet wide" data-act="askrestart">重新開始</button>` : `<button class="btn primary wide" data-act="new">新故事開張</button>`}</div>${legacyPanelHTML()}`;
}

function newsHTML(id, short) {
  const n = NEWS.find(x => x.id === id);
  const goods = (n.goods || []).map(g => IT[g] ? IT[g].name : g).join('、');
  return `<div class="newscard"><div class="src">${esc(n.source)}</div><div class="txt">${esc(n.text)}</div>${!short && (goods || (n.ask || []).length) ? `<div class="meta">${goods ? '牽動：' + esc(goods) : ''}${goods && n.ask.length ? '　·　' : ''}${n.ask && n.ask.length ? '打聽：' + esc(n.ask.join('、')) : ''}</div>` : ''}</div>`;
}
const extraToday = () => (S.extraNews || []).filter(n => n.day === S.day);
const extraHTML = n => `<div class="newscard"><div class="src">${esc(n.src)}</div><div class="txt">${esc(n.text)}</div></div>`;
function renderMorning() {
  const cards = S.cards.map(c => `<div class="event${c.face ? ' withface' : ''}">${c.face ? portrait('me', c.face, 'evface') : ''}<h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>${c.notes && c.notes.length ? `<div class="fxline">${esc(c.notes.join('　'))}</div>` : ''}</div>`).join('');
  return `<h2 class="sec-h">晨報</h2>${cards ? `<div class="stack">${cards}</div>` : ''}
  <div class="card" style="margin-top:12px">${S.todayNews.map(id => `<button class="btn quiet wide" data-act="readnews" data-id="${id}">閱讀報紙：${esc(NEWS.find(n => n.id === id).source)}</button>`).join('') + extraToday().map(extraHTML).join('') || '<p class="muted">今天坊市很安靜。</p>'}</div>${opportunityHTML()}
  <p class="small muted" style="margin-top:10px">消息不保證是真的。放消息的人，通常最想讓它成真。</p>`;
}

function renderHub() {
  let h = `<div class="ticket" style="margin-top:14px;padding:8px 12px"><span class="label">長生典</span>　<b class="cin">還剩${monthsText(S.lifespan)}</b>${S.debt ? `　<span class="pill cin">欠老錢 ${fmt(S.debt)}</span>` : ''}</div>`;
  const nn = S.todayNews.length + extraToday().length;
  if (nn) h += `<details class="card" style="margin-top:10px"><summary class="small muted">今天的消息（${nn}）</summary>${S.todayNews.map(id => `<button class="btn quiet wide" data-act="readnews" data-id="${id}">閱讀報紙：${esc(NEWS.find(n => n.id === id).source)}</button>`).join('')}${extraToday().map(extraHTML).join('')}</details>`;
  h += opportunityHTML();
  if (S.slot < 3) {
    h += `<h2 class="sec-h">${SLOT[S.slot]}</h2><div class="choice">
      <button class="go" data-act="shop"><div><div class="gt">顧店</div><div class="gd">坐在櫃檯後面，等客人上門。${S.flags.lamp ? '狐尾燈亮著。' : ''}</div></div><span class="arrow">›</span></button></div>
      <h2 class="sec-h">出門</h2><div class="places">`;
    for (const id of ['market', 'tie_workshop', 'tao_workshop', 'huichun', 'tea', 'office', 'herb', 'homes', 'pawn']) {
      const p = PL[id]; const o = placeOpen(id);
      if (p.days && !p.days.includes(S.day)) continue;
      if (id === 'tie_workshop' && (MON() !== 2 || !S.monthTwo.tieAddress || S.day === 3 && !D.month2.offers.O202.gate)) continue;
      if (id === 'tao_workshop' && (MON() !== 2 || !S.monthTwo.taoAddress)) continue;
      let note = '';
      if (o === 'closed') note = '今天封路';
      else if (!o) note = '這個時段沒開（' + p.hours.map(x => SLOT[x][0]).join('、') + '）';
      else if (id === 'market') note = S.day === MD().marketDay ? '外地攤子只擺今天，還可以自己擺攤' : stallsToday().map(s => NP[s.npc].name).join('、') + (S.day < MD().marketDay ? `（${M.dayNames[MD().marketDay - 1]}市集日）` : '');
      else if (id === 'homes') note = homesKnown().length ? '知道 ' + homesKnown().length + ' 處住址' : '還不知道誰住哪';
      else if (p.npc) note = NP[p.npc].name + (id === 'tea' ? '　消息、偷聽' : id === 'office' ? (S.flags.bounty_seen ? '　懸賞' : '') : '');
      const hot = id === 'market' && S.day === MD().marketDay;
      h += `<button class="place${hot ? ' hot' : ''}" data-act="enter" data-id="${id}" ${o === true ? '' : 'disabled'}><b>${esc(p.name)}${hot ? '<em>市集日</em>' : ''}</b><span>${esc(note)}</span></button>`;
    }
    h += `</div>`;
  }
  const todayLog = S.log.filter(l => l.day === S.day);
  if (todayLog.length) h += `<h2 class="sec-h">今天</h2><div class="card small">${todayLog.map(l => `<div>${esc(l.t)}</div>`).join('')}</div>`;
  return h;
}

function goodsCard(e) {
  if (e.generic) {
    if (!e.lot) return '';
    const l = lotById(e.lot), it = IT[e.item];
    return `<div class="goods${e.done ? ' done' : ''}"><div class="g-grade">${esc(it.grade)}　·　你的貨：${esc(l ? l.label : it.name)}</div><div class="g-name">${icon(e.item)}<span>${esc(it.name)} ${quantityText(e.item, e.qty)}</span></div>
      <div class="g-price"><b>${fmt(e.price)}</b><span class="muted">靈石／${esc(quoteUnit(e.item))}</span><span class="g-mkt">今日市價 ${fmt(price(e.item))}　·　你的成本 ${l ? fmt(l.cost) : '—'}</span></div>
      <button class="g-link" data-act="lore" data-id="${e.item}">物品文本</button>${e.done ? sealSVG(e.done.label) : ''}</div>`;
  }
  const d = DEALS[e.deal]; const it = IT[d.item];
  const name = d.itemName || (d.lot && d.lot.label) || (it && it.name) || d.item;
  let price_ = '';
  if (d.side === 'sell') price_ = `<b>${fmt(e.price)}</b><span class="muted">靈石／${esc(it ? quoteUnit(d.item) : '件')}</span>${e.qty > 1 ? `<span class="g-mkt">共 ${fmt(moneyFor(e.item, e.price, e.qty))}</span>` : ''}${it && it.base ? `<span class="g-mkt">今日市價 ${fmt(price(d.item))}</span>` : ''}`;
  else if (e.deal === 'd01') price_ = `<b>${fmt(moneyFor(e.item, e.price, e.qty))}</b><span class="muted">靈石／目前這批 ${quantityText(e.item, e.qty)}</span><span class="g-mkt">六公斤整批基準 ${fmt(e.price * 10)}；不足六公斤按實際重量比例計</span>`;
  else if (d.side === 'buy') price_ = `<b>${fmt(e.price)}</b><span class="muted">他出的價／${esc(quoteUnit(e.item))}</span><span class="g-mkt">今日市價 ${fmt(price(d.item))}　·　你有 ${quantityText(d.item, held(d.item))}</span>`;
  else if (e.deal === 'd18') price_ = `<b>${fmt(e.due)}</b><span class="muted">靈石</span><span class="g-mkt">你有 ${fmt(S.stones)}</span>`;
  else if (d.price) price_ = `<b>${fmt(e.price)}</b><span class="muted">靈石辛苦費</span>`;
  let lots = '';
  if (d.side === 'buy' && !e.done) {
    const ls = S.lots.filter(l => l.item === d.item && !protectedLot(l));
    if (ls.filter(l => !protectedLot(l)).length > 1) lots = `<div class="lotpick" role="group" aria-label="賣哪一批">${ls.map(l => `<button data-act="pick" data-id="${l.id}" class="${l.id === e.lot ? 'on' : ''}">${esc(l.label)} ${quantityText(l.item, l.qty)}${l.known && l.q < 0.9 ? '（成色差）' : ''}</button>`).join('')}</div>`;
  }
  return `<div class="goods${e.done ? ' done' : ''}">${it ? `<div class="g-grade">${esc(it.grade)}</div>` : ''}<div class="g-name">${icon(d.item)}<span>${esc(name)}${e.qty > 1 ? ' ' + quantityText(e.item, e.qty) : ''}</span></div>
    <div class="g-price">${price_}</div>${lots}${it && it.text ? `<button class="g-link" data-act="lore" data-id="${d.item}">物品文本</button>` : ''}${e.done ? sealSVG(e.done.seal || e.done.label) : ''}</div>`;
}
function renderEnc() {
  if (S.enc && (S.enc.m2scene || S.enc.m2offer)) return m2EncounterHTML();
  if (S.enc && S.enc.scene) return renderMonthOneEncounter();
  if (S.enc && S.enc.opportunity) return renderOpportunityEncounter();
  const e = S.enc;
  let head;
  if (e.generic) head = `<div class="who"><div><div class="nm">散客</div><div class="rl">${esc(e.who)}</div></div><div class="tea">${teaSVG(e.tea / e.teaMax)}<span>${teaWord(e.tea / e.teaMax)}</span></div></div>`;
  else if (e.deal === 'd18') head = '<div class="who"><div><div class="nm">來收規費的人</div><div class="rl">聚落管理單位</div></div></div>';
  else { const n = NP[e.npc]; head = `<div class="who">${portrait(e.npc, e.face, 'big')}<div><div class="nm">${esc(n.name)}</div><div class="rl">${esc(n.role)}</div><div class="lv muted">${esc(npcLv(e.npc))}${S.rel[e.npc] ? '　·　' + attitude(e.npc) : ''}</div></div><div class="tea" title="對方的耐心">${teaSVG(e.tea / e.teaMax)}<span>${teaWord(e.tea / e.teaMax)}</span></div></div>`; }
  const th = e.th.map(x => {
    if (x.k === 'npc') return `<div class="ln"><span class="sp">${x.who ? portrait(x.who, x.f, 'tiny') : ''}${esc(x.who ? NP[x.who].name : e.generic ? '散客' : e.deal === 'd18' ? '收費者' : NP[e.npc].name)}</span><span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'me') return `<div class="ln me">${x.f ? portrait('me', x.f, 'tiny me') : ''}<span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'sys') return `<div class="ln sys"><span class="label">靈識</span><span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'res') return `<div class="ln res"><span class="tx">${esc(x.t)}</span>${x.notes && x.notes.length ? `<span class="small muted">${esc(x.notes.join('　'))}</span>` : ''}</div>`;
    return `<div class="ln ${x.k}"><span class="tx">${esc(x.t)}</span></div>`;
  }).join('');
  return `${M2_REPLACED.includes(e.deal) ? '<p class="small muted">上版已開始的收購，保留原貨、報價與後續事件結清；不補新版試架或送壺回憶。</p>' : ''}${e.deal === 'd14' ? '<p class="small muted">上版已開始的狼牙交易，按原貨、原條款結清；這局不補發薄荷相遇。</p>' : ''}${head}${goodsCard(e)}<div class="thread" id="thread">${th}</div>`;
}

function renderPlace() {
  const id = S.place.id, p = PL[id];
  let h = `<div class="who"><div><div class="nm">${esc(p.name)}</div><div class="rl">${esc(SLOT[S.slot] || '')}</div></div></div><p class="serif" style="margin-top:8px;line-height:1.85">${esc(p.blurb)}${id === 'market' && S.day === MD().marketDay ? ' ' + esc(p.blurbMarketDay) : ''}</p>`;
  if (S.place.say) h += `<div class="ln" style="margin-top:12px">${S.place.sayWho || p.npc ? `<span class="sp">${esc(NP[S.place.sayWho || p.npc].name)}</span>` : ''}<span class="tx">${esc(S.place.say)}</span></div>`;
  h += m2PlaceHTML();
  if (id === 'market') {
    h += opportunityMarketHTML();
    h += `<h2 class="sec-h">攤子</h2><div class="stack">`;
    for (const s of stallsToday()) {
      const n = NP[s.npc];
      if (s.special === 'smith') { h += smithHTML(s); continue; }
      const d = stallDeal(s), done = d && S.done[d.id];
      const avail = d && dealAvail(d);
      h += `<div class="person"><div class="ph"><b>${esc(n.name)}</b><span class="small muted">${esc(n.role)}</span></div><p class="serif small">${esc(s.goods)}</p>
        ${avail ? `<button class="btn quiet" data-act="deal" data-id="${d.id}">上前看看</button>` : `<span class="small muted">${done ? '已經談過了。' : '今天沒有你的事。'}</span>`}${s.npc === 'mang' && done !== 'special' && S.flags.mang_saw_jiansui && held('yupai') && !S.flags.mang_saw_yupai ? `<button class="btn quiet" data-act="mangyupai">給她看霜紋玉牌</button>` : ''}</div>`;
    }
    h += `</div>`;
    if (S.day === MD().marketDay) h += `<h2 class="sec-h">擺攤</h2><p class="small muted">市集日可以自己擺個攤，客人多是逛街的散修，賣得快、利薄。照市價九五折，最多擺三批貨。</p><button class="btn quiet wide" data-act="stall" ${S.place.stalled ? 'disabled' : ''}>${S.place.stalled ? '今天擺過了' : '擺攤'}</button>`;
  }
  if (id === 'huichun') {
    h += `<h2 class="sec-h">藥櫃</h2><p class="small muted" style="margin-bottom:6px">回春藥行賣得比市價貴一成半，收貨只給八折，拿來轉賣通常虧錢。要賺，得趕在消息讓價錢漲起來之前買；定神香、養氣丹則是夜裡打坐自己用的。你不煉丹。</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>貨</th><th class="r">價</th><th></th></tr></thead><tbody>`;
    for (const s of p.sells) { const pr = rp(price(s.item) * s.mult); h += `<tr><td><button class="g-link ilink" style="margin:0" data-act="lore" data-id="${s.item}">${icon(s.item, 'sm')}<span>${esc(IT[s.item].name)}</span></button><div class="small muted">${esc(IT[s.item].grade)}${['dingshen', 'yangqi'].includes(s.item) ? '　·　<span class="jade">夜裡打坐用</span>' : ''}</div></td><td class="r">${fmt(pr)}</td><td class="r"><button class="btn quiet" style="min-height:34px" data-act="hbuy" data-id="${s.item}" ${S.stones < pr ? 'disabled' : ''}>買一${esc(IT[s.item].unit)}</button></td></tr>`; }
    for (const x of p.display) h += `<tr><td><button class="g-link ilink" style="margin:0" data-act="lore" data-id="${x}">${icon(x, 'sm')}<span>${esc(IT[x].name)}</span></button><div class="small muted">${esc(IT[x].stat)}</div></td><td class="r muted">—</td><td></td></tr>`;
    h += `</tbody></table></div><h2 class="sec-h">賣給回春藥行</h2>`;
    const mine = S.lots.filter(l => (IT[l.item].sell || []).includes('huichun'));
    h += mine.length ? `<div class="stack">${mine.map(l => { const o = huichunOffer(l); return `<div class="row"><span class="serif" style="flex:1;min-width:0">${esc(l.label)} ${quantityText(l.item, l.qty)}</span><button class="btn quiet" data-act="hsell" data-id="${l.id}">${typeof o === 'number' ? '賣 ' + fmt(moneyFor(l.item, o, l.qty)) : '問問看'}</button></div>`; }).join('')}</div><p class="small muted" style="margin-top:6px">回春藥行照市價八折收，成色照實算。張老闆看得出金線真假。</p>` : `<p class="small muted">你手上沒有回春藥行收的貨。</p>`;
  }
  if (id === 'tea') {
    h += placeDeals('tea');
    const list = D.news.teahouse.filter(x => inMonth(x) && x.day === S.day), bought = S.teaBought[S.day] || [];
    h += `<h2 class="sec-h">消息單</h2><div class="stack">${list.map((t, i) => bought.includes(i) ? `<div class="newscard"><div class="src">買到的消息</div><div class="txt">${esc(t.text)}</div></div>` : `<div class="row"><span class="small muted" style="flex:1">一則消息</span><button class="btn quiet" data-act="tbuy" data-i="${i}" ${S.stones < t.price ? 'disabled' : ''}>${t.price} 靈石</button></div>`).join('') || '<p class="small muted">今天沒有新消息。</p>'}</div>`;
    const oh = D.news.overhear.find(o => inMonth(o) && o.day === S.day);
    h += `<h2 class="sec-h">偷聽</h2>${S.overheard[S.day] ? `<div class="ln"><span class="sp">隔壁桌</span><span class="tx">${esc(oh.text)}</span></div>` : `<button class="btn quiet wide" data-act="overhear">挑張桌子坐下</button>`}`;
    h += `<h2 class="sec-h">問白七娘一個人</h2><p class="small muted">每問一個人 ${PL.tea.askCost} 塊靈石。她只說她願意說的。</p><button class="btn quiet wide" data-act="askbai">問……</button>`;
    const bn = S.baiSold[S.day] || 0;
    h += `<h2 class="sec-h">賣消息</h2><p class="small muted">白七娘一天收兩則。消息越新、知道的人越少，越值錢。舊聞、人人都知道的、聽雨樓自己傳出去的，她不收。</p><button class="btn quiet wide" data-act="intelsheet" ${bn >= 2 ? 'disabled' : ''}>${bn >= 2 ? '今天她不收了' : '翻開消息簿……'}</button>`;
  }
  if (id === 'office') {
    const n = NP.zhou;
    h += `<div class="ln" style="margin-top:12px"><span class="sp">${esc(n.name)}</span><span class="tx">${esc(rel('zhou') >= 2 ? '「小許，有事？」' : rel('zhou') <= -2 ? '「又是你。」' : '「什麼事？」')}</span></div>`;
    if (S.flags.bounty_seen && MON() === 1) h += `<h2 class="sec-h">懸賞</h2>${newsHTML('n_bounty', true)}`;
    if (MON() === 2 && S.day >= 3 && !S.flags.scar_caught) h += `<h2 class="sec-h">懸賞</h2>${newsHTML('n2_shen', true)}`;
    const acts = [];
    if (held('xuechan')) acts.push(`<button class="opt" data-act="turnxc"><b>交出雪蟾酥</b><span>懸賞${S.flags.bounty_seen ? '六十' : '還沒貼出來，先給四十'}</span></button>`);
    if (held('duanshui') && S.flags.bounty_seen) acts.push(`<button class="opt" data-act="turn" data-k="duanshui"><b>交出斷水刀</b><span>余小六的佩刀，賞二十</span></button>`);
    if (holdFlag('sting')) acts.push(`<button class="opt" data-act="turn" data-k="sting"><b>交出柳郎中的療傷丹</b><span>瓶底有派出所的印</span></button>`);
    h += acts.length ? `<h2 class="sec-h">交東西</h2>${acts.join('')}` : '';
    const al = accuseList();
    if (al.length) h += `<h2 class="sec-h">告發</h2><p class="small muted">告得成告不成，看你手上的證據，也看派出所管不管。</p>${al.map(a => `<button class="opt danger" data-act="accusesheet" data-id="${a.id}"><b>${esc(a.label)}</b><span>${esc(NP[a.who].name)}</span></button>`).join('')}`;
  }
  if (id === 'herb') {
    if (placeOpen('herb') === 'closed') h += `<p class="serif" style="margin-top:12px">${esc(p.closedText)}</p>`;
    else {
      const hs = herbStock(), n = S.herbBought[S.day] || 0;
      h += placeDeals('herb');
      if (hs) h += `<h2 class="sec-h">老葛的赤炎草</h2><div class="ln"><span class="sp">老葛</span><span class="tx">${esc(hs.say)}</span></div><div class="row" style="margin-top:8px"><span class="small muted" style="flex:1">${cnPrice(hs.price)}一株　·　今天還剩 ${hs.max - n} 株</span><button class="btn quiet" data-act="herb" ${n >= hs.max || S.stones < hs.price ? 'disabled' : ''}>買一株</button></div>`;
    }
  }
  if (id === 'homes') {
    if (S.place.homeSeen) { const n = NP[S.place.homeSeen]; h += `<h2 class="sec-h">${esc(n.name)}的住處</h2><p class="serif" style="line-height:1.9">${esc(n.home.text)}</p><div class="ln" style="margin-top:10px"><span class="sp">${esc(n.name)}</span><span class="tx">${esc(n.home.line)}</span></div>`; }
    else {
      const hs = homesKnown();
      h += hs.length ? `<h2 class="sec-h">你知道的住址</h2>${hs.map(n => `<button class="opt" data-act="visit" data-id="${n}"><b>${esc(NP[n].name)}</b><span>${esc(NP[n].role)}</span></button>`).join('')}` : `<p class="small muted" style="margin-top:12px">你還不知道誰住在哪裡。住址要從交易、交情裡得來。</p>`;
    }
  }
  if (id === 'pawn') {
    h += `<div class="ln" style="margin-top:12px"><span class="sp">${esc(NP.dianzhu.name)}</span><span class="tx">「許先生，還剩${monthsText(S.lifespan)}。」</span></div>
      <div class="card" style="margin-top:12px"><div class="lore">${esc(IT.dangpiao.text)}</div></div>
      <button class="opt" data-act="redeem" ${S.stones < M.redeemCost ? 'disabled' : ''}><b>贖回一個月壽元</b><span>${M.redeemCost} 靈石。越贖越貴。</span></button>`;
  }
  return h;
}
function placeDeals(where) {
  return D.deals.filter(d => d.where === where && dealAvail(d)).map(d => `<button class="go" style="margin-top:12px" data-act="deal" data-id="${d.id}"><div><div class="gt">${esc(d.hook ? d.hook.t : NP[d.npc].name)}</div><div class="gd">${esc(d.hook ? d.hook.d : d.title)}</div></div><span class="arrow">›</span></button>`).join('');
}
function smithHTML(s) {
  const n = NP.tie, c = PL.smith.commission;
  const mine = S.lots.filter(l => PL.smith.buys[l.item] && !l.flags.includes('contraband'));
  const dirty = S.lots.some(l => l.flags.includes('contraband'));
  const sellCfg = (PL.smith.sells || []).filter(inMonth);
  let h = `<div class="person"><div class="ph"><b>${esc(n.name)}</b><span class="small muted">${esc(n.role)}</span></div><p class="serif small">${esc(s.goods)}</p>`;
  h += mine.length ? mine.map(l => { const o = smithOffer(l); const tot = PL.smith.buys[l.item].fixed ? o : moneyFor(l.item, o, l.qty); return `<div class="row"><span class="small" style="flex:1;min-width:0">${esc(l.label)} ${quantityText(l.item, l.qty)}</span><button class="btn quiet" style="min-height:34px" data-act="ssell" data-id="${l.id}">賣 ${fmt(tot)}</button></div>`; }).join('') : `<span class="small muted">他收寒鐵、狼牙、刀，和會發燙的石頭。</span>`;
  if (dirty) h += `<span class="small muted">你那批沒有印記的寒鐵，他看了一眼就推回來：「這個我不收。你最好也別留。」</span>`;
  for (const c of sellCfg) { const pr = rp(price(c.item) * c.mult); h += `<div class="row"><span class="small" style="flex:1">他也賣${esc(IT[c.item].name)}：${fmt(pr)} 一${esc(quoteUnit(c.item))}，一次${quantityText(c.item, c.lot)}</span><button class="btn quiet" style="min-height:34px" data-act="sbuy" data-id="${c.item}" ${S.stones < moneyFor(c.item, pr, c.lot) ? 'disabled' : ''}>買 ${fmt(moneyFor(c.item, pr, c.lot))}</button></div>`; }
  if (S.commission && !S.commission.done) h += `<span class="small muted">訂的刀，${M.dayNames[S.commission.ready - 1]}好。</span>`;
  else if (!S.commission) h += `<button class="btn quiet" data-act="commission" ${ordinaryHeld(c.needItem) < c.needQty || S.stones < c.fee ? 'disabled' : ''}>訂一把寒鐵短刀（${quantityText(c.needItem, c.needQty)}鐵礦石＋${c.fee}靈石，三天）</button>`;
  return h + `</div>`;
}

function renderNight() {
  if (S.phase === 'dues') return '';
  const n = S.night;
  const need = M.xpNeed[S.level];
  if (n) {
    const dayDelta = S.stones - S.dayStartStones;
    return `<section class="night stack"><h2>夜</h2><p class="serif">${n.invest || n.gain ? `你點了燈，打坐到三更。修為增加 ${n.gain}。${n.weak ? '那束定神香燒得特別快，煙也嗆，心總靜不下來。' : ''}` : '你沒有打坐，早早睡了。'}${n.up ? `<br><b class="jade">突破了。你現在是${lvName(S.level)}。靈識也寬了一些。</b>` : ''}</p>
      <div class="card"><div class="row"><span class="label" style="flex:1">今天的靈石</span><b class="num ${dayDelta >= 0 ? 'down' : 'up'}">${dayDelta >= 0 ? '＋' : '－'}${fmt(Math.abs(dayDelta))}</b></div><div class="row"><span class="label" style="flex:1">修為</span><b class="num">${S.xp} / ${need}</b></div></div></section>`;
  }
  const max = Math.min(M.nightCap, Math.floor(S.stones));
  const inv = Math.min(UI.night.invest, max);
  const burnable = ordinaryHeld('dingshen') > 0, pillable = ordinaryHeld('yangqi') > 0;
  const burn = UI.night.burn && burnable, pill = UI.night.pill && pillable;
  const gain = nightGain(inv, burn, pill);
  return `<section class="night stack"><h2>夜．打坐</h2><p class="serif muted">店門關了。靈石可以拿去做明天的生意，也可以今晚吃成修為。</p>
    <div class="card stack"><div class="row"><span class="label" style="flex:1">投入靈石</span><b class="num gold" id="inv-val">${inv}</b></div>
    <input type="range" id="invest" min="0" max="${max}" step="1" value="${inv}" aria-label="投入靈石">
    <label class="check"><input type="checkbox" id="burn" ${burn ? 'checked' : ''} ${burnable ? '' : 'disabled'}><span>點一束定神香（修為加四成）<br><span class="small muted">你有 ${held('dingshen')} 束　·　今日市價 ${fmt(price('dingshen'))}</span></span></label>
    <label class="check"><input type="checkbox" id="pill" ${pill ? 'checked' : ''} ${pillable ? '' : 'disabled'}><span>服一枚養氣丹（修為＋${S.pillYesterday ? 9 : 18}${S.pillYesterday ? '，昨晚吃過，藥力減半' : ''}）<br><span class="small muted">你有 ${held('yangqi')} 枚</span></span></label>
    <div class="row"><span class="label" style="flex:1">今晚修為</span><b class="num jade" id="gain-val">＋${gain}</b><span class="small muted" id="xp-to">${S.xp} → ${S.xp + gain} / ${need}</span></div></div></section>`;
}
function nightGain(inv, burn, pill) { return Math.round(inv * (burn ? 1.4 : 1) + (pill ? (S.pillYesterday ? 9 : 18) : 0)); }
function updateNight() {
  const max = Math.min(M.nightCap, Math.floor(S.stones)), inv = Math.min(UI.night.invest, max);
  const burn = UI.night.burn && ordinaryHeld('dingshen') > 0, pill = UI.night.pill && ordinaryHeld('yangqi') > 0;
  const g = nightGain(inv, burn, pill), need = M.xpNeed[S.level];
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('inv-val', inv); set('gain-val', '＋' + g); set('xp-to', `${S.xp} → ${S.xp + g} / ${need}`);
  const b = document.querySelector('[data-act="meditate"]'); if (b) b.textContent = inv || pill ? '打坐' : '不打坐，睡覺';
}

function renderEnd() {
  const CT = countedIds();
  const counted = CT.filter(id => S.done[id] && S.done[id] !== 'missed' && S.done[id] !== 'na');
  const missed = CT.length - counted.length;
  const EN = (MON() > 1 && D.endings['m' + MON()]) || D.endings;
  const nw = netWorth(true);
  const mistakes = S.stats.fooled + S.stats.wronged;
  const grade = gradeOf();
  const T = M.truthLabels;
  const truths = counted.map(id => { const d = DEALS[id]; const t = d.truth; return `<div class="truth"><b>${esc(d.title.includes(NP[d.npc].name) ? d.title : NP[d.npc].name + '：' + d.title)}</b><div class="t3"><span class="pill">${esc(T.goods[t.goods])}</span><span class="pill">${esc(T.origin[t.origin])}</span><span class="pill ${t.intent === 'plain' ? '' : 'cin'}">${esc(T.intent[t.intent])}</span></div><span class="small muted">你的處置：${esc(labelOf(id, S.done[id]))}${S.flags['won_' + id] ? '，後來到派出所告成了' : ''}</span>${d.lesson ? `<details class="lesson"><summary>線索在哪</summary><p>${esc(d.lesson)}</p></details>` : ''}</div>`; }).join('');
  return `<section class="stack" style="padding-top:18px">
    <div class="row"><div><span class="label">${monthLabel(MON())}</span><div class="grade">${grade}等</div></div><div style="margin-left:auto;text-align:right"><span class="label">長生典</span><div class="serif cin" style="font-size:20px;font-weight:700">還剩${monthsText(S.lifespan - 1)}</div></div></div>
    ${S.cards.length ? `<div class="stack">${S.cards.map(c => `<div class="event"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>${c.notes && c.notes.length ? `<div class="fxline">${esc(c.notes.join('　'))}</div>` : ''}</div>`).join('')}</div>` : ''}
    <p class="serif" style="line-height:1.95">${esc((grade === '上' ? EN.top : grade === '中' ? EN.mid : S.debt > 0 ? EN.low : EN.lowFooled).replace('{left}', monthsText(S.lifespan - 1)))}</p>
    <div class="card"><table class="tbl"><tbody>
      <tr><td>靈石</td><td class="r">${fmt(S.stones)}</td></tr>
      <tr><td>庫房（自有貨、照真實成色）</td><td class="r">${fmt(S.lots.reduce((a, l) => a + (externalLot(l) ? 0 : lotValue(l, M.days, true)), 0) + reservedStockValue())}</td></tr>
      ${S.debt ? `<tr><td>欠老錢</td><td class="r cin">－${fmt(S.debt)}</td></tr>` : ''}
      <tr><td><b>身家</b></td><td class="r"><b>${fmt(nw)}</b></td></tr>
      <tr><td>修為</td><td class="r">${lvName(S.level)}　${S.xp}/${M.xpNeed[S.level]}</td></tr>
      <tr><td>這個月錯過的生意</td><td class="r">${missed} 筆</td></tr>
    </tbody></table></div>
    <h2 class="sec-h">評等</h2><div class="card stack">
      ${[['修為比月初高一層（' + lvName(goalLevel()) + '）', S.level >= goalLevel(), lvName(S.level)], ['被騙＋錯怪不超過一次', mistakes <= 1, `${mistakes} 次`], ['月底沒有欠債', !(S.debt > 0), S.debt > 0 ? '欠錢記' : '沒有']].map(([t, ok, v]) => `<div class="row"><span class="${ok ? 'jade' : 'cin'}" style="width:1.2em">${ok ? '✓' : '✗'}</span><span style="flex:1">${t}</span><span class="small muted">${esc(v)}</span></div>`).join('')}
      <p class="small muted">三條都做到是上等。欠債，或被騙＋錯怪四次以上，是下等。其他是中等。</p></div>
    <h2 class="sec-h">帳面分</h2><div class="card"><table class="tbl score"><thead><tr><th>項目</th><th class="r">數</th><th class="r">每個</th><th class="r">分</th></tr></thead><tbody>
      ${scoreRows().map(r => `<tr${r.k && r.n ? ` class="tap" data-act="statsheet" data-id="${r.k}"` : ''}><td>${esc(r.label)}${r.k && r.n ? '<span class="small jade">　看是哪幾筆 ›</span>' : ''}</td><td class="r">${r.n}</td><td class="r muted">${r.per > 0 ? '＋' : '－'}${Math.abs(r.per)}</td><td class="r ${r.n * r.per < 0 ? 'cin' : ''}">${r.n * r.per > 0 ? '＋' : r.n * r.per < 0 ? '－' : ''}${Math.abs(r.n * r.per)}</td></tr>`).join('')}
      <tr><td><b>合計</b></td><td></td><td></td><td class="r"><b>${scoreTotal()}</b></td></tr></tbody></table>
      <p class="small muted" style="margin-top:8px">${S.prevBest == null ? '這是你第一次結算，之後每一輪都會跟最高分比。' : S.finalScore > S.prevBest ? `新紀錄。之前最高 ${S.prevBest} 分。` : `你的最高紀錄是 ${S.prevBest} 分。`}</p></div>
    <h2 class="sec-h">這個月的真相</h2><div>${opportunitySummaryHTML()}${truths || '<p class="muted">其他舊故事交易沒有可列的結果。</p>'}</div>
    ${(() => { const ts = (EN.teasers || []).filter(t => needOk(t.need)).slice(0, 3); return ts.length ? `<h2 class="sec-h">還沒完的事</h2><div class="stack">${ts.map(t => `<p class="serif" style="line-height:1.9">${esc(t.text)}</p>`).join('')}</div>` : ''; })()}
    <p class="serif muted" style="margin-top:12px">${esc(EN.next)}</p>
    ${MON() < LAST_MONTH ? `<button class="btn primary wide" data-act="nextmonth">進入${monthLabel(MON() + 1)}</button><button class="btn quiet wide" style="margin-top:8px" data-act="new">從頭再開一次張</button>` : `<button class="btn primary wide" data-act="new">從頭再開一次張</button>`}</section>`;
}
function labelOf(id, key) {
  const d = DEALS[id], o = d.opts[key];
  if (String(key).startsWith('info')) return '賣了消息';
  if (key === 'barter') return '拿消息換';
  if (!o) return key;
  if (o.label) return o.label;
  return ({ deal: d.side === 'sell' ? '買下' : d.side === 'buy' ? '賣給他' : '答應', decline: '婉拒', expose: '拆穿', report: '報派出所', refer: '轉介給錢記' })[key] || key;
}

function renderStore() {
  const lots = S.lots.map(l => { const it = IT[l.item]; const v = it.base && !externalLot(l) ? lotValue(l) : 0; const flags = l.known ? l.flags.map(f => ({ painted: '金線是畫的', damp: '受潮', stolen: '燙手', sting: '瓶底有印', sect: '寒潭宗的東西', alive: '活取', entrusted: '阿蘅託付', contraband: '沒有印記', fake: '假的', cut: '摻了東西', evidence: '證物' })[f]).filter(Boolean) : [];
    return `<tr><td><button class="g-link ilink" style="margin:0" data-act="lore" data-id="${l.item}">${icon(l.item, 'sm')}<span>${esc(l.label)}</span></button>${flags.length ? `<div class="small cin">${esc(flags.join('、'))}${l.known && l.q < 0.9 ? '，成色' + Math.round(l.q * 10) + '成' : ''}</div>` : ''}${l.perishDay ? `<div class="small cin">${M.dayNames[l.perishDay - 1] || ''}化</div>` : ''}</td><td class="r">${quantityText(l.item, l.qty)}</td><td class="r">${l.totalCost !== undefined ? fmt(l.totalCost) + '（整批）' : fmt(l.cost)}</td><td class="r">${externalLot(l) ? '代管，不列資產' : l.item === 'dry_mint_leaf' ? '未定價' : it.base ? fmt(v) : '—'}</td><td class="r">${!l.known && S.spirit > 0 ? `<button class="btn quiet" style="min-height:32px;font-size:13px" data-act="lotapp" data-id="${l.id}">鑑定</button>` : ''}</td></tr>`; }).join('');
  const items = Object.keys(IT).filter(k => IT[k].base && IT[k].base < 100 && S.codex[k]);
  const board = items.map(k => { const p = price(k), y = S.day > 1 ? price(k, S.day - 1) : p; const ch = p > y ? `<span class="up">▲</span>` : p < y ? `<span class="down">▼</span>` : ''; return `<tr><td class="nm">${icon(k, 'sm')} ${esc(IT[k].name)}</td><td class="r">${fmt(p)} ${ch}</td><td class="r muted">${esc(quoteUnit(k))}</td></tr>`; }).join('');
  return `<h2 class="sec-h">庫房</h2>${S.lots.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>貨</th><th class="r">數</th><th class="r">成本</th><th class="r">估值</th><th></th></tr></thead><tbody>${lots}</tbody></table></div><p class="small muted" style="margin-top:6px">估值照今日市價。成色你沒看過的，照賣家的說法算。鑑定一批貨，花一點靈識。</p>` : '<p class="muted">庫房空了。</p>'}
    <h2 class="sec-h">今日市價</h2><div class="tbl-wrap"><table class="tbl"><tbody>${board}</tbody></table></div><p class="small muted" style="margin-top:6px">只列你見過的貨。紅漲綠跌。</p>`;
}
function renderPeople() {
  const T = { loose: '居民圈', sect: '資源圈', ghost: '鬼市' };
  const rep = Object.keys(T).filter(k => S.repTag[k] || S.rep[k]).map(k => `<div class="row"><span class="label" style="flex:1">${T[k]}說你</span><b class="serif">${esc(S.repTag[k] || (S.rep[k] > 0 ? '還行' : '不怎麼樣'))}</b></div>`).join('');
  const people = Object.keys(S.met).filter(n => NP[n] && n !== 'dianzhu').sort((a, b) => (NP[a].oneoff ? 1 : 0) - (NP[b].oneoff ? 1 : 0));
  const tagset = ['未定', '可信', '存疑', '不可信'];
  const cards = people.map(n => { const p = NP[n], m = S.mem[n] || [];
    return `<div class="person"><div class="ph"><b>${esc(p.name)}</b><span class="small muted">${esc(p.role)}　·　${esc(npcLv(n))}</span><span class="pill" style="margin-left:auto">${attitude(n)}</span></div>
      <p class="small">${esc(p.surface)}</p>${S.homes[n] ? '<span class="small jade">知道住處</span>' : ''}
      ${m.length ? `<ul>${m.map(x => `<li>${esc(dayLabel(x.day, x.m))}　${esc(x.t)}</li>`).join('')}</ul>` : ''}
      <div class="tags" role="group" aria-label="你的標籤">${tagset.map(t => `<button data-act="tag" data-id="${n}" data-v="${t}" class="${(S.tags[n] || '未定') === t ? 'on' : ''}">${t}</button>`).join('')}</div>
      <textarea id="note-${n}" data-note="${n}" placeholder="你的備註">${esc(S.notes[n] || '')}</textarea></div>`; }).join('');
  return `<h2 class="sec-h">名聲</h2><div class="card stack">${rep || '<p class="small muted">還沒有人說你什麼。</p>'}</div><h2 class="sec-h">人脈簿</h2><p class="small muted" style="margin-bottom:8px">遊戲不替你下結論。標籤是你自己貼的，貼錯了也是你的事。</p><div class="stack">${cards || '<p class="muted">還沒見過什麼人。</p>'}</div>`;
}
const newIntel = () => S && Object.keys(S.intel || {}).length > (S.intelSeenN || 0);
function heatWord() { const h = S.heat; return h >= 5 ? '盯上你了' : h >= 3 ? '有人在打聽你' : h >= 1 ? '有人留意' : '平靜'; }
const ACT_WORD = { open: '開口時', ask: '問來歷', press0: '追問', press1: '追問', press2: '追問', silence: '沉默時', appraise: '鑑定', opt: '當面' };
function srcLabel(rec, I) {
  const s = rec.src || '';
  if (s === 'flag') return (I && I.srcText) || '';
  if (s === 'bai') return '聽雨樓'; if (s === 'street') return '散客閒聊'; if (s === 'verify') return '查證';
  const p = s.split(':');
  if (p[0] === 'home') return '登門拜訪' + NP[p[1]].name;
  if (p[0] === 'smith') return '鐵師傅的攤子';
  if (p[0] === 'scene') return p[1] === 'S02' ? '店裡・老葛與韓九閒聊' : '市場・韓九本人說法';
  if (p[0] === 'news') return '實讀報紙・傳聞';
  if (p[0] === 'opp') return '韓九本人售後回報';
  if (p[0] === 'lot') return '鑑定庫房的貨';
  if (DEALS[p[0]]) { const n = NP[DEALS[p[0]].npc].name; return p[1] === 'verify' ? `找${NP[p[2]].name}查證` : `${n}・${ACT_WORD[p[1]] || ''}`; }
  return '';
}
function intelRow(id) {
  const rec = S.intel[id], I = IN[id];
  const text = I ? I.text : rec.text;
  const pills = [];
  if (I) {
    const sold = S.isold[id];
    if (sold && sold.burned) pills.push('<span class="pill cin">白七娘說是假的</span>');
    else if (sold) pills.push(`<span class="pill cin">${esc(dayLabel(sold.day, sold.m))}賣過</span>`);
    if (I.value || I.refuse) {
      if (intelDead(I)) pills.push('<span class="pill">舊聞</span>');
      else if (intelPublic(I)) pills.push('<span class="pill">人盡皆知</span>');
      else if (!sold) pills.push(`<span class="pill">${intelAge(rec)}</span>`);
      if (intelSolo(I) && !intelDead(I) && !intelPublic(I)) pills.push('<span class="pill jade">只有你知道</span>');
    }
  }
  const src = srcLabel(rec, I);
  return `<div class="intel"><div class="it">${esc(text)}</div><div class="im"><span class="small muted">${esc(dayLabel(rec.day, rec.m))}${src ? '　' + esc(src) : ''}</span>${pills.join('')}</div></div>`;
}
function renderIntel() {
  S.intelSeenN = Object.keys(S.intel).length;
  const ids = Object.keys(S.intel).sort((a, b) => ((S.intel[b].m || 1) * 10 + S.intel[b].day) - ((S.intel[a].m || 1) * 10 + S.intel[a].day));
  const seen = ids.filter(i => IN[i] && IN[i].kind === 'seen');
  const heard = ids.filter(i => (IN[i] && IN[i].kind !== 'seen') || (!IN[i] && S.intel[i].src === 'verify'));
  const misc = ids.filter(i => !IN[i] && S.intel[i].src !== 'verify');
  const sec = (t, list, note) => list.length ? `<h2 class="sec-h">${t}</h2>${note ? `<p class="small muted" style="margin-bottom:6px">${note}</p>` : ''}<div class="card intels">${list.map(intelRow).join('')}</div>` : '';
  return `<h2 class="sec-h">消息簿</h2><div class="card"><div class="row"><span class="label" style="flex:1">坊市對你的注意</span><b class="serif">${heatWord()}</b></div><p class="small muted" style="margin-top:6px">消息會舊，也會傳開。只有你知道的最值錢，也最容易被人想到是你說出去的。</p></div>
    ${ids.length ? '' : '<p class="muted" style="margin-top:12px">還沒記下什麼。問出來的、看出來的、聽來的，都會記在這裡。</p>'}
    ${sec('親眼所見', seen)}${sec('聽人說的', heard, '別人說的話，不一定是真的。')}
    ${misc.length ? `<details class="card" style="margin-top:18px"><summary class="small muted">聽雨樓與坊間閒話（${misc.length}）</summary><div class="intels">${misc.map(intelRow).join('')}</div></details>` : ''}`;
}
function renderCodex() {
  const keys = Object.keys(IT);
  const seen = keys.filter(k => S.codex[k]);
  const grid = keys.map(k => S.codex[k] ? `<button data-act="lore" data-id="${k}">${icon(k)}<b>${esc(IT[k].name)}</b><span>${esc(IT[k].grade)}${unlockedHidden(k).length ? '　·　隱藏句 ' + unlockedHidden(k).length : ''}</span></button>` : `<button class="lock" disabled><b>？？？</b><span>未見過</span></button>`).join('');
  const kz = Object.entries(D.kaozheng).filter(([, v]) => needOk(v.need)).map(([, v]) => `<div class="card" style="margin-top:8px"><b class="serif">${esc(v.title)}</b><p class="lore" style="margin-top:6px">${esc(v.text)}</p></div>`).join('');
  return `<h2 class="sec-h">圖鑑　${seen.length}／${keys.length}</h2><div class="codex">${grid}</div>${kz ? `<h2 class="sec-h">考據</h2>${kz}` : ''}`;
}
function unlockedHidden(k) { return (IT[k].hidden || []).filter(h => (h.need.realm && S.level >= h.need.realm) || (h.need.flag && S.flags[h.need.flag])); }

function renderSheet() {
  const sh = UI.sheet; if (!sh) { $sheet.hidden = true; $sheet.innerHTML = ''; return; }
  let h = '';
  if (sh.type === 'news') h = `<h2>報紙</h2>${newsHTML(sh.id)}`;
  else if (sh.type === 'm2return') h = m2ReturnHTML(sh.id);
  else if (sh.type === 'oppreturn') h = `<h2>韓九的回報</h2><p>${esc(OP.report)}</p>`;
  else if (sh.type === 'legacyfiles') h = `<h2>原版存檔</h2><p>把原版匯出的JSON貼在下面。先匯出目前原檔，再匯入其他進度；匯入不會改新故事進度。</p><textarea id="legacy-json" rows="8" style="width:100%">${esc(sh.raw)}</textarea><button class="btn quiet" data-act="legacyexport">匯出目前原版JSON</button><button class="btn primary" data-act="legacyimport">匯入貼上的原版JSON</button>`;
  else if (sh.type === 'lore') {
    const it = IT[sh.id]; S.codex[sh.id] = true;
    h = `<span class="label">${esc(it.grade)}</span><h2 class="lore-h">${icon(sh.id, 'lg')}<span>${esc(it.name)}</span></h2><div class="lore-stat">${esc(it.stat)}${it.base && it.base < 100 ? `　·　今日市價 ${fmt(price(sh.id))}` : ''}</div><div class="lore">${esc(it.text)}</div>${unlockedHidden(sh.id).map(x => `<div class="hidden-line"><span class="label">${esc(x.label)}</span>${esc(x.text)}</div>`).join('')}`;
  } else if (sh.type === 'verify') {
    h = `<h2>查證</h2><p class="small muted">去找人問一問，會花掉一個時段。對方會等你，但第三方也有自己的立場。</p>` + verifyList().map(v => `<button class="opt" data-act="verifyw" data-id="${v.who}" ${v.used || (v.cost && S.stones < v.cost) ? 'disabled' : ''}><b>${esc(NP[v.who].name)}</b><span>${esc(NP[v.who].role)}${v.cost ? `　·　${v.cost} 靈石` : '　·　不收錢'}${v.used ? '　·　問過了' : ''}</span></button>`).join('');
  } else if (sh.type === 'decide') {
    h = `<h2>處置</h2>` + encOptions().map(o => `<button class="opt ${o.key === 'expose' || o.key === 'report' ? 'danger' : ''}" data-act="decide" data-k="${o.key}" ${o.disabled ? 'disabled' : ''}><b>${esc(o.label)}</b><span>${esc(o.desc || '')}</span></button>`).join('');
  } else if (sh.type === 'askbai') {
    const ps = Object.keys(S.met).filter(n => NP[n] && !NP[n].oneoff && n !== 'bai').concat(['bai']);
    h = `<h2>問白七娘</h2><p class="small muted">每問一個人 ${PL.tea.askCost} 塊靈石。</p>` + ps.map(n => `<button class="opt" data-act="baiwho" data-id="${n}"><b>${esc(NP[n].name)}</b><span>${esc(NP[n].role)}</span></button>`).join('');
  } else if (sh.type === 'turnxc') {
    const lot = S.lots.find(l => l.item === 'xuechan');
    h = `<h2>周正問：「從哪收的？」</h2>` + (lot && lot.flags.includes('entrusted') ? `<button class="opt" data-act="turnxcw" data-v="entrust"><b>「阿蘅託我交的。」</b><span>賞錢分她一半</span></button>` : `<button class="opt danger" data-act="turnxcw" data-v="aheng"><b>「採藥的阿蘅。」</b><span>說實話</span></button><button class="opt" data-act="turnxcw" data-v="other"><b>「一個路過的散修。」</b><span>他不一定信</span></button>`);
  } else if (sh.type === 'stall') {
    const ls = S.lots.filter(l => IT[l.item].base && !protectedLot(l) && (IT[l.item].sell || []).includes('walk') && !l.flags.some(f => ['sect', 'sting', 'contraband'].includes(f)));
    const pick = UI.stallPick || [];
    h = `<h2>擺攤</h2><p class="small muted">最多三批。照今日市價九五折賣出，成色差的貨，第二天可能有人回來退。</p>` + (ls.length ? ls.map(l => `<label class="check" style="margin-top:8px"><input type="checkbox" data-stall="${l.id}" ${pick.includes(l.id) ? 'checked' : ''} ${!pick.includes(l.id) && pick.length >= 3 ? 'disabled' : ''}><span>${esc(l.label)} ${quantityText(l.item, l.qty)}<br><span class="small muted">約 ${fmt(moneyFor(l.item, rp(price(l.item) * 0.95), l.qty))} 靈石</span></span></label>`).join('') + `<button class="btn primary wide" style="margin-top:12px" data-act="stallgo" ${pick.length ? '' : 'disabled'}>擺出去</button>` : '<p class="muted">沒有可以擺的貨。</p>');
  } else if (sh.type === 'sellintel') {
    const ids = Object.keys(S.intel).filter(i => IN[i]).map(i => ({ i, o: intelOffer(i) })).sort((a, b) => b.o.price - a.o.price);
    h = `<h2>賣消息給白七娘</h2><p class="small muted">今天還收 ${2 - (S.baiSold[S.day] || 0)} 則。</p>` + (ids.length ? ids.map(({ i, o }) => `<button class="opt" data-act="sellintel" data-id="${i}" ${o.price || o.refuse ? '' : 'disabled'}><b>${esc(IN[i].short)}</b><span class="it">${esc(IN[i].text)}</span><span>${o.price ? `白七娘出 <b class="gold">${o.price}</b> 靈石` : esc(o.why)}</span></button>`).join('') : '<p class="muted" style="margin-top:8px">消息簿裡還沒有能賣的東西。</p>');
  } else if (sh.type === 'accuse') {
    const a = ACC.find(x => x.id === sh.id), had = evidenceHad(a);
    h = `<h2>${esc(a.label)}</h2><p class="small muted" style="margin-top:6px">你手上的證據：</p>${had.length ? `<ul class="evid">${had.map(ev => `<li>${esc(ev.text)}</li>`).join('')}</ul>` : '<p class="small" style="margin-top:4px">什麼都沒有。</p>'}<p class="small muted" style="margin-top:8px">告了就收不回來。</p><button class="opt danger" data-act="accusego" data-id="${a.id}"><b>去告</b><span>周正會聽你說完</span></button>`;
  } else if (sh.type === 'stat') {
    const T = { saw: '看穿', fooled: '吃虧', wronged: '錯怪好人' }, TL = M.truthLabels;
    const list = (S.statLog || []).filter(x => x.kind === sh.id && (x.m || 1) === MON());
    h = `<h2>${T[sh.id]}</h2>` + (list.length ? list.map(x => { const d = DEALS[x.deal], t = d.truth; return `<div class="card" style="margin-top:10px"><b class="serif">${esc(NP[d.npc].name + '：' + d.title)}</b><div class="t3" style="margin:6px 0">${['goods', 'origin', 'intent'].map(k => `<span class="pill ${k === 'intent' && t.intent !== 'plain' ? 'cin' : ''}">${esc(TL[k][t[k]])}</span>`).join(' ')}</div><p class="small">${esc(M.dayNames[x.day - 1])}，你選了「${esc(labelOf(x.deal, x.key))}」。${S.flags['won_' + x.deal] ? '後來到派出所告成了，這筆不算吃虧。' : ''}</p>${d.lesson ? `<p class="serif" style="margin-top:6px;line-height:1.85">${esc(d.lesson)}</p>` : ''}</div>`; }).join('') : '<p class="muted">沒有紀錄。</p>');
  } else if (sh.type === 'menu') {
    h = `<h2>選單</h2>${sh.confirm ? `<p class="small">重新開始會清掉這一局。確定嗎？</p><button class="opt danger" data-act="new"><b>確定，重新開始</b><span>這一局會消失</span></button>` : `<button class="opt" data-act="home"><b>回到封面</b><span>進度會保留</span></button><button class="opt" data-act="askrestart"><b>重新開始</b><span>清掉這一局</span></button>`}`;
  }
  $sheet.hidden = false;
  $sheet.innerHTML = `<div class="veil" data-act="closesheet"><div class="sheet" role="dialog" aria-modal="true" data-stop="1">${h}<button class="btn ghost wide" style="margin-top:10px" data-act="closesheet">關上</button></div></div>`;
}

function renderBar() {
  let h = '';
  const nav = () => `<nav class="nav">${[['main', '鋪面', '今天'], ['store', '庫房', '貨與價'], ['intel', '消息', newIntel() ? '有新的' : '簿'], ['people', '人脈', '名聲'], ['codex', '圖鑑', '物品']].map(([k, a, b]) => `<button data-act="tab" data-v="${k}" class="${UI.tab === k ? 'on' : ''}${k === 'intel' && newIntel() ? ' new' : ''}">${a}<em>${b}</em></button>`).join('')}</nav>`;
  if (UI.view === 'title') { $bar.hidden = true; return; }
  if (UI.tab !== 'main') h = nav();
  else if (S.phase === 'morning') h = `<button class="btn primary wide" data-act="open">開門</button>` + nav();
  else if (S.phase === 'enc') {
    const e = S.enc;
    if (e.m2scene || e.m2offer) h = m2BarHTML();
    else if (e.scene) h = monthOneBarHTML();
    else if (e.opportunity) h = opportunityBarHTML();
    else if (e.done) h = `<button class="btn primary wide" data-act="close">繼續</button>`;
    else if (e.generic) {
      const opts = encOptions();
      h = `<div class="acts"><button class="btn quiet col" data-act="chat" ${canAct('chat') ? '' : 'disabled'}>閒聊</button><button class="btn quiet col" data-act="haggle" ${canAct('haggle') ? '' : 'disabled'}>加價</button><button class="btn quiet col" data-act="decidesheet">處置…</button></div>`;
      const p = opts.find(o => o.primary);
      h += `<div class="decide">${p ? `<button class="btn jade col" data-act="decide" data-k="${p.key}">${esc(p.label)}<span class="sub">${esc(p.desc)}</span></button>` : ''}<button class="btn quiet" data-act="decide" data-k="decline" ${p ? '' : 'style="grid-column:1/-1"'}>${p ? '不賣' : '送客'}</button></div>`;
    } else {
      const d = DEALS[e.deal];
      const hag = d.side === 'buy' ? '加價' : d.side === 'task' ? '加錢' : '殺價';
      const b = (a, t, sub) => `<button class="btn quiet col" data-act="${a}" ${canAct(a) ? '' : 'disabled'}>${t}${sub ? `<span class="sub">${sub}</span>` : ''}</button>`;
      h = `<div class="acts">${b('ask', '問來歷')}${b('press', '追問', d.press ? `${d.press.length - e.press}` : '')}${b('haggle', hag)}${b('silence', '沉默')}${b('appraise', '鑑定', '靈識')}${b('verify', '查證', S.slot >= 2 ? '來不及' : '一個時段')}</div>`;
      const opts = encOptions(); const p = opts.find(o => o.primary && !o.disabled);
      h += `<div class="decide">${p ? `<button class="btn jade col" data-act="decide" data-k="${p.key}">${esc(p.label)}<span class="sub">${esc(p.desc)}</span></button>` : ''}<button class="btn primary" data-act="decidesheet" ${p ? '' : 'style="grid-column:1/-1"'}>${p ? '其他處置…' : '處置…'}</button></div>`;
    }
  } else if (S.phase === 'place' && S.place) h = `<button class="btn primary wide" data-act="leave">離開${esc(PL[S.place.id].name)}</button>` + nav();
  else if (S.phase === 'night') h = S.night ? `<button class="btn primary wide" data-act="sleep">${S.day >= M.days ? '這個月過去了' : '睡覺'}</button>` : `<button class="btn primary wide" data-act="meditate">${UI.night.invest || UI.night.pill ? '打坐' : '不打坐，睡覺'}</button>` + nav();
  else if (S.phase === 'day') h = (S.slot >= 3 ? `<button class="btn primary wide" data-act="evening">關店</button>` : '') + nav();
  else if (S.phase === 'end') h = nav();
  $bar.hidden = false;
  $bar.innerHTML = `<div class="bar-in">${h}</div>`;
  requestAnimationFrame(() => document.documentElement.style.setProperty('--barh', $bar.offsetHeight + 'px'));
}

function render() {
  if (!S) UI.view = 'title';
  renderHUD();
  let h = '';
  if (UI.view === 'title') h = renderTitle();
  else if (UI.tab === 'store') h = renderStore();
  else if (UI.tab === 'people') h = renderPeople();
  else if (UI.tab === 'intel') h = renderIntel();
  else if (UI.tab === 'codex') h = renderCodex();
  else if (S.phase === 'morning') h = renderMorning();
  else if (S.phase === 'day') h = renderHub();
  else if (S.phase === 'enc') h = renderEnc();
  else if (S.phase === 'place') { if (S.place) h = renderPlace(); else { S.phase = 'day'; h = renderHub(); } }
  else if (S.phase === 'night') h = renderNight();
  else if (S.phase === 'end') h = renderEnd();
  $app.innerHTML = h;
  renderBar(); renderSheet();
  if (UI.toast) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = UI.toast; document.body.appendChild(t); UI.toast = null; setTimeout(() => t.remove(), 1800); }
}
function toast(t) { UI.toast = t; }
function save() { if (S && !actionTransaction) { if (S.phase !== 'end') scanLearn(); strictPersist(); } }
function commit(scroll) {
  if (actionTransaction) { UI.pendingScroll = scroll; return; }
  save(); render();
  if (scroll === 'top') window.scrollTo(0, 0);
  if (scroll === 'thread') { const th = document.getElementById('thread'); if (th && th.lastElementChild) th.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

/* ================= events ================= */
/*__OPPORTUNITY_ENGINE__*/
function runAct(a, el) {
  const id = el.dataset.id;
  switch (a) {
    case 'new': S = newGame((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0); UI.view = 'game'; UI.tab = 'main'; UI.sheet = null; commit('top'); break;
    case 'continue': UI.view = 'game'; render(); window.scrollTo(0, 0); break;
    case 'home': UI.view = 'title'; UI.sheet = null; render(); window.scrollTo(0, 0); break;
    case 'menu': UI.sheet = { type: 'menu' }; render(); break;
    case 'askrestart': UI.sheet = { type: 'menu', confirm: true }; render(); break;
    case 'closesheet': UI.sheet = null; render(); break;
    case 'tab': UI.tab = el.dataset.v; if (UI.tab === 'intel') S.intelSeenN = Object.keys(S.intel).length; commit('top'); break;
    case 'stance': S.stance = el.dataset.v; commit(); break;
    case 'open': openShop(); commit('top'); break;
    case 'shop': { if (S.phase !== 'day' || S.slot >= 3) break; if (!m2StartEncounter() && !startOpportunityEncounter() && !startMonthOneEncounter()) { const d = nextShopDeal(); if (d) startDeal(d.id, 'shop'); else startWalkin(); } commit('top'); break; }
    case 'm2': m2Action(el.dataset.k, id); commit('thread'); break;
    case 'm1scene': monthOneAction(el.dataset.k); commit('thread'); break;
    case 'readnews': readNews(id); commit(); break;
    case 'opptrip': marketSourceAction('trip'); commit(); break;
    case 'oppsource': marketSourceAction('source'); commit(); break;
    case 'oppprepare': prepareOpportunity(); commit(); break;
    case 'oppdecline': declineOpportunity(); commit(); break;
    case 'oppdefer': toast('先不做。今天這次市場離場前仍可備貨；離場後要重新確認現貨。'); commit(); break;
    case 'oppfit': fitOpportunity(); commit(); break;
    case 'oppsale': saleOpportunity(); commit(); break;
    case 'oppreject': rejectOpportunity(); commit(); break;
    case 'oppreturn': if (opportunityRecord().inbox.read) UI.sheet = { type: 'oppreturn' }; else readOpportunityReturn(); commit(); break;
    case 'note': S.notes[id] = el.dataset.value; commit(); break;
    case 'enter': enterPlace(id); commit('top'); break;
    case 'leave': leavePlace(); commit('top'); break;
    case 'deal': startDeal(id, S.place ? S.place.id : 'shop'); commit('top'); break;
    case 'ask': actAsk(); commit('thread'); break;
    case 'press': actPress(); commit('thread'); break;
    case 'silence': actSilence(); commit('thread'); break;
    case 'haggle': if (S.enc.generic) actGenericHaggle(); else actHaggle(); commit('thread'); break;
    case 'appraise': actAppraise(); commit('thread'); break;
    case 'verify': UI.sheet = { type: 'verify' }; render(); break;
    case 'verifyw': UI.sheet = null; actVerify(id); commit('thread'); break;
    case 'chat': actChat(); commit('thread'); break;
    case 'decidesheet': UI.sheet = { type: 'decide' }; render(); break;
    case 'decide': UI.sheet = null; decide(el.dataset.k); commit('thread'); break;
    case 'pick': S.enc.lot = +id; S.enc.qty = Math.min(DEALS[S.enc.deal].qty || 1, lotById(+id).qty); commit(); break;
    case 'close': closeEnc(); commit('top'); break;
    case 'lore': UI.sheet = { type: 'lore', id }; render(); break;
    case 'ssell': sellToSmith(+id); commit(); break;
    case 'sbuy': { const c = (PL.smith.sells || []).find(x => x.item === id), pr = moneyFor(id, rp(price(id) * c.mult), c.lot); S.smithBought = S.smithBought || {}; if ((S.smithBought[S.day] || 0) >= 2) { toast('鐵師傅：「今天就這麼多了。」'); commit(); break; } if (S.stones >= pr) { S.smithBought[S.day] = (S.smithBought[S.day] || 0) + 1; S.stones -= pr; addLot({ item: id, qty: c.lot, cost: rp(price(id) * c.mult), known: true, label: c.label || IT[id].name }); toast(`向鐵師傅買了${quantityText(id, c.lot)}${IT[id].name}`); } commit(); break; }
    case 'commission': commission(); commit(); break;
    case 'hbuy': buyFromHuichun(id); commit(); break;
    case 'hsell': sellToHuichun(+id); commit(); break;
    case 'tbuy': buyTea(+el.dataset.i); commit(); break;
    case 'overhear': overhear(); commit(); break;
    case 'askbai': UI.sheet = { type: 'askbai' }; render(); break;
    case 'statsheet': UI.sheet = { type: 'stat', id }; render(); break;
    case 'intelsheet': UI.sheet = { type: 'sellintel' }; render(); break;
    case 'sellintel': sellAtTea(id); commit(); break;
    case 'accusesheet': UI.sheet = { type: 'accuse', id }; render(); break;
    case 'accusego': accuse(id); commit(); break;
    case 'baiwho': askBai(id); commit(); break;
    case 'turnxc': UI.sheet = { type: 'turnxc' }; render(); break;
    case 'turnxcw': turnIn('xuechan', el.dataset.v); commit(); break;
    case 'turn': turnIn(el.dataset.k); commit(); break;
    case 'herb': buyHerb(); commit(); break;
    case 'mangyupai': { const o = DEALS.d10.opts.special2; applyFx(o.fx); S.place.say = o.text; S.place.sayWho = 'mang'; commit(); break; }
    case 'visit': visitHome(id); commit(); break;
    case 'redeem': redeem(); commit(); break;
    case 'stall': UI.stallPick = []; UI.sheet = { type: 'stall' }; render(); break;
    case 'stallgo': marketStall(UI.stallPick || []); UI.sheet = null; commit(); break;
    case 'lotapp': appraiseLot(+id); commit(); break;
    case 'tag': S.tags[id] = el.dataset.v; commit(); break;
    case 'evening': S.phase = 'night'; commit('top'); break;
    case 'meditate': meditate(UI.night.invest, UI.night.burn, UI.night.pill); UI.night = { invest: 0, burn: false, pill: false }; commit('top'); break;
    case 'sleep': endDay(); commit('top'); break;
    case 'nextmonth': nextMonth(); UI.tab = 'main'; commit('top'); break;
  }
}
function marketStall(ids) {
  let total = 0;
  if (!S.place || S.place.id !== 'market' || S.place.stalled) return;
  for (const id of [...new Set(ids)].slice(0, 3)) { const l = lotById(id); if (protectedLot(l) || !(IT[l.item].sell || []).includes('walk')) continue; const unit = rp(price(l.item) * 0.95); total += moneyFor(l.item, unit, l.qty); if (l.q < 0.7) scheduleComplaint(l, l.qty, unit); S.lots = S.lots.filter(x => x !== l); }
  S.stones += total; S.place.stalled = true; toast(`擺攤賣出，＋${fmt(total)} 靈石`); S.log.push({ day: S.day, t: `市集擺攤，賣了 ${fmt(total)} 靈石` });
}
function appraiseLot(id) {
  const l = lotById(id); if (!l || S.spirit <= 0) return;
  S.spirit--; l.known = true;
  const d = l.from && DEALS[l.from];
  const a = d && d.appraise ? d.appraise.filter(x => S.level >= x.realm).map(x => x.text).join(' ') : '';
  toast(l.q < 0.9 ? '看出毛病了。' : '成色沒問題。');
  if (l.q < 0.9) learnTrigger('lot:' + l.item);
  if (a) S.log.push({ day: S.day, t: '鑑定：' + a });
}
document.addEventListener('click', ev => {
  const a = ev.target.closest('[data-act]');
  if (!a) return;
  if (a.dataset.act === 'closesheet' && ev.target.closest('[data-stop]') && !ev.target.closest('button[data-act="closesheet"]')) return;
  if (a.disabled) return;
  onAct(a.dataset.act, a);
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'invest') { UI.night.invest = +t.value; updateNight(); }
  if (t.dataset && t.dataset.note) onAct('note', { dataset: { id: t.dataset.note, value: t.value } });
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'burn') { UI.night.burn = t.checked; render(); }
  if (t.id === 'pill') { UI.night.pill = t.checked; render(); }
  if (t.dataset && t.dataset.stall) { const id = +t.dataset.stall; const p = UI.stallPick || []; UI.stallPick = t.checked ? [...p, id].slice(0, 3) : p.filter(x => x !== id); renderSheet(); }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && UI.sheet) { UI.sheet = null; render(); } });
window.addEventListener('resize', () => { if (!$bar.hidden) document.documentElement.style.setProperty('--barh', $bar.offsetHeight + 'px'); });

/* ================= boot ================= */
function start(data) {
  try {
    persistedRaw = localStorage.getItem(SAVE_KEY);
    const saved = data && data.S ? copyState(data.S) : persistedRaw ? JSON.parse(persistedRaw) : null;
    if (saved) { migrateMonthOne(saved); migrateMonthTwo(saved); validateSave(saved); S = saved; }
    else S = null;
    UI.view = data && data.S ? data.view || 'game' : 'title'; UI.tab = data && data.tab || 'main';
  } catch (error) { S = null; loadProblem = error.message; UI.view = 'title'; }
  render();
}
window.claude?.hot?.snapshot?.(() => ({ S, view: UI.view, tab: UI.tab }));
window.__fs = { newGame, startDeal, startWalkin, actAsk, actPress, actSilence, actHaggle, actAppraise, actVerify, decide, closeEnc, enterPlace, leavePlace, advanceSlot, meditate, endDay, beginDay, openShop, nextShopDeal, encOptions, canAct, verifyList, sellToSmith, sellToHuichun, buyFromHuichun, turnIn, marketStall, nextMonth, gradeOf, scoreTotal, stallsToday, stallDeal, dealAvail, netWorth, price, held, render, onAct, sellAtTea, sellIntel, intelOffer, accuse, accuseList, evidenceHad, appraiseLot, visitHome, askBai, overhear, buyTea, scanLearn, IN, m2SourceValid, m2Offer, validateSave, tickOpportunities, quantityText, tradeQty, legacyHTML: LEGACY_HTML,
  get S() { return S; }, set S(v) { S = v; }, UI, D, DEALS, NP, IT };
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
