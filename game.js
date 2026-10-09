(() => {
'use strict';
/* ================= data ================= */
const D = __GAME_DATA__;
const M = D.meta, IT = D.items, NP = D.npcs, PL = D.places, NEWS = D.news.news;
const DEALS = {}; D.deals.forEach(d => { DEALS[d.id] = d; });
const IN = D.intel || {}, ACC = D.accuse || [];
const MON = () => (S && S.month) || 1;
const inMonth = x => x.month === 'all' || (Array.isArray(x.month) ? x.month.includes(MON()) : (x.month || 1) === MON());
const MD = () => ({ marketDay: M.marketDay, dues: M.dues, duesHigh: M.duesHigh, days: M.days, ...((M.months || {})[MON()] || {}) });
const DAYS = () => MD().days || M.days;
const LAST_MONTH = Math.max(1, ...D.deals.map(d => typeof d.month === 'number' ? d.month : 1));
const MONTH_CN = ['', '一', '二', '三', '四', '五', '六'];
const monthLabel = m => ((M.months || {})[m || 1] || {}).name || ('第' + MONTH_CN[m || 1] + '個月');
const dayLabel = (day, m) => ((m || 1) !== MON() ? monthLabel(m || 1) : '') + (M.dayNames[day - 1] || '');
const countedIds = () => D.deals.filter(d => !d.extra && (d.month === 'all' ? MON() === 1 : inMonth(d))).map(d => d.id);
const SAVE_KEY = 'fangshi-p2-v1';
const CKPT_KEY = 'fangshi-ckpt-v2', DEATH_KEY = 'fangshi-deaths-v1';
const SH = D.shop || {}, DEATHS = D.deaths || {}, THREADS = D.threads || [], PFX = D.placeFx || {};
const ALLEV = {}; (D.events.drift || []).forEach(e => { ALLEV[e.id] = e; }); (SH.events || []).forEach(e => { ALLEV[e.id] = e; });
const SLOT = ['上午', '下午', '傍晚'];
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const lvName = n => n <= 9 ? `吐納${CN[n]}層` : (['築基初期', '築基中期', '築基後期', '金丹初期', '金丹中期', '金丹後期', '元嬰初期', '元嬰中期', '元嬰後期'][n - 10] || '深不可測');
const PUBLIC_VERIFY = ['bai', 'tie', 'ge'];
const TEA = { 1: 3, 2: 4, 3: 6 };

/* ================= ink icons (48×48, currentColor ink; accents use theme vars) ================= */
const CIN = 'stroke="var(--cinnabar)"', JADE = 'stroke="var(--jade)"', GOLD = 'stroke="var(--gold)"', LAMP = 'stroke="var(--lamp)"';
const ICON = {
  naiya: `<path d="M17 29c0-4 3-6 7-5 4-1 7 1 7 5 0 3-1 5-2 7l-1 6c0 1-2 1-2 0l-1-5h-2l-1 5c0 1-2 1-2 0l-1-6c-1-2-2-4-2-7z"/><path d="M21.5 27.5c1.5 1 3.5 1 5 0" stroke-width="1.1"/><path d="M21 20c-1.5-2 1.5-3 0-5.5M27 20c-1.5-2 1.5-3 0-5.5" ${CIN} stroke-width="1.4"/>`,
  chachou: `<g transform="rotate(30 24 24)"><path d="M20 42V10a4 4 0 0 1 8 0v32z"/><circle cx="24" cy="10.5" r="1.4" stroke-width="1.2"/><path d="M20 22h8M20 32h8" ${JADE} stroke-width="1.4"/></g>`,
  banbei: `<path d="M21 6.5h6v5h-6z" stroke-width="1.6"/><path d="M22 11.5v4c-5 1-8 3.5-8 7.5v16c0 1.7 1.3 3 3 3h14c1.7 0 3-1.3 3-3V23c0-4-3-6.5-8-7.5v-4"/><path d="M14 31h20" ${JADE}/><path d="M18.5 35.5c1.2 1 2.8 1 4 0M25.5 35.5c1.2 1 2.8 1 4 0" stroke-width="1"/>`,
  dengsui: `<path d="M10 34C12 24 21 17 34 17l-4 5 4 3-5 4 2 4-6 2 1 4-7-4-5 2z"/><path d="M14.5 30c2.5-6 8-9.5 14-10" stroke-width="1.1"/><path d="M19 14c-1.5-2 1.5-3 0-5.5M25 13c-1.5-2 1.5-3 0-5.5" ${LAMP} stroke-width="1.4"/><path d="M6 24c-1.6 3.5-1.6 8 0 11.5M42 24c1.6 3.5 1.6 8 0 11.5" stroke-width="1.1" opacity=".5"/>`,
  tuoxie: `<g transform="rotate(18 14 25)"><path d="M14 12c3.8 0 6.2 3.2 6.2 8.2 0 5.3-1.4 8-1.4 11.6 0 3.4-2 5.7-4.8 5.7s-4.8-2.3-4.8-5.7c0-3.6-1.4-6.3-1.4-11.6 0-5 2.4-8.2 6.2-8.2z"/><path d="M8.6 17.5h10.8M8.4 22h11.2" stroke-width="1.4"/></g><g transform="rotate(-18 34 25)"><path d="M34 12c3.8 0 6.2 3.2 6.2 8.2 0 5.3-1.4 8-1.4 11.6 0 3.4-2 5.7-4.8 5.7s-4.8-2.3-4.8-5.7c0-3.6-1.4-6.3-1.4-11.6 0-5 2.4-8.2 6.2-8.2z"/><path d="M28.6 17.5h10.8M28.4 22h11.2" stroke-width="1.4"/></g>`,
  quepiao: `<path d="M16 11a2 2 0 0 1 2-2h8a6 6 0 0 0 6 6v22a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z"/><path d="M24 30V17.5M19.5 22l4.5-4.5 4.5 4.5" ${JADE}/><path d="M20 34.5h8" stroke-width="1.2"/>`,
  zhifu: `<rect x="10" y="12" width="28" height="26" rx="3"/><path d="M16.5 12v26M31.5 12v26" stroke-width="1.1"/><path d="M19 12l-1 5.5 3.5 1.5M29 12l1 5.5-3.5 1.5" stroke-width="1.3"/><path d="M19 12l5 7 5-7" ${JADE}/><circle cx="24" cy="25" r="1.2" fill="currentColor" stroke="none"/><circle cx="24" cy="31" r="1.2" fill="currentColor" stroke="none"/>`,
  banpai: `<path d="M8 38C6 29 8.5 18 17.5 10.5l1.3 1.8 1.7.2C13.5 19 11.5 28 12 36.5l-1.8 .3z"/><path d="M20 18.5c2.8 2.8 2.8 8.2 0 11M24.5 15c4.6 4.6 4.6 13.4 0 18" ${JADE} stroke-width="1.4"/><path d="M30 20.5c2.8 2.8 2.8 8.2 0 11M34.5 17c4.6 4.6 4.6 13.4 0 18" ${JADE} stroke-width="1.4" stroke-dasharray="2.2 2"/>`,
  muxie: `<path d="M7 34c-.5-8 4-14 11-13.5 6 .5 7 8 2 10-4 1.5-6.5-2.5-3.5-4.5"/><path d="M11 33.5c.3-5 3.3-8.6 7.5-8.8" stroke-width="1.1"/><path d="M41 33c1-8-3.5-13.5-10-13-5.5.5-6.5 7.5-2 9.5 3.5 1.5 6-2 3.5-4.5"/><path d="M37 32.5c.3-4.5-2-8-5.8-8.5" stroke-width="1.1"/><path d="M17 16c1.5-5 9-6.5 12.5-2.5 2.5 3-.5 6.5-4 4.5"/><circle cx="20" cy="39.5" r="1" fill="currentColor" stroke="none"/><circle cx="28.5" cy="40.5" r="1" fill="currentColor" stroke="none"/>`,
  wenbi: `<ellipse cx="24" cy="30" rx="14" ry="7.5"/><path d="M10 30v3c0 4.1 6.3 7.5 14 7.5s14-3.4 14-7.5v-3"/><ellipse cx="24" cy="30" rx="10" ry="5" stroke-width="1.2"/><path d="M18 19c-1.5-2 1.5-3 0-5.5M24 17c-1.5-2 1.5-3 0-5.5M30 19c-1.5-2 1.5-3 0-5.5" ${GOLD} stroke-width="1.4"/>`,
  laixin: `<rect x="7" y="12" width="34" height="25" rx="4" stroke-width="1.1"/><path d="M10 15h28v19H10z"/><path d="M10 15l14 10 14-10" stroke-width="1.2"/><circle cx="33" cy="21" r="4.2" ${CIN} stroke-width="1.4"/><path d="M28 20c1.5-1 3 1 4.5 0s3 1 4.5 0M28 22.6c1.5-1 3 1 4.5 0s3 1 4.5 0" ${CIN} stroke-width="1"/>`,
  cunpai: `<rect x="7" y="12" width="34" height="17" rx="3"/><circle cx="11" cy="20.5" r="1.3" stroke-width="1.1"/><circle cx="37" cy="20.5" r="1.3" stroke-width="1.1"/><path d="M15.5 17h17" stroke-width="1.2"/><path d="M20 23.5h8" stroke-width="3.2"/><path d="M15 32c-1.4 2-1.4 4 0 4s1.4-2 0-4zM24 33.5c-1.4 2-1.4 4 0 4s1.4-2 0-4zM33 32c-1.4 2-1.4 4 0 4s1.4-2 0-4z" ${JADE} stroke-width="1.3"/>`,
  budeng: `<path d="M18.5 31c-4-3-6.5-6.5-6.5-11 0-7 5.4-12.5 12-12.5S36 13 36 20c0 4.5-2.5 8-6.5 11v2.5h-11z" stroke-width="1.4"/><path d="M18.5 33.5v5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-5"/><path d="M18.5 36.5h11M19 39.3h10" stroke-width="1.2"/><path d="M21.5 31l.5-10M26.5 31l-.5-10" stroke-width="1.1"/><path d="M22 21l1-4 1 3.2 1-3.2 1 4" ${LAMP} stroke-width="1.7"/>`,
  wanchu: `<ellipse cx="24" cy="19" rx="16" ry="4.5"/><path d="M8 19c0 9.5 7 16.5 16 16.5S40 28.5 40 19"/><path d="M18 35l1 4.5h10l1-4.5"/><path d="M15 25.5v4.5M13.4 27h3.2M13.4 29l1.6 1.4 1.6-1.4M24 27v4.5M22.4 28.5h3.2M22.4 30.5l1.6 1.4 1.6-1.4M33 25.5v4.5M31.4 27h3.2M31.4 29l1.6 1.4 1.6-1.4" ${JADE} stroke-width="1.1"/><circle cx="19" cy="19.5" r="1" fill="currentColor" stroke="none"/><circle cx="24.5" cy="20.5" r="1" fill="currentColor" stroke="none"/><circle cx="29" cy="18.8" r="1" fill="currentColor" stroke="none"/>`,
  ventpaper: `<path d="M11 7.5l12 1 8.5-1 5.5 5.5-.8 14 .8 14.5-12.5-.8-13 .8.8-16z"/><path d="M31.5 7.5l-.8 5.8 6.3-.3" stroke-width="1.2"/><path d="M15 14h17v15H15zM15 19h17M15 24h17M20.7 14v15M26.3 14v15" stroke-width="1"/><path d="M14.5 32l2.5 2 2-3 2.5 4 2-3 2.5 4 2-2.5 2.5 3.5" ${CIN} stroke-width="1.4"/>`,
  wuzhen: `<circle cx="24" cy="26" r="15"/><path d="M24 13L24 17M30.5 14.7L29.4 16.6M35.3 19.5L33.4 20.6M37 26L33 26M35.3 32.5L33.4 31.4M30.5 37.3L29.4 35.4M24 39L24 35M17.5 37.3L18.6 35.4M12.7 32.5L14.6 31.4M11 26L15 26M12.7 19.5L14.6 20.6M17.5 14.7L18.6 16.6" stroke-width="1.2"/><circle cx="24" cy="26" r="1.5" fill="currentColor" stroke="none"/><path d="M21.5 11l2.5-4 2.5 4" stroke-width="1.4"/><path d="M30.9 8.8A18.5 18.5 0 0 1 37.7 13.6" ${JADE} stroke-width="1.6"/>`,
  zhanwu: `<path d="M14 7l-2 3.5 2 3-2 3.5 2 3-2 3.5 2 3-2 3.5 2 3-2 3.5 2 3.5h22V7z"/><path d="M19 15h13M19 21h8" stroke-width="1.3"/><rect x="28" y="32" width="5.5" height="5.5" ${CIN} stroke-width="1.4"/>`,
  chepiao: `<rect x="15" y="9" width="16" height="30" rx="2"/><circle cx="23" cy="15.5" r="2.5" stroke-width="1.4"/><path d="M19 24h8M19 29h6" stroke-width="1.2"/><path d="M36 26c-1.5-2 1.5-3 0-5.5M39.5 30c-1.5-2 1.5-3 0-5.5" ${CIN} stroke-width="1.4"/>`,
  tangzhi: `<path d="M16 16.5l8-1 8 1 .8 7.5-.8 7.5-8 1-8-1-.8-7.5z"/><path d="M15.5 17.5l-3 6.5 3 6.5M12.5 24L6.5 18l1.2 6-1.2 6zM32.5 17.5l3 6.5-3 6.5M35.5 24l6-6-1.2 6 1.2 6z"/><circle cx="24" cy="26.5" r="2.6" stroke-width="1.3"/><path d="M19.5 22.5h9M21.5 22.5v-3.5h5v3.5" stroke-width="1.3"/><path d="M10 7.5v5M7.5 10h5M38 35.5v5M35.5 38h5" stroke-width="1"/>`,
  guangbo: `<path d="M11 7h26v20l-2.5 1.5 2.5 1.5-2 1.5 2 1V41H11z"/><path d="M16 13h16M16 18h16M16 23h12" stroke-width="1.2"/><path d="M16 29.5h16" stroke-width="1.1"/><path d="M15 31l3-3.5 2 4 3-4.5 2 4.5 3-4.5 2 4.5 3-4 2 3" ${CIN} stroke-width="1.6"/><path d="M16 36.5h6" stroke-width="1"/>`,
  fapiao: `<g transform="rotate(-6 24 24)"><path d="M17 9.1L18.2 7.5L19.3 9.1L20.5 7.5L21.7 9.1L22.8 7.5L24 9.1L25.2 7.5L26.3 9.1L27.5 7.5L28.7 9.1L29.8 7.5L31 9.1L31 38.9L29.8 40.5L28.7 38.9L27.5 40.5L26.3 38.9L25.2 40.5L24 38.9L22.8 40.5L21.7 38.9L20.5 40.5L19.3 38.9L18.2 40.5L17 38.9z"/><path d="M20.5 14h7M20.5 18h5M20.5 22h7M20.5 26h4" stroke-width="1.1"/><path d="M19.5 30v2.4M21.4 30v2.4M23.3 30v2.4M25.2 30v2.4M27.1 30v2.4M29 30v2.4" stroke-width="1.2"/></g><path d="M29 35.5l2.2 2.4 5.3-6.4" ${CIN} stroke-width="1.8"/>`,
  huangdeng: `<circle cx="24" cy="26" r="11"/><path d="M9.5 27C9.5 16 16 10 24 10s14.5 6 14.5 17"/><path d="M17.5 25c.6-3.5 3-6 6.5-6.5M18.5 30.5c.4 1 1 2 1.8 2.7" stroke-width="1.1"/><path d="M24 40.5v3M14.5 36.5l-2.2 2.2M33.5 36.5l2.2 2.2" ${LAMP} stroke-width="1.6"/>`,
  jinianc: `<path d="M5 12c5.5-1.5 11.5-1.5 17 1 6-2.5 15-2.5 21-1v26c-6-1.5-15-1.5-21 1-5.5-2.5-11.5-2.5-17-1z"/><path d="M22 13v26" stroke-width="1.2"/><rect x="25.5" y="16" width="15" height="15" rx="1" stroke-width="1.2"/><circle cx="28.5" cy="20.5" r="1" fill="currentColor" stroke="none"/><circle cx="31.5" cy="20.5" r="1" fill="currentColor" stroke="none"/><circle cx="34.5" cy="20.5" r="1" fill="currentColor" stroke="none"/><circle cx="37.5" cy="20.5" r="1" fill="currentColor" stroke="none"/><circle cx="27.9" cy="26.5" r="1" fill="currentColor" stroke="none"/><circle cx="30.1" cy="26.8" r="1" fill="currentColor" stroke="none"/><circle cx="35.9" cy="26.8" r="1" fill="currentColor" stroke="none"/><circle cx="38.1" cy="26.5" r="1" fill="currentColor" stroke="none"/><circle cx="33" cy="26.5" r="1.7" stroke-width="1" stroke-dasharray="1 1.4"/><path d="M8 33.5c2-1.6 3.5 1.6 5.5 0s3.5 1.6 5.5 0" ${JADE} stroke-width="1.4"/>`,
  fengling: `<path d="M7 9h30"/><path d="M10 9.8L10.8 13.9M16 9.8L16.8 13.9M22 9.8L22.8 13.9M28 9.8L28.8 13.9M34 9.8L34.8 13.9" stroke-width="1"/><path d="M9.5 14.1L12 13.7L14.2 27.6L11.7 28zM15.5 14.1L18 13.7L21.1 33.5L18.7 33.9zM21.5 14.1L24 13.7L26.5 29.5L24.1 29.9zM27.5 14.1L30 13.7L33.5 35.5L31 35.9zM33.5 14.1L36 13.7L37.9 25.6L35.4 26z" stroke-width="1.4"/><path d="M17.8 25.6l1.8 1.2M30 26.8l1.8 1.2" ${CIN} stroke-width="1.4"/><path d="M38.5 24c1.6 1.8 1.6 4.2 0 6M41.5 21.5c2.6 3 2.6 8 0 11" stroke-width="1.1"/>`,
  daoyu: `<path d="M19.5 40.5V36c-4-1-6.5-3-6.5-6.5V11c0-2 1.8-3.5 4-3.5h14c2.2 0 4 1.5 4 3.5v18.5c0 3.5-2.5 5.5-6.5 6.5v4.5"/><path d="M17 41c2.3-1.4 4.6 1.4 7 0s4.7 1.4 7 0" stroke-width="1.3"/><path d="M14.5 13.5h19" ${JADE}/><path d="M19 20c-1.3 0-2.2.9-2.2 2 0 1.2 2.2 3.8 2.2 3.8s2.2-2.6 2.2-3.8c0-1.1-.9-2-2.2-2zM28.5 18c-1.3 0-2.2.9-2.2 2 0 1.2 2.2 3.8 2.2 3.8s2.2-2.6 2.2-3.8c0-1.1-.9-2-2.2-2zM24 26c-1.3 0-2.2.9-2.2 2 0 1.2 2.2 3.8 2.2 3.8s2.2-2.6 2.2-3.8c0-1.1-.9-2-2.2-2z" ${JADE} stroke-width="1.3"/>`,
  xiaozhong: `<path d="M24 4.5v5" stroke-width="3"/><path d="M18.5 10h11l2.5 11.5c.5 1.7 2.5 2.8 5 3.3H11c2.5-.5 4.5-1.6 5-3.3z"/><path d="M24 25v1.2"/><circle cx="24" cy="28" r="1.6" stroke-width="1.4"/><path d="M19.5 33c3-1.4 6-1.4 9 0M16.5 36c4.5-2.4 10.5-2.4 15 0" ${JADE} stroke-width="1.2" stroke-dasharray="1.6 1.8"/><ellipse cx="24" cy="39" rx="6" ry="1.8" stroke-width="1.4"/><path d="M18 39v3M30 39v3" stroke-width="1.4"/>`,
  piaogen: `<path d="M16 15h23a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H16"/><path d="M16 15H9l1.5 2.25L9 19.5l1.5 2.25L9 24l1.5 2.25L9 28.5l1.5 2.25L9 33h7"/><path d="M16 15v18" stroke-width="1.2" stroke-dasharray="1 2"/><path d="M21 20.5h15" stroke-width="1.4"/><rect x="21" y="24.5" width="15" height="5" stroke-width="1.2" stroke-dasharray="2 1.8"/>`,
  shenhua: `<path d="M17 42C16 33 18.5 25 27.7 15.9" stroke-width="1"/><path d="M26.9 13.7C21.4 8.4 25.4 5.6 28.5 12.6C29.2 6.6 34.7 11.9 30.8 14.8C36.7 16.4 36.1 22.4 30.6 17.3C33.6 24.2 27.7 22.7 28.1 16.7C24.1 19.3 21 12.3 26.9 13.7z" stroke-width="1.6"/><ellipse cx="29" cy="15" rx="1.4" ry="2.2" transform="rotate(-35 29 15)" ${JADE} stroke-width="1.1"/><ellipse cx="29" cy="15" rx="0.6" ry=".9" transform="rotate(-35 29 15)" ${JADE} stroke-width="1.1"/>`,
  _relic: `<path d="M10 30l6-16h16l6 16-14 12z"/><path d="M16 14l8 28M32 14l-8 28M10 30h28" stroke-width="1.1"/><circle cx="24" cy="22" r="2.2" ${JADE}/>`,
  youyou: `<rect x="8" y="13" width="32" height="22" rx="3"/><path d="M8 19h32" stroke-width="1.1"/><path d="M30 26c2-3 5-3 6 0-1 3-4 4-6 0z" stroke-width="1.2"/><path d="M13 29h10" stroke-width="1.1"/>`,
  lupai: `<path d="M8 12h26l6 6-6 6H8z"/><path d="M13 18h14" stroke-width="1.2"/><path d="M30 24l-3 6 4 3" stroke-width="1.1"/><path d="M14 24v18" />`,
  anquanmao: `<path d="M8 32c0-11 7-19 16-19s16 8 16 19z"/><path d="M5 32h38" /><path d="M24 13v8M18 15l2 7M30 15l-2 7" stroke-width="1.1"/><rect x="28" y="24" width="7" height="4" ${CIN}/>`,
  keben: `<path d="M9 10h24l6 6v24H9z"/><path d="M33 10v6h6" /><path d="M14 30l6-9 5 6 4-4 6 7" stroke-width="1.2"/><path d="M14 16h12" stroke-width="1.1"/>`,
  shouji: `<rect x="15" y="6" width="18" height="36" rx="3"/><path d="M18 13l6 5-3 4 7 3-4 6 4 4" stroke-width="1"/><path d="M22 38h4" />`,
  zhuban: `<rect x="8" y="12" width="32" height="24" rx="1"/><rect x="18" y="19" width="12" height="10"/><path d="M8 18h6M8 24h6M8 30h6M34 18h6M34 24h6M34 30h6M21 12v-4M27 12v-4" stroke-width="1.1"/><path d="M33 33l5 3" ${CIN}/>`,
  biao: `<circle cx="24" cy="24" r="12"/><path d="M24 24V16M24 24l-5 3" /><path d="M20 12l1-6h6l1 6M20 36l1 6h6l1-6" stroke-width="1.2"/><path d="M33 17c3 2 3 6 1 8" ${JADE}/>`,
  huishi: `<ellipse cx="24" cy="28" rx="13" ry="10"/><path d="M12 14c3-3 7-3 10 0M10 9c5-5 13-5 18 0" stroke-width="1.1" ${JADE}/>`,
  xianshui: `<path d="M18 6h12M20 6v8l-6 8v18h20V22l-6-8V6"/><path d="M14 26l20-6" ${JADE} stroke-width="1.6"/>`,
  wuguan: `<rect x="13" y="13" width="22" height="28" rx="4"/><path d="M15 8h18v5H15z"/><path d="M17 26c4-3 8 3 14 0M17 33c4-3 8 3 14 0" stroke-width="1.1"/><circle cx="21" cy="21" r="1" fill="currentColor"/>`,
  boliye: `<path d="M24 42V8"/><path d="M24 14l-8-4M24 14l8-4M24 21l-10-4M24 21l10-4M24 28l-11-3M24 28l11-3M24 35l-9-2M24 35l9-2" stroke-width="1.2" ${JADE}/>`,
  xianbei: `<path d="M8 30c0-12 7-20 16-20s16 8 16 20c-5 4-11 6-16 6s-11-2-16-6z"/><path d="M24 10v26M16 13l4 22M32 13l-4 22M11 20l7 15M37 20l-7 15" stroke-width="1"/>`,
  chanke: `<path d="M24 8c6 0 9 6 9 14s-4 16-9 18c-5-2-9-10-9-18s3-14 9-14z"/><path d="M24 12v26" stroke-width="1"/><path d="M15 20l-6-4M33 20l6-4M15 27l-7 1M33 27l7 1" stroke-width="1.2"/><path d="M20 30c2 2 6 2 8 0" ${JADE}/>`,
  bijiben: `<rect x="11" y="7" width="26" height="34" rx="1"/><path d="M15 7v34" stroke-width="1.1"/><path d="M19 14h14M19 19h12M19 24h10M19 29h8M19 34h3" stroke-width="1"/>`,
  luyin: `<rect x="7" y="13" width="34" height="22" rx="2"/><circle cx="17" cy="23" r="4"/><circle cx="31" cy="23" r="4"/><path d="M14 35l3-5h14l3 5" stroke-width="1.1"/><path d="M12 17h24" ${CIN}/>`,
  qianshi: `<path d="M14 6h20v36H14z"/><path d="M19 12v24M24 12v24M29 12v24" stroke-width="1" stroke-dasharray="2 2"/><path d="M14 6h20" ${CIN}/>`,
  hongzhu: `<circle cx="24" cy="24" r="13"/><path d="M15 27c4-2 6 1 9 0s6-3 9-1" stroke-width="1.1"/><path d="M27 14v8M24 18c3-2 5-2 7 0" stroke-width="1.1" ${JADE}/>`,
  lengyu: `<path d="M10 40C16 26 26 12 40 8c-2 14-12 26-26 30z"/><path d="M12 38l26-28" stroke-width="1.1"/><path d="M20 30l-4-6M26 24l-3-7M32 17l-2-6" stroke-width="1" ${JADE}/>`,
  zhibei: `<circle cx="24" cy="24" r="15"/><path d="M24 24l-12 4 12-6z" fill="var(--cinnabar)" stroke="none"/><path d="M24 24l12-4-12 6z"/><path d="M24 9v3M24 36v3M9 24h3M36 24h3" stroke-width="1.1"/>`,
  fushi: `<ellipse cx="24" cy="22" rx="11" ry="8"/><path d="M6 33c4-3 8 3 12 0s8 3 12 0 8 3 12 0" ${JADE}/>`,
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
  shuangjing: `<path d="M24 4l10 12-4 22-6 6-6-6-4-22z"/><path d="M14 16h20M24 4v40M19 16l5 28M29 16l-5 28" stroke-width="1.1"/><path d="M8 10l3 3M40 10l-3 3M6 26h4M42 26h-4" ${JADE} stroke-width="1.4"/>`,
  baitie: `<rect x="12" y="5" width="24" height="38" rx="1"/><path d="M12 11h24M12 37h24" stroke-width="1.1"/><path d="M24 15v18M20 19h8M20 25h8" ${CIN}/><circle cx="24" cy="41" r="0" />`,
  dues: `<rect x="7" y="10" width="34" height="28" rx="2"/><path d="M7 18h34M14 10v28M24 10v28M34 10v28" stroke-width="1.1"/><circle cx="14" cy="14" r="2"/><circle cx="24" cy="25" r="2"/><circle cx="34" cy="30" r="2"/><circle cx="14" cy="28" r="2"/>`
};
/* ----- ink portraits: one head per person, features swapped by expression ----- */
const FACES = ['neutral', 'smile', 'laugh', 'cold', 'angry', 'shock', 'sad', 'cry', 'uneasy', 'think', 'sweat', 'smug'];
function portrait(who, f = 'neutral', cls = '') {
  const L = who === 'me' ? { head: 'long', hair: 'topknot', beard: 'stubble', age: 'mid' } : ((NP[who] || {}).look);
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
const iconKey = id => ICON[id] ? id : (IT[id] && IT[id].cat === 'relic' ? '_relic' : null);
const icon = (id, cls = '') => iconKey(id) ? `<svg class="ico ${cls}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON[iconKey(id)]}</svg>` : '';

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
function mixHash(str) { let x = Math.floor(hash(str) * 4294967296); x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
const rnd = key => hash(S.seed + '|' + key);
const THR_KEY = 'fangshi-thr-v1', PAWN_KEY = 'fangshi-pawn-v1';
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ================= state ================= */
let S = null;
const UI = { view: 'title', tab: 'main', sheet: null, toast: null, night: { invest: 0, burn: false, pill: false } };

function newGame(seed, bonuses) {
  const s = {
    v: 1, seed, day: 1, slot: 0, phase: 'morning',
    stones: M.startStones, level: M.startLevel, xp: M.startXp, spirit: 0,
    stance: '低調', stanceDays: { 低調: 0, 張揚: 0 }, wind: 0,
    lots: [], lotSeq: 0, flags: {}, rel: {}, met: {}, mem: {}, tags: {}, notes: {}, homes: {},
    rep: { loose: 0, sect: 0, ghost: 0 }, repTag: {}, done: {}, events: [], cards: [], todayNews: [],
    codex: {}, teaBought: {}, overheard: {}, herbBought: {}, commission: null, pillYesterday: false,
    enc: null, place: null, night: null, dues: null, debt: 0, lifespan: M.lifespan,
    stats: { saw: 0, fooled: 0, wronged: 0 }, complaints: [], log: [], sold: [], dayStartStones: M.startStones, lifespanLeft: M.lifespan
  };
  s.shop = shopDefault();
  migrate(s);
  S = s;
  M.startLots.forEach(l => addLot({ item: l.item, qty: l.qty, cost: l.cost, label: l.label, known: true }));
  applyBonuses(bonuses);
  try { store.del(CKPT_KEY); } catch (e) {}
  beginDay();
  return s;
}

const DEFAULTS = () => ({ explored: {}, exploredDay: {}, seenDrift: {}, month: 1, monthStartLevel: M.startLevel, history: [], statLog: [], intel: {}, isold: {}, heat: 0, extraNews: [], accused: {}, baiSold: {}, intelSeenN: 0, shop: shopDefault(), burden: 0, pendingCards: [], reports: [], dayCount: 0, lastNet: 0, seenDeal: {}, dead: null, taps: 0, chars: 0 });
function shopDefault() { return { pol: { buy: 'normal', price: 'normal', cult: 'half', sign: '低調', cats: { herb: true, ore: true, old: true, daily: true, shady: false } }, staff: [], hiredDay: {}, upg: {}, total: 0, best: 0, evDay: {} }; }
function migrate(s) { const d = DEFAULTS(); for (const k in d) if (s[k] === undefined) s[k] = d[k]; return s; }

/* ----- lots ----- */
function addLot(o) {
  const it = IT[o.item]; if (!it) return null;
  const lot = { id: ++S.lotSeq, item: o.item, qty: o.qty || 1, cost: o.cost ?? 0, q: o.q ?? 1, flags: o.flags || [], label: o.label || it.name, known: !!o.known || (o.q ?? 1) >= 0.95 && !(o.flags || []).length, perishDay: o.perishDay || null, from: o.from || null };
  S.lots.push(lot); S.codex[o.item] = true; return lot;
}
const held = item => S.lots.filter(l => l.item === item).reduce((a, l) => a + l.qty, 0);
/* 遺物效果：放在庫房（帶在身上）就會作用 */
const heldRelics = () => [...new Set(S.lots.filter(l => l.qty > 0 && IT[l.item] && IT[l.item].eff).map(l => l.item))];
/* 林老師研究過的遺物：好的那一面加強一半（代價不變） */
const badFx = fx => !!fx && (fx.lifespan < 0 || fx.burden > 0 || fx.stones < 0);
function scaleEff(id, e) {
  if (!S.flags['studied_' + id]) return e;
  const x = JSON.parse(JSON.stringify(e)), before = JSON.stringify(e);
  if (x.passive) for (const k of Object.keys(x.passive)) if (x.passive[k] > 0) x.passive[k] = Math.round(x.passive[k] * 15) / 10;
  if (x.carry) { const c = x.carry; if (c.limit) c.limit += 1; if (c.ascent) c.ascent = Math.round((1 - (1 - c.ascent) * 1.5) * 100) / 100; if (c.protectAll) c.protectAll = Math.round((1 - (1 - c.protectAll) * 1.5) * 100) / 100; for (const k of Object.keys(c.protect || {})) c.protect[k] = Math.round(Math.pow(c.protect[k], 1.5) * 100) / 100; }
  if (x.night && x.night.chance && !badFx(x.night.fx)) x.night.chance = Math.min(0.9, Math.round(x.night.chance * 150) / 100);
  // 拿出來用的：代價少一點（負擔少 1），橡皮至少擦掉 3
  if (x.use) { if (x.use.fx && x.use.fx.burden > 0) x.use.fx = { ...x.use.fx, burden: x.use.fx.burden - 1 }; if (x.use.special === 'erase') x.use.eraseMin = 3; }
  if (JSON.stringify(x) !== before) x.studied = true; else x.studiedSame = true;
  return x;
}
/* 身上最多帶三件：要帶在身上才作用的遺物（回程、保命、預感），放在庫房就不出聲。詛咒的甩不掉。 */
const CARRY_N = 3;
const isCarryRelic = id => { const e = IT[id] && IT[id].eff; return !!(e && (e.carry || e.warn) && !e.curse); };
function syncCarry() {
  const h = heldRelics().filter(isCarryRelic); S.carrySeen = S.carrySeen || {};
  S.carry = (S.carry || []).filter(x => h.includes(x));
  for (const id of h) if (!S.carrySeen[id]) { S.carrySeen[id] = 1; if (S.carry.length < CARRY_N) S.carry.push(id); }
}
function toggleCarry(id) {
  syncCarry(); if (!isCarryRelic(id)) return;
  if (S.carry.includes(id)) { S.carry = S.carry.filter(x => x !== id); toast('「' + IT[id].name + '」放回庫房了。'); }
  else if (S.carry.length >= CARRY_N) toast('身上只放得下三件。先放下一件。');
  else { S.carry.push(id); toast('「' + IT[id].name + '」帶在身上了。'); }
}
const relicEff = () => { syncCarry(); return heldRelics().map(id => { let e = scaleEff(id, IT[id].eff); if ((e.carry || e.warn) && !e.curse && !S.carry.includes(id)) { e = { ...e }; delete e.carry; delete e.warn; e.stored = true; } return [id, e]; }); };
const PASSIVE_NAME = { traffic: '客流', sales: '會賣', appraise: '眼力', gossip: '閒聊', security: '守夜', night: '夜班', rest: '每晚退負擔', ticket: '客單價', margin: '利潤', offers: '來賣的人' };
function studiedDiff(id) {
  const b = IT[id].eff, x = scaleEff(id, b); if (!x.studied) return ''; const out = [], pct = v => Math.round(v * 100) + '%';
  const bc = b.carry || {}, xc = x.carry || {};
  if (xc.limit && xc.limit !== bc.limit) out.push('負擔上限＋' + xc.limit);
  if (xc.ascent && xc.ascent !== bc.ascent) out.push('回程危險剩 ' + pct(xc.ascent));
  if (xc.protectAll && xc.protectAll !== bc.protectAll) out.push('所有危險剩 ' + pct(xc.protectAll));
  for (const k of Object.keys(xc.protect || {})) if (xc.protect[k] !== (bc.protect || {})[k]) { out.push('危險剩 ' + pct(xc.protect[k])); break; }
  for (const k of Object.keys(x.passive || {})) if (x.passive[k] !== (b.passive || {})[k]) out.push((PASSIVE_NAME[k] || k) + '＋' + x.passive[k]);
  if (x.night && b.night && x.night.chance !== b.night.chance) out.push('夜裡出聲的機會變大');
  return out.length ? '研究後：' + out.join('、') : '';
}
const effLine = id => { const e = scaleEff(id, IT[id].eff); return `效果：${e.desc}${e.use ? '　可以用：' + e.use.desc : ''}${e.studied ? '（林老師研究過，好的那一面加強了' + (studiedDiff(id) ? '。' + studiedDiff(id) : '') + (e.use && e.use.eraseMin ? '：至少擦掉 3' : e.use && IT[id].eff.use && IT[id].eff.use.fx && IT[id].eff.use.fx.burden > 0 ? '：用的時候負擔少 1' : '') + '）' : e.studiedSame ? '（林老師研究過：她說得出它從哪裡來，可是它的用處沒有變）' : ''}${isCarryRelic(id) ? (S && (S.carry || []).includes(id) ? '　（帶在身上）' : '　（要帶在身上才有用）') : ''}`; };
function useBtn(id, compact) { const st = relicUseState(id); if (!st) return ''; const u = IT[id].eff.use; return `<button class="btn quiet${compact ? ' nowrap' : ''}" style="min-height:32px;font-size:13px" data-act="relicuse" data-id="${id}" ${st.ok ? '' : 'disabled'} title="${esc(u.desc + (st.why ? '（' + st.why + '）' : ''))}">${esc(u.label)}${st.ok || compact ? '' : (st.why ? '（' + esc(st.why) + '）' : '')}</button>`; }
const riskWord = r => r < 0.25 ? '這樣回去會喘' : r < 0.5 ? '這樣不一定回得來' : '這樣多半回不來';
const chanceWord = p => p >= 0.95 ? '幾乎一定' : p < 0.05 ? '不到一成' : '大概' + cnNum(Math.max(1, Math.round(p * 10))) + '成';
const deathChance = fx => { const d = fx && fx.death; if (!d) return 0; const dd = typeof d === 'string' ? { id: d } : d; if (dd.unless && needOk(dd.unless)) return 0; return (dd.chance == null ? 1 : dd.chance) * protectMult(dd.id); };
function warnRelic(fx) { const d = fx && fx.death; if (!d) return null; const dd = typeof d === 'string' ? { id: d } : d; if (dd.unless && needOk(dd.unless)) return null; if ((dd.chance == null ? 1 : dd.chance) * protectMult(dd.id) <= 0) return null; const r = relicEff().find(([, e]) => e.warn); return r ? r : null; }
const warnText = (wr, fx) => wr[1].warn + '（' + chanceWord(deathChance(fx)) + '會出事）';
/* ----- 拿出來用的遺物 ----- */
const relicUsed = id => (S.relicUsed || {})[id];
const outside = () => !!(S.place && PL[S.place.id] && PL[S.place.id].type === 'explore');
const truthPick = () => Object.keys(S.intel || {}).find(k => IN[k] && IN[k].kind === 'heard' && !(S.truthKnown || {})[k] && !(S.isold[k] || {}).burned);
function relicUseState(id) {
  const it = IT[id], u = it && it.eff && it.eff.use; if (!u || !held(id)) return null;
  if (S.dead || S.phase === 'end' || S.phase === 'dead') return { ok: false, why: '' };
  if (u.where === 'out' && !outside()) return { ok: false, why: '要在外面才能用' };
  if (u.where === 'out' && !S.place.steps) return { ok: false, why: '先走一處再說' };
  if (u.where === 'shop' && outside()) return { ok: false, why: '回到聚落才能用' };
  if (u.once === 'day' && relicUsed(id) === dayKey()) return { ok: false, why: '今天用過了' };
  if (u.special === 'extraStep' && !(S.place.acted && !S.place.strain)) return { ok: false, why: S.place.strain ? '這一趟太累了' : '還走得動，用不到' };
  if (u.special === 'truth' && !truthPick()) return { ok: false, why: '消息簿裡沒有要問的' };
  if (u.special === 'reveal' && S.reveal === dayKey()) return { ok: false, why: '今天已經看得很清楚了' };
  return { ok: true, why: '' };
}
function useRelic(id) {
  const st = relicUseState(id); if (!st || !st.ok) return false;
  const it = IT[id], u = scaleEff(id, it.eff).use; let text = u.text || ''; const notes = [];
  if (u.special === 'extraStep') { S.place.acted = false; S.place.steps = Math.max(0, (S.place.steps || 1) - 1); }
  if (u.special === 'reveal') S.reveal = dayKey();
  if (u.special === 'lessStep') S.lessStep = dayKey();
  if (u.special === 'erase') { const bd = S.burdenDay && S.burdenDay.k === dayKey() ? S.burdenDay.n : 0; const n = Math.max(u.eraseMin || 2, bd); const b0 = S.burden; S.burden = Math.max(0, S.burden - n); if (S.burden !== b0) notes.push('負擔－' + (b0 - S.burden)); }
  if (u.special === 'truth') { const k = truthPick(); const t = IN[k].truth !== false; S.truthKnown = { ...(S.truthKnown || {}), [k]: t ? 'true' : 'false' }; text = text.replace('{word}', t ? '真' : '假').replace('{short}', IN[k].short || IN[k].text); }
  if (u.special === 'noSkim') S.flags.naiya_buried = true;
  notes.push(...applyFx(u.fx));
  if (u.once === 'consume') takeQty(id, 1); else S.relicUsed = { ...(S.relicUsed || {}), [id]: dayKey() };
  S.relicLog = (S.relicLog || []).concat([{ id, k: 'use' }]); S.relicUses = (S.relicUses || 0) + 1;
  S.log.push({ day: S.day, t: '用了「' + it.name + '」' });
  if (u.special === 'safeReturn') { const b0 = S.burden; S.burden = Math.floor(S.burden / 2); if (b0 !== S.burden) notes.push('負擔－' + (b0 - S.burden)); S.place.strain = false; toast(text + (notes.length ? '　' + notes.join('　') : '')); advanceSlot(); return true; }
  if (S.place) { S.place.say = null; S.place.found = { title: '「' + it.name + '」', text, notes, icon: id }; }
  else S.useNote = { id, text, notes };
  toast('「' + it.name + '」' + (notes.length ? '　' + notes.join('　') : ''));
  return true;
}
const holdFlag = f => S.lots.some(l => l.flags.includes(f) && l.qty > 0);
function takeQty(item, qty, lotId) {
  let need = qty;
  const order = S.lots.filter(l => l.item === item && (!lotId || l.id === lotId));
  for (const l of order) { const t = Math.min(l.qty, need); l.qty -= t; need -= t; if (!need) break; }
  S.lots = S.lots.filter(l => l.qty > 0);
  return qty - need;
}
const lotById = id => S.lots.find(l => l.id === id);
const lotValue = (l, day = S.day, trueQ = false) => price(l.item, day) * ((trueQ || l.known) ? l.q : 1) * l.qty;

/* ----- relations ----- */
const rel = n => S.rel[n] || 0;
function addRel(n, d) { S.rel[n] = rel(n) + d; S.met[n] = true; }
function addMem(n, t) { (S.mem[n] = S.mem[n] || []).push({ day: S.day, m: MON(), t }); S.met[n] = true; }
function attitude(n) { const r = rel(n); return r <= -4 ? '結仇' : r <= -2 ? '有隙' : r >= 4 ? '交心' : r >= 2 ? '熟客' : '生客'; }
function bucketOf(npc) { const n = NP[npc]; if (!n) return 'eq'; if (n.level >= 10 && S.level < 10) return 'far'; const d = S.level - n.level; return d >= 3 ? 'up' : d <= -3 ? 'down' : 'eq'; }
function callYou(npc) { const c = (NP[npc] || {}).call || {}; const b = bucketOf(npc); return (b === 'far' || b === 'down' ? c.down : b === 'up' ? c.up : c.eq) || '老闆'; }
const sub = (t, npc) => String(t ?? '').replace(/〈你〉/g, callYou(npc));
const quote = t => /^[「（…]/.test(t) ? t : '「' + t + '」';
const npcLv = n => NP[n].conceal ? '看不出深淺' : lvName(NP[n].level);

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
  if (need.month && (Array.isArray(need.month) ? !need.month.includes(MON()) : need.month !== MON())) return false;
  if (need.staff && ![].concat(need.staff).every(x => S.shop.staff.includes(x))) return false;
  if (need.noStaff && need.noStaff.some(x => S.shop.staff.includes(x))) return false;
  if (need.upg && ![].concat(need.upg).every(x => S.shop.upg[x])) return false;
  if (need.pol) for (const [k, v] of Object.entries(need.pol)) { const cur = k in S.shop.pol.cats ? S.shop.pol.cats[k] : S.shop.pol[k]; if (cur !== v) return false; }
  if (need.minHired != null) { const ids = [].concat(need.staff || []); if (!ids.length || ids.some(x => S.dayCount - (S.shop.hiredDay[x] ?? 99) < need.minHired)) return false; }
  if (need.secMax != null && shopStats().security > need.secMax) return false;
  if (need.net != null && (S.lastNet || 0) < need.net) return false;
  if (need.minDays != null && S.dayCount < need.minDays) return false;
  if (need.burdenHigh && S.burden <= burdenLimit()) return false;
  if (need.relMax) for (const [k, v] of Object.entries(need.relMax)) if (rel(k) > v) return false;
  if (need.level && S.level < need.level) return false;
  if (need.heatMin != null && (S.heat || 0) < need.heatMin) return false;
  if (need.done && !need.done.every(x => S.explored && S.explored[x])) return false;
  return true;
}
function applyFx(fx, ctx = {}) {
  if (!fx) return [];
  const notes = [];
  if (fx.death) {
    const d = typeof fx.death === 'string' ? { id: fx.death } : fx.death;
    const saved = d.unless && needOk(d.unless);
    const roll = (window.__deathRoll || Math.random)();
    const ch = (d.chance == null ? 1 : d.chance) * protectMult(d.id);
    if (!saved && roll < ch) { die(d.id); return notes; }
    let prot = false;
    if (!saved && roll < (d.chance == null ? 1 : d.chance)) { prot = true; const rid = protectBy(d.id); notes.push(rid ? `「${IT[rid].name}」救了你一次。${IT[rid].eff.saved || ''}` : '裝備救了你一次。'); if (rid) { S.relicSaves = (S.relicSaves || 0) + 1; S.relicLog = (S.relicLog || []).concat([{ id: rid, k: 'save', d: d.id }]); } }
    const sif = saved && (d.savedIf || []).find(x => needOk(x.need));
    // 逃過一劫的文字如果寫到某件遺物或某個夥計，只有那個條件真的成立才出現；靠運氣活下來的，給一句不提東西的
    const uj = d.unless ? JSON.stringify(d.unless) : '', condText = /"(has|staff)"/.test(uj);
    const hasIds = [...uj.matchAll(/"has":\{([^}]*)\}/g)].flatMap(m => [...m[1].matchAll(/"(\w+)"/g)].map(x => x[1]));
    const textOk = saved && (!hasIds.length || hasIds.some(x => held(x)));
    if (saved && hasIds.length && !ctx.noCount) { const hr = hasIds.find(x => held(x) && IT[x] && IT[x].eff); if (hr) { S.relicSaves = (S.relicSaves || 0) + 1; S.relicLog = (S.relicLog || []).concat([{ id: hr, k: 'save', d: d.id }]); } }
    if (sif) notes.push(sif.text); else if (d.saved && (textOk || !condText)) notes.push(d.saved); else if (d.saved && !prot) notes.push('你也說不上來為什麼，這一次什麼都沒發生。');
  }
  if (fx.note) noteGeneric(fx.note, 'shop');
  if (fx.heat) { const h0 = S.heat; S.heat = Math.max(0, S.heat + fx.heat); if (fx.heat < 0 && S.heat < h0) notes.push('注意度－' + (h0 - S.heat)); }
  if (fx.fire) fireStaff(fx.fire, true);
  if (fx.setPol) Object.assign(S.shop.pol, fx.setPol);
  if (fx.giveRelic) { const r = pickRelic(fx.giveRelic, 'fx' + S.day + S.slot); if (r) { addLot({ item: r, qty: 1, cost: 0, known: true }); notes.push('得到「' + IT[r].name + '」'); } }
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
  if (fx.burden) { const b0 = S.burden; S.burden = Math.max(0, S.burden + fx.burden); if (S.burden !== b0) notes.push((S.burden > b0 ? '負擔＋' : '負擔－') + Math.abs(S.burden - b0)); }
  if (fx.xp) { const before = S.level; S.xp += fx.xp; let nd = M.xpNeed[S.level]; while (S.level < 9 && S.xp >= nd) { S.xp -= nd; S.level++; nd = M.xpNeed[S.level]; } notes.push('身體適應＋' + fx.xp + (S.level > before ? '（到了' + lvName(S.level) + '）' : '')); }
  if (fx.lifespan) { S.lifespan += fx.lifespan; notes.push((fx.lifespan > 0 ? '壽命＋' : '壽命－') + monthsText(Math.abs(fx.lifespan))); }
  if (fx.removeEvent) S.events = S.events.filter(e => e.id !== fx.removeEvent);
  if (fx.buyback) { let got = 0; for (const l of S.lots.filter(x => x.flags.includes(fx.buyback.flag))) { got += rp(l.cost * l.qty * fx.buyback.ratio); l.qty = 0; } S.lots = S.lots.filter(l => l.qty > 0); if (got) { S.stones += got; notes.push('＋' + fmt(got) + ' 靈石'); } }
  if (fx.refundLot) { let got = 0; for (const l of S.lots.filter(x => x.item === fx.refundLot.item)) { got += rp(l.cost * l.qty * fx.refundLot.ratio); l.qty = 0; } S.lots = S.lots.filter(l => l.qty > 0); if (got) { S.stones += got; notes.push('＋' + fmt(got) + ' 靈石'); } }
  if (fx.unfool) { S.stats.fooled = Math.max(0, S.stats.fooled - 1); S.flags['won_' + fx.unfool] = true; }
  if (fx.spreadText) S.extraNews.push({ day: S.day + 1, src: '街上', text: fx.spreadText });
  if (fx.sellHot) {
    let got = 0;
    for (const [item, unit] of Object.entries(fx.sellHot)) for (const l of S.lots.filter(x => x.item === item && x.flags.includes('stolen') || x.item === item && x.flags.includes('sting'))) { got += unit * l.qty; l.qty = 0; if (l.flags.includes('entrusted')) { addRel('aheng', -5); addMem('aheng', '託你交給管理處的雪蟾酥，你賣去了黑市。'); S.flags.betrayed_aheng = true; } }
    S.lots = S.lots.filter(l => l.qty > 0); S.stones += got; notes.push('＋' + fmt(got) + ' 靈石');
  }
  return notes;
}

/* ================= day flow ================= */
/* 遺物不是鑰匙：成對放著會起反應、放久了會引來人、見得多了會有人來數。一天最多一張。 */
function relicReactions() {
  const R = D.relicReact; if (!R) return; S.heldSince = S.heldSince || {};
  const dc = S.dayCount || 0;
  for (const id of heldRelics()) if (S.heldSince[id] == null) S.heldSince[id] = dc;
  for (const id of Object.keys(S.heldSince)) if (!held(id)) delete S.heldSince[id];
  const card = (x, ic) => { S.flags[x.id] = 1; if (x.id === 'att_qianshi') S.pawnShiftNext = dc + 1; S.cards.push({ title: x.title, text: x.alt && !S.codex[x.alt.unlessSeen] ? x.alt.text : x.text, notes: applyFx(x.fx || {}), icon: ic }); if (ic) S.relicLog = (S.relicLog || []).concat([{ id: ic, k: 'react' }]); };
  const total = Object.keys(S.codex).filter(k => IT[k] && IT[k].cat === 'relic').length;
  const th = (R.thresholds || []).find(t => !S.flags[t.id] && total >= t.n);
  if (th) return card(th, null);
  const p = (R.pairs || []).find(p => !S.flags[p.id] && held(p.a) && held(p.b));
  if (p) return card(p, p.a);
  const a = (R.attract || []).find(a => !S.flags[a.id] && held(a.item) && dc - S.heldSince[a.item] >= (a.days || 2) && needOk(a.need || {}));
  if (a) return card(a, a.item);
}
function beginDay() {
  S.phase = 'morning'; S.slot = 0; S.place = null; S.enc = null; S.night = null;
  S.spirit = M.spirit[S.level] || 2; S.dayStartStones = S.stones; S.cards = [];
  if (S.day === 1 && MON() === 1) S.cards.push({ title: D.events.e_intro.title, text: D.events.e_intro.text });
  S.relicLogDay = { k: dayKey(), n: (S.relicLog || []).length };
  if (S.day === 1 && MON() === 1 && !S.memChecked) {
    S.memChecked = true; S.thrMem = store.get(THR_KEY) || {};
    const best = THREADS.map(t => [t, (S.thrMem[t.id] || []).filter(i => t.steps[i])]).filter(x => x[1].length).sort((a, b) => b[1].length - a[1].length)[0];
    if (best) { const st = best[0].steps[Math.max(...best[1])]; S.cards.push({ title: '櫃檯還摺著上次的東西', text: `櫃檯抽屜最裡面，有一張摺了好幾摺的紙。是你的字，可是你不記得寫過：「${st.text}」下面還有幾行，被水暈開了，看不清楚。` }); }
    const dep = store.get(PAWN_KEY); if (dep && IT[dep.item]) { S.pendingDep = dep; store.del(PAWN_KEY); }
  }
  relicReactions();
  if (S.pawnShiftNext != null && (S.dayCount || 0) >= S.pawnShiftNext) { S.pawnShiftNext = null; S.pawnShift = { k: dayKey(), m: rnd('pawnshift:' + dayKey()) < 0.5 ? 0.1 : -0.1 }; }
  if (S.day === 3 && MON() === 1 && S.pendingDep) { const dep = S.pendingDep; S.pendingDep = null; addLot({ item: dep.item, qty: 1, cost: 0, known: true }); S.cards.push({ title: '長生當鋪送來的包裹', text: `一大早，有人把一個牛皮紙包放在門口。單子上的取件人寫的是你的名字，字跡也是你的。裡面是${IT[dep.item].name}。你不記得寄放過它。` }); }
  if (S.day === 1 && MON() > 1) {
    S.cards.push({ title: '長生當鋪的字條', text: `天還沒亮，門縫裡又塞進來一張字條：「許先生，尚餘${monthsText(S.lifespan)}。」`, face: 'think' });
    for (const c of ((D.events.monthStart || {})[MON()] || [])) if (needOk(c.need || {}) && (c.chance == null || hash(S.seed + ':gap:' + c.title + MON()) < c.chance)) S.cards.push({ title: c.title, text: c.text, notes: applyFx(c.fx), face: c.face });
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
  if (S.pendingCards && S.pendingCards.length) { S.cards.push(...S.pendingCards); S.pendingCards = []; }
  driftEvent();
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
  ckptSave();
}
// 散事：沒有固定日子的小事。每天最多一件，依 seed 擲骰；同一件只發生一次。
function driftEvent() {
  if (S.cards.length >= 4) return;
  const pool = (D.events.drift || []).filter(e => inMonth(e) && !S.seenDrift[e.id] && (!e.days || (S.day >= e.days[0] && S.day <= e.days[1])) && needOk(e.need || {}) && hash(S.seed + ':drift:' + e.id + ':' + MON() + ':' + S.day) < (e.chance ?? 0.4));
  const e = pool.sort((a, b) => (b.prio || 0) - (a.prio || 0))[0]; if (!e) return;
  S.seenDrift[e.id] = true;
  const ch = (e.choices || []).filter(c => needOk(c.need || {}));
  S.cards.push({ title: e.title, text: e.text, notes: applyFx(e.fx), face: e.face, drift: e.id, choices: ch.length ? ch.map(c => ({ label: c.label, desc: c.desc || '' })) : null });
}
function driftChoose(ci, vi) {
  const c = S.cards[ci]; if (!c || !c.choices || c.picked != null) return;
  const e = ALLEV[c.drift]; if (!e) return;
  const opts = (e.choices || []).filter(o => needOk(o.need || {})); const o = opts[vi]; if (!o) return;
  c.picked = vi; c.choices = null; c.result = o.text; c.notes = [...(c.notes || []), ...applyFx(o.fx)];
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
    S.cards.push({ title: '聽雨茶館來人', text: I.burn, notes: back ? ['－' + fmt(back) + ' 靈石'] : [], face: 'sweat' }); return;
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
function openShop() { if (S.cards.some(c => c.choices)) return false; S.phase = 'day'; UI.tab = 'main'; return true; }
function advanceSlot() {
  S.slot++; S.place = null; S.enc = null; S.phase = 'day';
  if (S.slot >= 3) goNight();
}
function endDay() {
  if (S.dead) return;
  S.stanceDays[S.stance] = (S.stanceDays[S.stance] || 0) + 1; S.dayCount = (S.dayCount || 0) + 1;
  for (const d of D.deals) {
    if (S.done[d.id] || d.extra || !inMonth(d) || d.days[1] !== S.day) continue;
    if (d.missed && needOk(d.need)) applyFx(d.missed);
    S.done[d.id] = needOk(d.need) ? 'missed' : 'na';
  }
  if (S.dead) return;
  S.day++;
  if (S.day > DAYS()) { if (MON() < LAST_MONTH) passTime(); else finish(); return; }
  beginDay();
}
function finish() {
  S.cards = [];
  for (const ev of S.events) if (ev.day > DAYS()) runEvent(ev);
  for (const c of S.complaints) { S.stones -= c.refund; S.rep.loose -= 1; S.repTag.loose = '賣次貨'; S.cards.push({ title: '有人回來退貨', text: `在你這兒買${c.label}的人回來了：「${D.events.complaint[c.reason] || D.events.complaint.default}」你退了 ${fmt(c.refund)} 塊靈石。` }); }
  S.complaints = [];
  S.events = [];
  S.phase = 'end'; S.lifespanLeft = S.lifespan - 1;
  try { store.del(CKPT_KEY); } catch (e) {}
  const sc = scoreTotal(), best = store.get(bestKey());
  S.finalScore = sc; S.prevBest = best ? best.score : null;
  if (!best || sc > best.score) store.set(bestKey(), { score: sc, grade: gradeOf(), at: Date.now() });
}
// 一段忙日子結束：不結算、不評等，直接跳過平淡的日子，進入下一段。
function passTime() {
  const carry = [];
  const saved = S.cards; S.cards = [];
  for (const ev of S.events) if (ev.day > DAYS()) runEvent(ev);
  for (const c of S.complaints) { S.stones -= c.refund; S.rep.loose -= 1; S.repTag.loose = '賣次貨'; S.cards.push({ title: '有人回來退貨', text: `在你這兒買${c.label}的人回來了：「${D.events.complaint[c.reason] || D.events.complaint.default}」你退了 ${fmt(c.refund)} 塊靈石。` }); }
  carry.push(...S.cards); S.cards = saved;
  const EN = MON() > 1 ? (D.endings['m' + MON()] || {}) : D.endings;
  for (const t of (EN.teasers || []).filter(t => needOk(t.need)).slice(0, 2)) carry.push({ title: '還沒完的事', text: t.text });
  S.finalScore = scoreTotal();
  const gy = gapYield();
  nextMonth();
  const gap = ((M.months || {})[MON()] || {}).gap;
  S.cards.unshift(...carry);
  S.cards.unshift(gy);
  if (gap) S.cards.unshift({ title: gap.title || '過了些日子', text: gap.text });
}
function goalLevel() { return M.goalLevel || (M.startLevel + 2); }
function nextMonth() {
  if (MON() >= LAST_MONTH) return;
  S.history.push({ m: MON(), grade: gradeOf(), score: S.finalScore, stats: { ...S.stats } });
  S.month = MON() + 1; S.day = 1; S.lifespan -= 1; S.monthStartLevel = S.level;
  const melted = S.lots.filter(l => l.perishDay); S.lots = S.lots.filter(l => !l.perishDay);
  if (S.commission && !S.commission.done) S.commission.ready = Math.max(2, S.commission.ready - M.days);
  Object.assign(S, { teaBought: {}, overheard: {}, herbBought: {}, baiSold: {}, dues: null, wind: 0, stanceDays: { 低調: 0, 張揚: 0 }, log: [], events: [], complaints: [], extraNews: [], finalScore: null, prevBest: null });
  S.flags['month' + (S.month - 1) + '_done'] = true;
  S.heat = Math.floor((S.heat || 0) / 2); delete S.flags.heat3; delete S.flags.heat5;
  for (const d of D.deals) if (d.month === 'all' && S.done[d.id] && !['special', 'special2'].includes(S.done[d.id])) delete S.done[d.id];
  S.smithBought = {}; S.burden = 0;
  beginDay();
  for (const l of melted) S.cards.unshift({ title: '東西壞了', text: (D.events.melt[l.item] || D.events.melt.default.replace('{name}', l.label)) });
}
const BEST_KEY = 'fangshi-best-v1';
const bestKey = () => BEST_KEY + '-run';
const GR = () => ({ top: 3, low: 8, ...(M.grade || {}) });
function gradeOf() { const m = S.stats.fooled + S.stats.wronged; return S.debt > 0 || m >= GR().low ? '下' : (S.level >= goalLevel() && m <= GR().top) ? '上' : '中'; }
function scoreRows() {
  const nw = netWorth(true);
  return [
    { k: 'saw', label: '看穿', n: S.stats.saw, per: 10 },
    { k: 'fooled', label: '吃虧', n: S.stats.fooled, per: -15 },
    { k: 'wronged', label: '錯怪好人', n: S.stats.wronged, per: -10 },
    { label: '修行（開張以來每升一層）', n: Math.max(0, S.level - M.startLevel), per: 30 },
    { label: '身家（每十靈石）', n: Math.floor(Math.max(0, nw) / 10), per: 1 },
    { label: '名聲（街坊＋寒潭會那邊）', n: (S.rep.loose || 0) + (S.rep.sect || 0), per: 5 },
    { label: '欠錢不語', n: S.debt ? 1 : 0, per: -30 }
  ];
}
const scoreTotal = () => scoreRows().reduce((a, r) => a + r.n * r.per, 0);

/* ================= encounters ================= */
function dealAvail(d) { return inMonth(d) && !S.done[d.id] && S.day >= d.days[0] && S.day <= d.days[1] && needOk(d.need); }
function nextShopDeal() { return D.deals.filter(d => d.where === 'shop' && dealAvail(d)).sort((a, b) => (b.prio || 0) - (a.prio || 0))[0] || null; }

function startDeal(id, from) {
  const d = DEALS[id]; const npc = d.npc;
  S.met[npc] = true; S.stance = S.shop.pol.sign;
  if (S.stance === '張揚' && !S.seenDeal[id]) S.wind++;
  const enc = { deal: id, npc, side: d.side, item: d.item, qty: d.qty || 1, price: d.price, tea: TEA[NP[npc].traits.patience] || 4, th: [], press: 0, haggle: 0, asked: false, silent: false, appraised: false, verified: [], cold: false, done: null, from, lot: null };
  enc.teaMax = enc.tea;
  if (d.side === 'buy') {
    const lots = S.lots.filter(l => l.item === d.item);
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
    if (S.debt > 0) { enc.debtDue = rp(S.debt * 1.3); enc.due += enc.debtDue; enc.th.push({ k: 'narr', t: `錢不語也從對門踱了過來，手裡捏著一張借據：「許老弟，上個月墊的 ${fmt(S.debt)}，三分利，${fmt(enc.debtDue)}。一起算了吧。」` }); enc.th.push({ k: 'sys', t: `規費加還錢家店，一共 ${fmt(enc.due)}。` }); }
  } else enc.th.push({ k: 'npc', t: sub(d.open, npc) });
  enc.face = d.openFace || baseFace(npc);
  // realm & stance layer: adjust the opening price and say so
  if ((d.side === 'sell' || d.side === 'buy') && !d.extra) {
    const b = bucketOf(npc);
    if (b === 'eq' && S.stance === '低調') { /* nothing to say */ } else {
    let m = d.side === 'sell' ? ({ up: .93, eq: 1, down: 1.06, far: 1.1 })[b] : ({ up: 1.06, eq: 1, down: .95, far: .92 })[b];
    m *= d.side === 'sell' ? (S.stance === '低調' ? 1.04 : .96) : (S.stance === '低調' ? .97 : 1.03);
    const np = rp(d.price * m);
    if (np !== d.price && d.price >= 2) {
      enc.price = np;
      const better = d.side === 'sell' ? np < d.price : np > d.price;
      let line;
      if (S.stance === '張揚' && better) line = `你這次沒有刻意低調。${NP[npc].name}停了一下，改口：「${cnPrice(np)}。」`;
      else if (b === 'up') line = `${NP[npc].name}打量了你一下，語氣客氣了一點：「給${callYou(npc)}算${cnPrice(np)}。」`;
      else if (better) line = `${NP[npc].name}想了想，改口：「${cnPrice(np)}。」`;
      else line = `${NP[npc].name}打量了你一下，把價錢${d.side === 'sell' ? '往上提了提' : '往下壓了壓'}：「${cnPrice(np)}。」`;
      enc.th.push({ k: 'narr', t: line });
    }
    }
  }
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
  if (enc.auto) return;
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
function actSilence() {
  const e = S.enc, d = DEALS[e.deal];
  e.silent = true; e.th.push({ k: 'me', t: '（你沒有說話，只是看著對方。）', f: 'think' });
  if (typeof d.silence === 'object') { e.th.push({ k: 'narr', t: sub(d.silence.narr, e.npc) }); if (d.silence.f) e.face = d.silence.f; } else say(e, sub(d.silence, e.npc), d.silenceFace || baseFace(e.npc));
  if (d.silenceRaise && d.silenceRaise > e.price) e.price = d.silenceRaise;
  if (d.silenceDrop && d.silenceDrop < e.price) e.price = d.silenceDrop;
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
  if (step) { e.price = step.price; say(e, sub(step.a, e.npc), step.f || 'think'); }
  else say(e, quote(sub(NP[e.npc].refuse, e.npc)), 'cold');
  pushTells(e, 'haggle'); spend(e, 2);
}
function actAppraise() {
  const e = S.enc, d = DEALS[e.deal];
  S.spirit--; e.appraised = true;
  e.th.push({ k: 'me', t: `（你以眼力探向${d.itemName || (IT[d.item] && IT[d.item].name) || '那件東西'}。）` });
  for (const a of d.appraise) if (S.level >= a.realm) e.th.push({ k: 'sys', t: a.text });
  e.th.push({ k: 'narr', t: '以你的眼力，只看得到這麼多。' });
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
  e.th.push({ k: 'me', t: `（「容我想想。」你出門去找${NP[who].name}${v.cost ? `，花了 ${v.cost} 塊靈石` : ''}。回來時，已經是${SLOT[S.slot]}。）` });
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
      out.push({ key: 'sell', label: '賣給他', desc: `收 ${fmt(e.price * e.qty)} 靈石`, primary: true });
      if (l && l.known && l.q < 0.9) out.push({ key: 'honest', label: '照實說', desc: `說清楚成色，照成色賣：${fmt(rp(e.price * l.q) * e.qty)} 靈石` });
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
      if (S.stones < e.due && pawnable().length) { const v = pawnable().reduce((a, l) => a + pawnValue(l), 0); out.push({ key: 'goods', label: '拿貨抵', desc: `何小姐照市價七成收貨抵規費（你的貨約值 ${fmt(v)}）`, primary: true }); }
      out.push({ key, label: S.stones >= e.due ? `照付（${e.due}）` : `差 ${fmt(e.due - S.stones)}，請錢不語墊付`, desc: S.stones >= e.due ? '' : '要還，有利息', primary: S.stones >= e.due || !pawnable().length });
      continue;
    }
    if (key === 'poor' && (!e.high || e.poorTried)) continue;
    const okNeed = needOk(o.need, e);
    if (!okNeed && !o.fail) continue;
    let label = o.label, desc = '';
    const unit = o.price ?? e.price;
    if (key === 'deal') {
      label = label || (d.side === 'sell' ? '買下' : d.side === 'buy' ? '賣給他' : '答應');
      if (d.side === 'sell') desc = `付 ${fmt(unit * e.qty)} 靈石`;
      else if (d.side === 'buy') desc = e.qty > 0 ? `收 ${fmt(unit * e.qty)} 靈石` : '你手上沒有這貨';
      else if (d.price) desc = `收 ${fmt(unit)} 靈石辛苦費`;
    } else if (key === 'decline') { label = label || '婉拒'; desc = '不傷和氣'; }
    else if (key === 'expose') { label = label || '拆穿'; desc = label === '點破' ? '把你看出來的毛病說出來' : '當面說破。說錯了，得罪的是無辜的人'; }
    else if (key === 'report') { label = label || '報警'; desc = '交給公家處理。街坊會記得'; }
    else if (key === 'refer') { label = label || '轉介給錢家店'; desc = '把這筆生意送去對門'; }
    else if (o.price) desc = `付 ${fmt(o.price * e.qty)} 靈石`;
    let disabled = false;
    if ((key === 'deal' || o.price) && d.side === 'sell' && S.stones < unit * e.qty) { disabled = true; desc = '靈石不夠'; }
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
      const total = unit * e.qty;
      if (S.stones < total) { toast('靈石不夠'); return; }
      S.stones -= total;
      if (d.item === 'box') { /* the box's contents come through fx */ }
      else if (IT[d.item]) addLot({ item: d.item, qty: e.qty, cost: unit, q: d.lot && d.lot.q, flags: d.lot && d.lot.flags, label: d.lot && d.lot.label, perishDay: d.lot && d.lot.perishDay, from: d.id });
      notes.push('－' + fmt(total) + ' 靈石');
    } else if (d.side === 'buy') {
      const l = lotById(e.lot); if (!l) return;
      const q = Math.min(e.qty, l.qty);
      takeQty(d.item, q, l.id); S.stones += unit * q; notes.push('＋' + fmt(unit * q) + ' 靈石');
      if (d.dirty && l.flags.includes(d.dirty.flag)) { if (d.dirty.event) S.events.push({ id: d.dirty.event, day: S.day + 1, refund: unit * q, back: { item: l.item, qty: q, cost: l.cost, q: l.q, flags: l.flags, label: l.label } }); if (d.dirty.fx) applyFx(d.dirty.fx); }
      if (d.honestyTest) {
        if (l.q < 0.8) S.events.push({ id: 'e_xiaoman_back', day: S.day + 1, refund: unit * q, back: { ...l, qty: q } });
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
  const SEAL = { deal: d.side === 'sell' ? '買下' : d.side === 'buy' ? '賣出' : '答應', decline: '婉拒', expose: '拆穿', report: '報警', refer: '轉介', sellhot: '銷贓', mask: '面具', pay: '照付', poor: '哭窮' };
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
  S.log.push({ day: S.day, t: `${NP[e.npc].name}：${d.title}（${e.done.label}）` });
  scanLearn();
}
function scheduleComplaint(l, qty, unit) {
  const reason = l.flags.includes('painted') ? 'painted' : l.flags.includes('damp') ? 'damp' : 'default';
  if (rnd('cmp' + l.id + S.day) < 0.65) S.complaints.push({ day: S.day + 1, item: l.item, qty, refund: rp(unit * qty), cost: l.cost, q: l.q, flags: l.flags, label: l.label, reason });
}
const pawnable = () => S.lots.filter(l => IT[l.item].base && IT[l.item].base < 100 && !l.flags.some(f => ['stolen', 'sect', 'sting'].includes(f)));
const pawnValue = l => rp(price(l.item) * 0.7 * (l.known ? l.q : Math.min(1, l.q + 0.2))) * l.qty;
function decideDues(key) {
  const e = S.enc, d = DEALS.d18;
  if (key === 'goods') {
    const ls = pawnable().sort((a, b) => pawnValue(b) - pawnValue(a));
    const took = [];
    for (const l of ls) { if (S.stones >= e.due) break; S.stones += pawnValue(l); took.push(l.label + '×' + l.qty); S.lots = S.lots.filter(x => x !== l); }
    e.th.push({ k: 'npc', t: `何小姐叫管理處的人把${took.join('、')}搬走：「照市價七成，算你抵了。」` });
    if (S.stones >= e.due) { S.stones -= e.due; if (e.debtDue) S.debt = 0; e.th.push({ k: 'res', t: d.opts.pay.text, notes: ['－' + e.due + ' 靈石', '貨抵：' + took.join('、')] }); e.done = { key: 'pay', label: '貨抵' }; S.dues = { paid: true, amount: e.due }; }
    return;
  }
  if (key === 'poor') {
    e.poorTried = true;
    if ((S.stanceDays['低調'] || 0) >= 4 && S.wind < M.windHigh) { e.due = MD().dues + (e.debtDue || 0); e.th.push({ k: 'npc', t: d.opts.poor.text.replace('八十', cnNum(MD().dues)) }); }
    else { e.th.push({ k: 'npc', t: d.opts.poor.fail.text.replace('一百', cnNum(MD().duesHigh)) }); applyFx(d.opts.poor.fail.fx); }
    return;
  }
  if (key === 'pay') {
    if (S.stones >= e.due) { S.stones -= e.due; if (e.debtDue) { S.debt = 0; addMem('qian', '你把上個月的借款連本帶利還清了。'); } e.th.push({ k: 'res', t: d.opts.pay.text + (e.debtDue ? '錢不語把借據撕了，笑著點點頭。' : ''), notes: ['－' + e.due + ' 靈石'] }); e.done = { key, label: '照付' }; }
    else {
      const owe = e.due - S.stones; S.debt = rp(owe); S.stones = 0; S.flags.debt = true; addMem('qian', `月底替你墊了 ${fmt(owe)} 靈石的規費。`);
      e.th.push({ k: 'res', t: `錢不語在門口探頭：「差多少？我先替你墊上。」他把 ${fmt(owe)} 塊靈石放在櫃上：「三分利，下個月還。不急，不急。」`, notes: ['欠錢不語 ' + fmt(owe)] });
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
  const sellable = S.lots.filter(l => (IT[l.item].sell || []).includes('walk') && !l.flags.some(f => ['sect', 'sting', 'contraband'].includes(f)));
  if (S.stance === '張揚') S.wind++;
  const enc = { generic: true, who, npc: null, tea: 3, teaMax: 3, th: [], done: null, from: 'shop', chatted: false, haggled: false, lot: null };
  if (sellable.length && rnd(k + 'want') < 0.8) {
    const weights = sellable.map(l => dem[IT[l.item].cat] ?? 1);
    let r = rnd(k + 'pick') * weights.reduce((a, b) => a + b, 0), lot = sellable[0];
    for (let i = 0; i < sellable.length; i++) { r -= weights[i]; if (r <= 0) { lot = sellable[i]; break; } }
    const it = IT[lot.item];
    enc.lot = lot.id; enc.item = lot.item;
    enc.qty = Math.min(lot.qty, 1 + Math.floor(rnd(k + 'q') * (it.base >= 30 ? 1 : 3)));
    let p = price(lot.item) * (0.95 + rnd(k + 'p') * 0.14) * (S.stance === '張揚' ? 1.03 : 1);
    enc.price = rp(p);
    enc.th.push({ k: 'narr', t: `${who}進了門。` });
    enc.th.push({ k: 'npc', t: `「老闆，${it.name}有嗎？${cnNum(enc.qty)}${it.unit}，${cnPrice(enc.price)}一${it.unit}。」` });
    S.codex[lot.item] = true;
  } else {
    enc.th.push({ k: 'narr', t: `${who}進了門，看了一圈，什麼都沒買。` });
  }
  S.enc = enc; S.phase = 'enc';
}
function actChat() {
  const e = S.enc; e.chatted = true; e.tea -= 1;
  e.th.push({ k: 'me', t: '最近聚落裡有什麼新鮮事？' });
  const pool = ((MON() > 1 ? D.news['gossip' + MON()] : D.news.gossip) || {})[S.day] || [];
  const give = S.stance === '低調' || rnd('g' + S.day + S.slot) < 0.3;
  S.gossipSeen = S.gossipSeen || {};
  const line = pool.find(g => !S.gossipSeen[g]);
  if (S.heat >= 5) { e.th.push({ k: 'npc', t: '他看了你一眼：「跟你說了，明天全聚落都知道。」' }); return; }
  if (give && line) { S.gossipSeen[line] = true; e.th.push({ k: 'npc', t: `「${line}」` }); noteGeneric('散客說：' + line, 'street'); }
  else e.th.push({ k: 'npc', t: give ? '「沒什麼新鮮的。」' : '他打量了你一下，只點點頭，沒多說。' });
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
    if (!l) return;
    const unit = key === 'honest' ? rp(e.price * l.q) : e.price;
    const q = Math.min(e.qty, l.qty);
    takeQty(l.item, q, l.id); S.stones += unit * q;
    if (key === 'honest') { S.rep.loose += 1; S.repTag.loose = '實在'; e.th.push({ k: 'res', t: `你把成色說清楚了。他想了想，照成色付了錢：「許老闆實在。」`, notes: ['＋' + fmt(unit * q) + ' 靈石'] }); }
    else { e.th.push({ k: 'res', t: '他付了錢，把東西收好走了。', notes: ['＋' + fmt(unit * q) + ' 靈石'] }); if (l.q < 0.7) scheduleComplaint(l, q, unit); }
    e.done = { key, label: key === 'honest' ? '照實' : '賣出' };
    S.log.push({ day: S.day, t: `散客買走${IT[l.item].name}×${q}` });
  } else { e.done = { key, label: '送客' }; e.th.push({ k: 'res', t: '他走了。' }); }
}
function closeEnc() {
  const e = S.enc; if (!e) return;
  const from = e.from;
  S.enc = null;
  if (from === 'visit') { S.phase = 'day'; }
  else if (from === 'shop') { S.phase = 'day'; advanceSlot(); }
  else if (from === 'dues') { S.phase = 'night'; }
  else { S.phase = 'place'; }
}
function startDues() { S.dues = { paid: false }; startDeal('d18', 'dues'); }

/* ================= places ================= */
function placeOpen(id) {
  const p = PL[id]; if (!p) return false;
  if (p.days && !p.days.includes(S.day)) return false;
  if (closedDays(p).includes(S.day)) return 'closed';
  if (p.minLevel && S.level < p.minLevel) return 'level';
  return p.hours.includes(S.slot);
}
function closedDays(p) { return Array.isArray(p.closed) ? (MON() === 1 ? p.closed : []) : ((p.closed || {})[MON()] || []); }
function enterPlace(id) {
  S.place = { id, acted: false, homeSeen: null, did: false }; S.phase = 'place';
  const p = PL[id]; if (p.npc) S.met[p.npc] = true;
  if (id === 'huichun') { (p.sells || []).forEach(s => { S.codex[s.item] = true; }); (p.display || []).forEach(x => { S.codex[x] = true; }); }
  if (id === 'pawn') S.codex.dangpiao = true;
  if (id === 'school') S.met.lin = true;
}
function leavePlace() {
  const id = S.place && S.place.id, extra = S.place && S.place.strain;
  if (S.place && !S.place.steps && !S.place.did && !S.place.watched) { S.place = null; S.phase = 'day'; toast('只是進去看一眼，沒花什麼時間。'); return; }
  if (id && PL[id].type === 'explore' && (S.place.steps || S.place.watched)) S.visits = { ...(S.visits || {}), [id]: ((S.visits || {})[id] || 0) + 1 };
  if (id && PL[id].type === 'explore' && S.place.steps) {
    const risk = ascentRisk(), raw = ascentRisk(S.burden, id, true);
    if (risk > 0) { if (!S.flags.ascent_grace) { S.flags.ascent_grace = true; S.burden += 1; S.log.push({ day: S.day, t: '負擔超過上限，你在半路上吐了，爬了很久才爬上來。' }); toast('你差一點就上不來了。下一次負擔超過上限，可能真的上不來。'); } else { const roll = (window.__deathRoll || Math.random)(); const aid = (PFX[id] || {}).ascent || 'asc_ruin'; if (roll < risk) { die(aid); return; } const gr = gearStats().relic; const rid = roll < raw ? (gr.by[aid] || gr.ascBy || gr.allBy) : null; if (rid) { S.relicSaves = (S.relicSaves || 0) + 1; S.relicLog = (S.relicLog || []).concat([{ id: rid, k: 'save', d: aid }]); S.log.push({ day: S.day, t: `回程差一點上不來，「${IT[rid].name}」救了你。` }); toast(`「${IT[rid].name}」救了你一次。${IT[rid].eff.saved || '你爬上來了。'}`); } else { S.log.push({ day: S.day, t: '差一點就上不來了。' }); toast('差一點就上不來了。'); } } }
  }
  advanceSlot(); if (extra && S.phase === 'day') { S.slot++; if (S.slot >= 3) goNight(); }
}
function spotBurden(id, sp) { if (sp.burden != null) return sp.burden; const b = (PFX[id] || {}).burden || 0; return b ? b + (sp.strain ? 1 : 0) : 0; }
/* ----- 往外走 ----- */
const EXPLORE = ['ruin', 'tunnel', 'reservoir', 'cliff', 'north', 'stair', 'lampst', 'platform'];
const revealed = p => !p.reveal || [].concat(p.reveal).some(f => S.flags[f]);
const spotList = id => (PL[id] && PL[id].spots) || [];
const SPOT_PLACE = {};
function spotPlace(sp) { if (!SPOT_PLACE.__init) { for (const [pid, p] of Object.entries(PL)) for (const x of (p.spots || [])) SPOT_PLACE[x.id] = pid; SPOT_PLACE.__init = true; } return SPOT_PLACE[sp.id]; }
const isLethal = sp => !!(sp && sp.fx && sp.fx.death) && deathChance(sp.fx) > 0;
const firstVisit = pid => !!PL[pid] && PL[pid].type === 'explore' && !(S.visits || {})[pid];
const deathOf = sp => { const d = sp && sp.fx && sp.fx.death; return d ? (typeof d === 'string' ? d : d.id) : null; };
/* 第一次去的地方，會死的那幾處先不給走：只留下徵兆 */
function spotOk(sp) {
  if (!spotOk0(sp)) return false;
  if (!sp.repeat && isLethal(sp) && firstVisit(spotPlace(sp))) return false;
  return true;
}
function spotOk0(sp) {
  if (sp.months && !sp.months.includes(MON())) return false;
  if (sp.days && !(S.day >= sp.days[0] && S.day <= sp.days[1])) return false;
  if (sp.after && !S.explored[sp.after]) return false;
  return true;
}
function spotsAvail(id) { return spotList(id).filter(sp => spotOk(sp) && (sp.repeat ? !S.exploredDay[sp.id + ':' + MON() + ':' + S.day] : !S.explored[sp.id])); }
function spotsNew(id) { return spotList(id).filter(sp => !sp.repeat && spotOk(sp) && !S.explored[sp.id] && needOk(sp.need) && !isLethal(sp)).length; }
const lethalLeft = id => spotList(id).filter(sp => !sp.repeat && !S.explored[sp.id] && spotOk0(sp) && needOk(sp.need) && isLethal(sp));
function exploredCount(id) { return spotList(id).filter(sp => S.explored[sp.id]).length; }
function explore(spotId, alt) {
  const id = S.place.id, p = PL[id], sp = spotList(id).find(x => x.id === spotId);
  if (!sp || S.place.acted || !spotOk(sp) || !needOk(sp.need)) return;
  if (alt && !(sp.fx && sp.fx.death && !sp.repeat && (S.remember || {})[deathOf(sp)])) return;
  if (sp.cost && S.stones < sp.cost) { toast('靈石不夠'); return; }
  S.place.steps = (S.place.steps || 0) + 1;
  if (sp.cost) S.stones -= sp.cost;
  const bAdd = spotBurden(id, sp); S.burden += bAdd; S.place.burdenAdded = (S.place.burdenAdded || 0) + bAdd;
  if (bAdd) S.burdenDay = { k: dayKey(), n: (S.burdenDay && S.burdenDay.k === dayKey() ? S.burdenDay.n : 0) + bAdd };
  let text = sp.text, fx = sp.fx;
  if (alt) { fx = { ...fx, death: undefined, give: undefined, xp: Math.floor((fx.xp || 0) / 2) }; text = '你記得上一次在這裡發生的事。這一次你沒有照著做，繞了很遠的路，只看，不碰。'; S.burden += 2; S.place.burdenAdded = (S.place.burdenAdded || 0) + 2; S.altUsed = (S.altUsed || 0) + 1; }
  if (sp.repeat) {
    S.exploredDay[sp.id + ':' + MON() + ':' + S.day] = true;
    const n = (S.explored[sp.id] || 0);
    const pool = sp.loot || [];
    const pick = pool[Math.floor(hash(S.seed + ':' + sp.id + ':' + MON() + ':' + S.day + ':' + n) * pool.length)] || { text: '什麼都沒有。', fx: {} };
    text = pick.text; fx = pick.fx;
    const g = gearStats();
    if (g.loot && hash(S.seed + ':bag:' + sp.id + MON() + S.day) < g.loot) { const p2 = pool[Math.floor(hash(S.seed + ':bag2:' + sp.id + MON() + S.day) * pool.length)]; if (p2 && p2 !== pick && p2.fx && p2.fx.give) { text += '\n採集袋裡還多塞了一樣：' + p2.text; fx = { ...fx, give: [...(fx.give || []), ...p2.fx.give] }; } }
  }
  S.explored[sp.id] = (S.explored[sp.id] || 0) + 1;
  const lot0 = S.lotSeq;
  const notes = (sp.cost ? ['－' + sp.cost + ' 靈石'] : []).concat(applyFx(fx));
  if (alt) notes.push('負擔＋2（繞路）');
  if (!S.dead) S.place.got = (S.place.got || []).concat(S.lots.filter(l => l.id > lot0).map(l => l.id));
  if (S.dead) { S.place.found = { title: sp.title, text, notes }; return; }
  if (sp.deep && S.level >= sp.deep.level) text += '\n' + sp.deep.text;
  if (bAdd) notes.push('負擔＋' + bAdd);
  if (sp.strain) { S.place.strain = true; notes.push('回程會多花一個時段'); }
  // 一趟最多看兩處（登山杖多一處）；走到會累的地方，這一趟就到此為止
  const gs0 = gearStats();
  const less = S.lessStep === dayKey() ? 1 : 0;
  if (less && S.place.steps === 1 + gs0.steps && !S.place.strain) notes.push('「半杯冷茶」：你忘了還要去哪裡。');
  if (S.place.strain || S.place.steps >= 2 + gs0.steps - less) S.place.acted = true;
  else { notes.push('體力還夠，可以再看一處'); if (gs0.relic.steps && S.place.steps >= 2 + gs0.steps - gs0.relic.steps) { notes.push(`「${IT[gs0.relic.stepBy].name}」：好像還多出一點時間。`); S.relicLog = (S.relicLog || []).concat([{ id: gs0.relic.stepBy, k: 'step' }]); } }
  if (sp.note) noteGeneric(sp.note, 'explore:' + id);
  S.place.say = null; S.place.found = { title: sp.title, text, notes };
  S.log.push({ day: S.day, t: p.name + '：' + sp.title });
}
/* ----- 把最重的留下：一趟一次，留下這趟撿到最值錢的一樣，負擔減半 ----- */
function dropCands() { if (!S.place || S.place.dropped || !S.place.steps || S.place.watched) return []; return (S.place.got || []).map(lotById).filter(l => l && IT[l.item] && IT[l.item].cat !== 'story' && !KEEP.includes(l.item) && !l.flags.some(f => ['evidence', 'entrusted'].includes(f))); }
function dropHeavy() {
  const ls = dropCands(); if (!ls.length) return;
  const l = ls.sort((a, b) => ((IT[b.item].base || 0) * b.qty) - ((IT[a.item].base || 0) * a.qty))[0];
  const n = Math.max(1, Math.ceil((S.place.burdenAdded || 0) / 2));
  const lq = l.qty; takeQty(l.item, lq, l.id); const b0 = S.burden; S.burden = Math.max(0, S.burden - n);
  S.place.dropped = true; S.place.did = true; S.dropped = (S.dropped || 0) + 1;
  S.leftBehind = { ...(S.leftBehind || {}), [S.place.id]: { item: l.item, qty: lq, label: l.label, q: l.q, known: l.known, flags: l.flags } };
  S.place.say = null; S.place.found = { title: '把最重的留下', text: `你把${l.label}放在一塊乾的石頭上，用袖子擦掉上面的灰。它在這裡等了很久，再等幾天也沒差。`, notes: b0 !== S.burden ? ['負擔－' + (b0 - S.burden)] : [] };
  S.log.push({ day: S.day, t: PL[S.place.id].name + '：把' + l.label + '留在原地' });
}
function pickBack() {
  const lb = (S.leftBehind || {})[S.place.id]; if (!lb || S.place.acted) return;
  addLot({ item: lb.item, qty: lb.qty, cost: 0, q: lb.q, known: lb.known, flags: lb.flags, label: lb.label });
  const L = { ...S.leftBehind }; delete L[S.place.id]; S.leftBehind = L;
  S.burden += 1; S.place.did = true;
  S.place.say = null; S.place.found = { title: '你留下的東西', text: `${lb.label}還在那塊石頭上。上面積了一層新的灰，像有人來看過它，又放回去了。`, notes: ['負擔＋1'] };
}
/* ----- 站著看：不往裡走，花掉這個時段，換一點線索、喘一口氣 ----- */
function watchPlace() {
  const id = S.place.id, p = PL[id]; if (p.type !== 'explore' || S.place.steps || S.place.acted || S.place.watched) return;
  S.place.watched = true; S.place.acted = true; S.place.did = true; S.watched = (S.watched || 0) + 1;
  S.signs = S.signs || {};
  const lethal = spotList(id).filter(sp => !sp.repeat && !S.explored[sp.id] && spotOk0(sp) && isLethal(sp));
  for (const sp of lethal) S.signs[sp.id] = 1;
  const cand = spotsAvail(id).filter(sp => !sp.repeat && !isLethal(sp) && needOk(sp.need));
  const look = cand.length ? cand[Math.floor(rnd('watch:' + id + MON() + S.day) * cand.length)] : null;
  let text = '你沒有往裡走，只是在邊上找了個地方坐下來，看了很久。';
  if (look) text += `\n${look.title}那邊——${look.hint || '好像有什麼。'}`;
  if (lethal.length) text += '\n有些地方，從這裡就看得出不對勁：' + lethal.slice(0, 2).map(sp => sp.danger || sp.title).join('；');
  else if (!look) text += '\n這一帶，你大概都看過了。';
  const notes = applyFx({ xp: 4, burden: S.burden > 0 ? -1 : 0 });
  S.place.say = null; S.place.found = { title: '站在邊上看', text, notes };
  S.log.push({ day: S.day, t: p.name + '：站在邊上看了一會兒' });
}
/* ----- 長生當鋪：寄放一件遺物給下一次的你 ----- */
function deposit(lotId) {
  const l = lotById(lotId); if (!l || S.flags.deposited || IT[l.item].cat !== 'relic') return;
  takeQty(l.item, 1, l.id); store.set(PAWN_KEY, { item: l.item, label: l.label }); S.flags.deposited = true; S.place.did = true;
  S.place.say = `他把${l.label}包進牛皮紙，在單子上寫了一個日期。你看不懂那是哪一年。「下一次，」他說，「下一次會有人送去給你。」`;
  S.place.sayWho = NP.dianzhu ? 'dianzhu' : null; S.log.push({ day: S.day, t: '把' + l.label + '寄放在長生當鋪' });
}
/* ----- 舊物室 ----- */
const relicLots = () => S.lots.filter(l => (IT[l.item].sell || []).includes('lin'));
const linPrice = l => rp(IT[l.item].base * 1.2 * (l.q || 1) * (rel('lin') >= 3 ? 1.1 : 1));
function linAct(kind, lotId) {
  const l = lotById(lotId); if (!l) return;
  const it = IT[l.item];
  if (kind === 'sell') { const pr = linPrice(l); takeQty(l.item, 1, l.id); S.stones += pr; addRel('lin', 0); S.place.say = `林老師把${it.name}拿起來看了很久，才把靈石數給你：「我會好好寫它的小卡。」`; S.place.sayWho = 'lin'; toast(`賣給舊物室，＋${fmt(pr)} 靈石`); S.log.push({ day: S.day, t: `舊物室收了${it.name}` }); }
  else if (kind === 'study') { S.flags['studied_' + l.item] = true; S.studied = (S.studied || 0) + 1; addRel('lin', 1); const h = (it.hidden || []).find(x => x.need.flag === 'studied_' + l.item); S.place.say = h ? h.text : `林老師翻來覆去看了很久，最後在小卡上寫：「還不知道。」她把${it.name}還給你：「不知道也是一種紀錄。」`; S.place.sayWho = 'lin'; S.codex[l.item] = true; }
  else if (kind === 'give') { takeQty(l.item, 1, l.id); addRel('lin', 2); S.rep.loose = (S.rep.loose || 0) + 1; S.repTag.loose = '肯分享'; S.flags.donated = true; S.donated = (S.donated || 0) + 1; S.place.say = `林老師愣了一下，把${it.name}收進架子，在小卡上寫下你的名字：「捐贈：許衡。」她說這一格以後就是你的了。`; S.place.sayWho = 'lin'; }
}
function stallsToday() { return PL.market.stalls.filter(s => inMonth(s) && S.day >= s.days[0] && S.day <= s.days[1] && !(s.deal && DEALS[s.deal] && !S.done[s.deal] && !needOk(DEALS[s.deal].need))); }
const stallDeal = s => (s.deals || (s.deal ? [s.deal] : [])).map(id => DEALS[id]).find(d => d && dealAvail(d)) || DEALS[(s.deals || [s.deal])[0]];
function smithOffer(l) {
  const b = PL.smith.buys[l.item]; if (!b) return null;
  if (b.fixed) return b.fixed * l.q;
  let p = (b.useBase ? IT[l.item].base : price(l.item)) * b.mult * l.q; if (b.aliveBonus && l.flags.includes('alive')) p *= b.aliveBonus;
  return rp(p);
}
function sellToSmith(id) {
  const l = lotById(id), p = smithOffer(l); if (!l || p == null) return;
  const total = PL.smith.buys[l.item].fixed ? p : p * l.qty;
  S.stones += total; S.lots = S.lots.filter(x => x !== l); S.met.tie = true;
  if (l.flags.includes('stolen') && l.item === 'duanshui') { addMem('tie', '你把那把斷水刀賣給了他。他什麼都沒問。'); }
  if (l.item === 'lingsui') S.flags.gave_tie_lingsui = true;
  learnTrigger('smith:' + l.item);
  S.place.say = PL.smith.buys[l.item].say; S.place.sayWho = 'tie'; toast(`賣給鐵師傅，＋${fmt(total)} 靈石`);
}
function commission() {
  const c = PL.smith.commission;
  if (held(c.needItem) < c.needQty || S.stones < c.fee || S.commission) return;
  takeQty(c.needItem, c.needQty); S.stones -= c.fee; S.commission = { ready: S.day + c.days, done: false, cost: c.fee + 8 * c.needQty };
  S.homes.tie = true; addRel('tie', 1); S.place.say = c.say; S.place.sayWho = 'tie'; toast('鐵師傅接了活。三天。');
}
function huichunOffer(l) {
  const it = IT[l.item]; if (!(it.sell || []).includes('huichun')) return null;
  if (l.flags.some(f => ['sect', 'sting', 'stolen'].includes(f))) return 'refuse-sect';
  if (l.flags.includes('painted')) return 'refuse-paint';
  return rp(price(l.item) * PL.huichun.buyMult * l.q);
}
function sellToHuichun(id) {
  const l = lotById(id), o = huichunOffer(l); if (!l || o == null) return;
  if (o === 'refuse-sect') { S.place.say = '「寒潭會的東西，回春藥行不收。許老闆，這東西你最好別留。」'; l.known = true; return; }
  if (o === 'refuse-paint') { S.place.say = '張主任把葉子翻過來，對著光看了一眼：「金線是畫的。許老闆，回春藥行不收這種東西。」'; l.known = true; addRel('zhang', -1); S.flags.zhang_saw_fake = true; return; }
  const total = o * l.qty; S.stones += total; l.known = true; S.lots = S.lots.filter(x => x !== l);
  S.place.say = l.q < 0.9 ? `「成色差了些，${cnPrice(o)}一${IT[l.item].unit}。」張主任慢慢點了靈石。` : '張主任點了點頭，慢慢點了靈石。';
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
  S.stones -= t.price; b.push(i); S.log.push({ day: S.day, t: '聽雨茶館：' + t.text, rumor: true });
  noteGeneric('聽雨茶館的消息單：' + t.text, 'bai');
}
function overhear() { if (S.overheard[S.day]) return; S.overheard[S.day] = true; const oh = D.news.overhear.find(o => inMonth(o) && o.day === S.day); if (oh && !learnTrigger('oh:' + MON() + ':' + S.day)) noteGeneric('在聽雨茶館聽到隔壁桌說：' + oh.text, 'bai'); }
function askBai(who) {
  const c = PL.tea.askCost; if (S.stones < c) { toast('靈石不夠'); return; }
  S.stones -= c; S.place.say = '「' + (PL.tea.about[who] || '這個人，我不熟。') + '」'; S.place.sayWho = 'bai'; UI.sheet = null;
  addMem(who, '白姐說：' + (PL.tea.about[who] || ''));
  noteGeneric(`白姐說起${NP[who].name}：「${PL.tea.about[who] || '這個人，我不熟。'}」`, 'bai');
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
      text = `周警員收下保冷盒，記了一筆，給了你 ${reward} 塊獎金。你把一半包好，託人送去給阿蘅。`;
      addMem('aheng', '你把獎金分了她一半。');
    } else if (answer === 'aheng') {
      S.stones += reward; addRel(z, 2); addRel('aheng', -5); S.flags.aheng_taken = true; S.rep.loose -= 2; S.repTag.loose = '會報警'; S.rep.sect += 1;
      text = `「採藥的阿蘅？」周警員記下了名字，給了你 ${reward} 塊：「許老闆明事理。」`;
      addMem('aheng', '你把她的名字報給了管理處。');
    } else {
      S.stones += reward; addRel(z, -1);
      text = `「路過的人？」周警員看了你很久，還是給了你 ${reward} 塊：「下次記清楚一點。」`;
    }
    S.flags.xuechan_turned = true; S.place.say = text; addMem(z, '你交出了寒潭會的雪蟾酥。');
  }
  if (kind === 'duanshui') {
    const lot = S.lots.find(l => l.item === 'duanshui'); if (!lot) return;
    S.lots = S.lots.filter(l => l !== lot); S.stones += 20; addRel(z, 1); S.flags.knife_turned = true;
    S.place.say = '周警員接過刀，翻過來看了看刀柄：「余小六的刀。」他給了你二十塊。';
  }
  if (kind === 'sting') {
    S.lots = S.lots.filter(l => !l.flags.includes('sting')); S.events = S.events.filter(e => e.id !== 'e_sting'); addRel(z, 1); S.flags.passed_sting = true;
    S.place.say = '周警員看著那三瓶療傷藥，笑了：「你倒是機靈。」他把藥收了，沒罰你。';
  }
  UI.sheet = null;
}
const pawnMult = () => S.pawnShift && S.pawnShift.k === dayKey() ? 1 + S.pawnShift.m : 1;
const redeemCost = () => Math.round(M.redeemCost * pawnMult());
function redeem() { const c = redeemCost(); if (S.stones < c) return; S.stones -= c; S.lifespan++; S.place.say = '「許先生贖回一個月。」當鋪老闆在當票上添了一筆。'; }
function visitHome(npc) { S.place.homeSeen = npc; S.place.acted = true; S.met[npc] = true; learnTrigger('home:' + npc);
  if (npc === 'yao') { S.flags.knows_yao_paints = true; addMem('yao', '家裡桌上有一碟金粉和一支極細的狼毫筆，筆尖是濕的。'); }
  if (npc === 'aheng') { S.flags.saw_aheng_home = true; addMem('aheng', '門口有一雙男人的鞋，鞋底是黑市巷子的黑泥。'); }
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
  if (!IN[id]) return { price: 0, why: rec.src === 'bai' ? '聽雨茶館自己的消息' : rec.src === 'street' ? '街上人人都在說' : '這種話，她自己問得到' };
  const I = IN[id];
  if (S.isold[id]) return { price: 0, why: S.isold[id].barter ? '已經拿去換過了' : '已經賣給她了' };
  if (I.fromBai) return { price: 0, why: '聽雨茶館自己的消息' };
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
function baiSays(I, p) { return I.baiText || (p >= 15 ? '白姐的笑深了一點：「這一則，值錢。」' : p >= 8 ? '白姐點點頭：「還算新鮮。」' : '白姐撥了撥算盤：「聊勝於無。」'); }
function sellIntel(id, premium = 1) {
  const I = IN[id], o = intelOffer(id, premium); if (!I || !o.price) return null;
  const solo = intelSolo(I);
  S.stones += o.price; S.isold[id] = { day: S.day, m: MON(), price: o.price };
  S.heat += 1 + (solo ? 1 : 0);
  if (I.sellFlag) S.flags[I.sellFlag] = true;
  addMem('bai', `你賣給她一則消息：${I.short}。`);
  if (I.leak) S.events.push({ id: 'leak:' + id, day: S.day + 1 });
  if (I.truth === false) S.events.push({ id: 'burn:' + id, day: Math.max(S.day + 1, I.reveal || 0) });
  if (I.spread && !I.suppress) S.extraNews.push({ day: S.day + 1, src: '聽雨茶館傳出', text: I.spread });
  for (const lv of Object.keys(D.heat || {}).map(Number).sort((a, b) => a - b)) if (S.heat >= lv && !S.flags['heat' + lv]) { S.flags['heat' + lv] = true; S.events.push({ id: 'heat:' + lv, day: S.day + 1 }); }
  S.log.push({ day: S.day, t: `賣給白姐：${I.short}（${o.price} 靈石）` });
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
  if (I.spread && !I.suppress) S.extraNews.push({ day: S.day + 1, src: '聽雨茶館傳出', text: I.spread });
  for (const lv of Object.keys(D.heat || {}).map(Number).sort((a, b) => a - b)) if (S.heat >= lv && !S.flags['heat' + lv]) { S.flags['heat' + lv] = true; S.events.push({ id: 'heat:' + lv, day: S.day + 1 }); }
  e.th.push({ k: 'me', t: `（你把「${I.short}」說給她聽。）` });
  const notes = applyFx(o.fx);
  e.th.push({ k: 'res', t: sub(o.text, e.npc), notes });
  e.done = { key: 'barter', label: '拿消息換', notes, seal: '換訊' }; S.done[e.deal] = 'barter';
  S.log.push({ day: S.day, t: `拿「${I.short}」跟白姐換了消息` });
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
  S.log.push({ day: S.day, t: '管理處：' + a.label });
}

/* ================= night ================= */
function meditate(invest, burn, pill) {
  invest = Math.max(0, Math.min(invest, S.stones, M.nightCap));
  let gain = invest * (burn ? 1.4 : 1);
  let burnQ = 1;
  if (burn) { const bl = S.lots.find(l => l.item === 'dingshen'); burnQ = bl ? bl.q : 1; takeQty('dingshen', 1, bl && bl.id); gain = invest * (1 + 0.4 * burnQ); }
  if (pill) { takeQty('yangqi', 1); gain += S.pillYesterday ? 9 : 18; }
  S.stones -= invest; S.xp += Math.round(gain); S.pillYesterday = !!pill;
  const before = S.level; let need = M.xpNeed[S.level];
  while (S.level < 9 && S.xp >= need) { S.xp -= need; S.level++; need = M.xpNeed[S.level]; }
  S.night = { invest, gain: Math.round(gain), up: S.level > before, weak: burn && burnQ < 0.9 };
}
function netWorth(trueQ = true) { return S.stones + S.lots.reduce((a, l) => a + lotValue(l, Math.min(S.day, DAYS()), trueQ), 0) - S.debt; }

/* ================= 甩手掌櫃：店自己會動 ================= */
const ST = () => SH.staff || {}, UP = () => SH.upgrades || {}, GE = () => SH.gear || {};
function shopStats(noRelic) {
  const st = { traffic: 4, sales: 0, ticket: 10, margin: 0, offers: 2, appraise: 0, audit: 0, greed: 0, gossip: 0, relic: 0.06, security: 0, night: 0, rest: 4, cap: M.nightCap, slots: 2, heat: 0 };
  const add = fx => { for (const [k, v] of Object.entries(fx || {})) if (typeof v === 'number') st[k] = (st[k] || 0) + v; };
  for (const id of Object.keys(S.shop.upg)) add((UP()[id] || {}).fx);
  for (const id of S.shop.staff) add((ST()[id] || {}).traits);
  if (!noRelic) for (const [, e] of relicEff()) add(e.passive);
  if (S.flags.ayue_loyal && S.shop.staff.includes('ayue')) st.sales += 1;
  if (S.flags.akai_reformed) st.greed = Math.max(0, st.greed - 1);
  if (S.flags.naiya_buried) st.greed = Math.max(0, st.greed - 1);
  if (st.audit) st.greed = Math.max(0, st.greed - st.audit);
  return st;
}
function gearStats() {
  const g = { limit: 0, steps: 0, loot: 0, ascent: 1, protect: {}, protectAll: 1, relic: { limit: 0, steps: 0, ascent: 1, by: {} } };
  const srcs = Object.keys(S.shop.gear || {}).map(id => (GE()[id] || {}).fx || {});
  for (const [id, e] of relicEff()) if (e.carry) { const c = e.carry; srcs.push(c); g.relic.limit += c.limit || 0; g.relic.steps += c.steps || 0; if (c.ascent) g.relic.ascent *= c.ascent; for (const k of Object.keys(c.protect || {})) g.relic.by[k] = g.relic.by[k] || id; if (c.steps) g.relic.stepBy = id; if (c.protectAll) { g.protectAll *= c.protectAll; g.relic.allBy = g.relic.allBy || id; } if (c.ascent) g.relic.ascBy = g.relic.ascBy || id; }
  for (const id of S.shop.staff) if ((ST()[id] || {}).gear) srcs.push(ST()[id].gear);
  for (const fx of srcs) { g.limit += fx.limit || 0; g.steps += fx.steps || 0; g.loot += fx.loot || 0; if (fx.ascent) g.ascent *= fx.ascent; for (const [k, v] of Object.entries(fx.protect || {})) g.protect[k] = (g.protect[k] || 1) * v; }
  return g;
}
const tierOf = () => { const n = Object.keys(S.shop.upg).length; return (SH.tiers || []).filter(t => n >= t.at).pop() || { name: '店' }; };
const staffSlots = () => shopStats().slots;
function hireStaff(id) {
  const s = ST()[id]; if (!s || S.shop.staff.includes(id)) return false;
  if (S.shop.staff.length >= staffSlots()) { toast('店裡站不下了。先加釘貨架或打通隔壁。'); return false; }
  if (S.stones < s.hire) { toast('靈石不夠'); return false; }
  S.stones -= s.hire; S.shop.staff.push(id); S.shop.hiredDay[id] = S.dayCount; S.flags['hired_' + id] = true; S.shop.everHired = (S.shop.everHired || 0) + 1;
  S.log.push({ day: S.day, t: `請了${s.name}（${s.role}）` }); toast(`${s.name}：${s.hello || '「好。」'}`); return true;
}
function fireStaff(id, silent) { S.shop.staff = S.shop.staff.filter(x => x !== id); if (!silent) toast(`${(ST()[id] || {}).name}走了。`); }
function buyUpg(id) {
  const u = UP()[id]; if (!u || S.shop.upg[id] || S.stones < u.cost || !needOk(u.need)) return false;
  S.stones -= u.cost; S.shop.upg[id] = true; S.log.push({ day: S.day, t: '店面：' + u.name }); toast(`${u.name}。${tierOf().name}。`); return true;
}
function buyGear(id) {
  const g = GE()[id]; S.shop.gear = S.shop.gear || {};
  if (!g || S.shop.gear[id] || S.stones < g.cost || !needOk(g.need)) return false;
  S.stones -= g.cost; S.shop.gear[id] = true; S.log.push({ day: S.day, t: '裝備：' + g.name }); toast('買了' + g.name); return true;
}
const RELIC_DEEP = ['wenbi', 'budeng', 'cunpai', 'wanchu', 'tangzhi', 'guangbo', 'hongzhu', 'lengyu', 'fushi', 'huishi', 'biao'];
function pickRelic(kind, key) {
  const pool = kind === 'deep' ? RELIC_DEEP.filter(k => IT[k]) : Object.keys(IT).filter(k => IT[k].cat === 'relic' && IT[k].base > 0 && IT[k].base <= 26 && (IT[k].sell || []).includes('walk'));
  return pool[Math.floor(rnd('relic:' + key) * pool.length)];
}
// 一天的帳：dry 只估算，不動狀態
function shopDay(tag, dry, noRelic) {
  const st = shopStats(noRelic), P = S.shop.pol, R = k => dry ? 0.5 : rnd('shop:' + MON() + ':' + S.day + ':' + tag + ':' + k);
  const PM = { low: { t: 1.35, m: 0.2 }, normal: { t: 1, m: 0.32 }, high: { t: 0.72, m: 0.5 } }[P.price] || { t: 1, m: 0.32 };
  const cats = ['herb', 'ore', 'old', 'daily'].filter(k => P.cats[k]).length;
  const repB = Math.max(-2, Math.min(6, (S.rep.loose || 0) * 0.6));
  const mk = S.day === MD().marketDay ? 3 : 0;
  let traffic = (st.traffic + repB + mk + cats * 0.7 + (P.sign === '張揚' ? 1.5 : 0) + st.sales * 0.8) * PM.t * (MON() === 3 ? 1.3 : 1) * (0.85 + R('t') * 0.3);
  traffic = Math.max(1, Math.round(traffic));
  const ticket = st.ticket * (1 + st.sales * 0.04) * (0.9 + R('k') * 0.2) * (MON() === 2 ? 1.1 : MON() === 3 ? 1.25 : 1);
  const gross = Math.round(traffic * ticket);
  const net = Math.round(gross * (PM.m + st.margin + st.sales * 0.01));
  // 收購
  const offers = Math.max(0, Math.round(st.offers + cats * 0.7 + (P.cats.shady ? 1.5 : 0)));
  const acc = Math.round(offers * ({ strict: 0.45, normal: 0.7, generous: 0.95 }[P.buy] || 0.7));
  const fakeP = Math.max(0.01, ({ strict: 0.04, normal: 0.12, generous: 0.22 }[P.buy] || 0.12) - st.appraise * 0.035 - (S.level - 4) * 0.01);
  const unitP = (({ strict: 4, normal: 5, generous: 5.5 }[P.buy]) || 5) * (1 + st.ticket / 40);
  let buyProfit = 0, fakes = 0, fakeLoss = 0, caught = 0;
  for (let i = 0; i < acc; i++) {
    if (dry) { buyProfit += unitP * (1 - fakeP) ; fakeLoss += fakeP * 9; continue; }
    if (R('f' + i) < fakeP) { fakes++; fakeLoss += Math.round(5 + R('fl' + i) * 10); }
    else { buyProfit += Math.round(unitP * (0.7 + R('b' + i) * 0.6)); if (st.appraise && R('c' + i) < 0.15 * st.appraise) caught++; }
  }
  let shady = 0; if (P.cats.shady) shady = Math.round((14 + st.offers * 2) * (0.7 + R('s') * 0.6));
  const night = st.night ? Math.round(st.night * (12 + (!noRelic && S.lots.some(l => l.item === 'budeng') ? 10 : 0)) * (0.8 + R('n') * 0.4)) : 0;
  // 守夜：有人顧著，抽屜少拿一點、假貨也比較會被退回去
  const guard = Math.max(0, st.security || 0);
  if (guard) fakeLoss *= Math.max(0.4, 1 - 0.15 * guard);
  const skim = st.greed ? Math.round((net + buyProfit) * 0.07 * st.greed * Math.max(0, 1 - 0.25 * guard)) : 0;
  const wages = S.shop.staff.reduce((a, id) => a + ((ST()[id] || {}).wage || 0), 0);
  const total = Math.round(net + buyProfit - fakeLoss + shady + night - skim - wages);
  return { traffic, gross, net, offers, acc, buyProfit: Math.round(buyProfit), fakes, fakeLoss: Math.round(fakeLoss), caught, shady, night, skim, wages, total };
}
function shopFlavor(r, tag) {
  const F = SH.flavor || {}, who = PL.walkins.who, R = k => rnd('fl:' + MON() + ':' + S.day + ':' + tag + ':' + k);
  const goods = Object.keys(IT).filter(k => IT[k].base && IT[k].base < 80 && IT[k].cat !== 'story' && !['zhuji', 'xuechan', 'hudeng'].includes(k));
  const pick = (arr, k) => arr[Math.floor(R(k) * arr.length)];
  S.usedFl = S.usedFl || {};
  const pickT = (arr, k) => { const fresh = (arr || []).filter(t => !S.usedFl[t]); if (!fresh.length) return null; const t = pick(fresh, k); if (tag === 'd') S.usedFl[t] = 1; return t; };
  const fill = (t, k) => !t ? null : t.replace('{who}', pick(who, k + 'w')).replace('{item}', IT[pick(goods, k + 'i')].name).replace('{staff}', S.shop.staff.length ? ST()[pick(S.shop.staff, k + 's')].name : '你');
  const out = [fill(pickT(F.sale, 'a'), 'a')];
  if (r.acc) out.push(fill(pickT(F.buy, 'b'), 'b'));
  if (r.fakes) out.push(fill(pickT(F.fake, 'c'), 'c'));
  else if (r.caught) out.push(fill(pickT(F.caught, 'd'), 'd'));
  if (R('q') < 0.35) out.push(pickT(F.quiet, 'e'));
  return out.filter(Boolean);
}
function runShopDay() {
  const r = shopDay('d');
  r.lines = shopFlavor(r, 'd');
  S.stones += r.total; S.shop.total += r.total; S.lastNet = r.total; if (r.total > (S.shop.best || 0)) S.shop.best = r.total;
  S.shop.daysRun = (S.shop.daysRun || 0) + 1;
  const st = shopStats();
  if (S.shop.pol.cats.old && rnd('relicday:' + MON() + ':' + S.day) < st.relic) { const it = pickRelic(st.relic > 0.15 && rnd('rdeep' + S.day) < 0.3 ? 'deep' : 'shallow', MON() + ':' + S.day); if (it) { addLot({ item: it, qty: 1, cost: 0, known: true }); r.relic = it; } }
  if (st.gossip && rnd('gos:' + MON() + ':' + S.day) < 0.4 + 0.2 * st.gossip) {
    const pool = ((MON() > 1 ? D.news['gossip' + MON()] : D.news.gossip) || {})[S.day] || [];
    S.gossipSeen = S.gossipSeen || {}; const line = pool.find(g => !S.gossipSeen[g]);
    if (line) { S.gossipSeen[line] = true; noteGeneric('店裡的客人說：' + line, 'street'); r.gossip = line; }
  }
  if (st.heat && rnd('heat:' + MON() + ':' + S.day) < 0.15 * st.heat) S.heat += 1;
  S.reports.unshift({ m: MON(), day: S.day, ...r }); S.reports = S.reports.slice(0, 8);
  return r;
}
function gapYield() {
  let sum = 0, relics = [];
  for (let i = 0; i < 8; i++) { const r = shopDay('gap' + i); sum += r.total; }
  if (S.shop.pol.cats.old) { const it = pickRelic('shallow', 'gap' + MON()); if (it) { addLot({ item: it, qty: 1, cost: 0, known: true }); relics.push(IT[it].name); } }
  sum = Math.round(sum); S.stones += sum; S.shop.total += sum;
  const F = SH.flavor || {}; const t = (F.gap || [''])[MON() % Math.max(1, (F.gap || []).length)];
  return { title: '這段日子的帳', text: `${t}二十來天，店裡淨賺 ${fmt(sum)} 靈石。${relics.length ? '夥計還收到一件「' + relics.join('、') + '」，放在你的庫房。' : ''}`, notes: [(sum >= 0 ? '＋' : '－') + fmt(Math.abs(sum)) + ' 靈石'], face: 'smile' };
}
function shopEventRoll() {
  S.shop.evDay = S.shop.evDay || {};
  const pool = (SH.events || []).filter(e => !(S.seenDrift[e.id] && !e.repeat) && needOk(e.need || {}) && rnd('sev:' + e.id + ':' + MON() + ':' + S.day) < (e.chance ?? 0.3));
  const e = pool.sort((a, b) => (b.prio || 0) - (a.prio || 0))[0]; if (!e) return;
  S.seenDrift[e.id] = true;
  const ch = (e.choices || []).filter(c => needOk(c.need || {}));
  const notes = ch.length ? [] : applyFx(e.fx);
  S.pendingCards.push({ title: '店裡：' + e.title, text: e.text, notes, face: e.face, drift: e.id, choices: ch.length ? ch.map(c => ({ label: c.label, desc: c.desc || '' })) : null });
}
function autoDues() {
  const high = S.shop.pol.sign === '張揚' || S.wind >= M.windHigh || S.stones >= M.richHigh;
  let due = high ? MD().duesHigh : MD().dues; const debtDue = S.debt > 0 ? rp(S.debt * 1.3) : 0; due += debtDue;
  S.dues = { paid: true, amount: due, high };
  if (S.stones >= due) { S.stones -= due; if (debtDue) S.debt = 0; return `管理處的何小姐來收規費，${high ? '說你這陣子太顯眼，多收了一點，' : ''}帳房照付了 ${fmt(due)} 靈石。`; }
  const owe = due - S.stones; S.stones = 0; S.debt = rp(owe); S.flags.debt = true; addMem('qian', `替你墊了 ${fmt(owe)} 靈石的規費。`);
  return `規費 ${fmt(due)}，抽屜裡不夠。錢不語從對門踱過來，替你墊了 ${fmt(owe)}：「三分利，不急，不急。」`;
}
function goNight() {
  if (S.phase === 'night' && S.night) return;
  const autoDeals = autoBiz(); if (S.dead) return;
  S.phase = 'night'; S.place = null; S.enc = null;
  const rep = runShopDay();
  let dues = null; if (S.day === DAYS() && !S.dues && !MD().noDues) dues = autoDues();
  const st = shopStats(), P = S.shop.pol;
  const reserve = 30 + (MON() === 2 && !S.dues ? 70 : 0);
  const room = Math.max(0, Math.floor(S.stones - reserve)), cap = st.cap;
  const invest = P.cult === 'none' ? 0 : P.cult === 'half' ? Math.min(cap, Math.floor(room / 2)) : Math.min(cap, room);
  const burn = P.cult === 'full' && held('dingshen') > 0;
  const lvBefore = S.level;
  meditate(invest, burn, false);
  const b0 = S.burden;
  const relicLines = [];
  for (const [id, e] of relicEff()) if (e.night && needOk(e.night.need || {}) && !(e.night.fx.burden < 0 && S.burden <= 0) && mixHash(S.seed + ':rn:' + id + ':' + MON() + ':' + S.day) < e.night.chance) { const nt = applyFx(e.night.fx); relicLines.push({ id, text: e.night.text, notes: nt, curse: badFx(e.night.fx) }); S.relicLog = (S.relicLog || []).concat([{ id, k: 'night' }]); }
  S.burden = Math.max(0, S.burden - st.rest);
  const restBy = relicEff().filter(([, e]) => e.passive && e.passive.rest).map(([id, e]) => ({ id, v: e.passive.rest }));
  const relicOn = relicEff().filter(([, e]) => e.passive || e.carry || e.warn || e.night || e.use).map(([id]) => id);
  const relicGain = relicEff().some(([, e]) => e.passive) ? shopDay('est', true).total - shopDay('est', true, true).total : 0;
  const lg = (S.relicLog || []).slice(S.relicLogDay && S.relicLogDay.k === dayKey() ? S.relicLogDay.n : 0);
  const carryLines = (S.carry || []).map(id => ({ id, spoke: lg.some(x => x.id === id) || relicLines.some(x => x.id === id) }));
  S.night = { ...S.night, rep, dues, invest, lvBefore, burden: [b0, S.burden], relicLines, restBy, pawnLine: pawnMult() !== 1 ? `長生當鋪今天的價錢${pawnMult() > 1 ? '硬' : '軟'}了一成，贖回一個月要 ${redeemCost()} 靈石。明天就會回到原來的樣子。` : null, relicOn: relicOn.filter(id => !(S.carry || []).includes(id)), relicGain, carryLines, autoDeals };
  threadMemSave();
  shopEventRoll();
  checkAchieve();
}

const KEEP = ['hudeng', 'jiansui', 'xuechan', 'zhuji'];
function shopSellable(l) { const it = IT[l.item]; return it && it.base > 0 && it.cat !== 'story' && !KEEP.includes(l.item) && !l.flags.some(f => ['evidence', 'entrusted', 'sect', 'sting'].includes(f)); }
function shopSellLot(id) {
  const l = lotById(id); if (!l || !shopSellable(l)) return;
  const st = shopStats(); const unit = rp(price(l.item) * Math.min(1, 0.85 + st.sales * 0.03) * (l.known ? l.q : 1));
  const tot = unit * l.qty; S.stones += tot; S.shop.total += tot; S.lots = S.lots.filter(x => x !== l);
  S.log.push({ day: S.day, t: `${l.label}交給店裡賣掉，＋${fmt(tot)}` }); toast(`店裡賣掉了，＋${fmt(tot)} 靈石`);
}
/* ----- 負擔與死亡 ----- */
const burdenLimit = () => 5 + 2 * (S.level - 4) + gearStats().limit;
function burdenWord(b = S.burden) { const L = burdenLimit(); return b <= 0 ? '身體很輕' : b <= L * 0.5 ? '還撐得住' : b <= L ? '耳鳴、手會抖' : b <= L + 3 ? '流鼻血、看東西有重影' : '身體在拒絕你'; }
function ascentRisk(b = S.burden, pid = S.place && S.place.id, raw) { const over = b - burdenLimit(); if (over <= 0) return 0; const g = gearStats(); const a = (PFX[pid] || {}).ascent; return Math.min(0.9, 0.22 * over * (raw ? 1 : g.ascent * (a ? (g.protect[a] ?? 1) * g.protectAll : 1))); }
function die(id) {
  if (S.dead) return;
  S.dead = { id, m: MON(), day: S.day, slot: S.slot, again: !!(S.remember || {})[id] }; S.phase = 'dead'; S.enc = null;
  try { threadMemSave(); } catch (e) {}
  const book = store.get(DEATH_KEY) || {}; const rec = book[id] || { n: 0, first: Date.now() }; rec.n++; book[id] = rec; store.set(DEATH_KEY, book);
  S.deathNew = rec.n === 1;
  checkAchieve();
}
function protectMult(id) { const g = gearStats(); return (g.protect[id] ?? 1) * g.protectAll; }
const protectBy = id => { const r = gearStats().relic; return r.by[id] || r.allBy || null; };
/* ----- 存檔點：每天早上自動存，死了可以回去 ----- */
const dayKey = () => MON() + '-' + S.day;
function ckptSave() {
  if (!S || S.dead) return;
  const c = store.get(CKPT_KEY) || {};
  const snap = { key: dayKey(), label: monthLabel(MON()) + (M.dayNames[S.day - 1] || ''), s: JSON.stringify(S) };
  if (c.today && c.today.key !== snap.key && c.today.seed === S.seed) c.prev = c.today;
  if (c.today && c.today.seed !== S.seed) c.prev = null;
  snap.seed = S.seed; c.today = snap; store.set(CKPT_KEY, c);
}
function ckptInfo() { const c = store.get(CKPT_KEY) || {}; const ok = x => x && x.seed === (S && S.seed); return { today: ok(c.today) ? c.today : null, prev: ok(c.prev) ? c.prev : null }; }
function ckptRestore(which) {
  const c = store.get(CKPT_KEY) || {}; const x = c[which]; if (!x) return false;
  const deadId = S && S.dead && S.dead.id, rem = (S && S.remember) || {};
  S = migrate(JSON.parse(x.s)); S.dead = null;
  S.remember = { ...(S.remember || {}), ...rem, ...(deadId ? { [deadId]: 1 } : {}) };
  if (which === 'prev') { c.today = c.prev; c.prev = null; store.set(CKPT_KEY, c); }
  UI.view = 'game'; UI.tab = 'main'; UI.sheet = null; S.restored = (S.restored || 0) + 1;
  const dd = DEATHS[deadId]; if (dd && S.phase === 'morning') S.cards.unshift({ title: '似曾相識', text: `你醒過來，心跳得很快。好像做了一個很長的夢，夢裡的你「${dd.title}」。${dd.hint ? '你記得一件事：' + dd.hint : ''}`, face: 'sweat' });
  return true;
}
/* ----- 成就（跨局） ----- */
const ACH_KEY = 'fangshi-ach-v1';
const achBook = () => store.get(ACH_KEY) || {};
function relicKinds() { return Object.keys(S.codex).filter(k => IT[k] && IT[k].cat === 'relic').length; }
function achMet(a) {
  const c = a.cond || {}, deaths = store.get(DEATH_KEY) || {};
  if (c.deaths != null) return Object.keys(deaths).length >= c.deaths;
  if (c.death) return !!deaths[c.death];
  if (c.deathCat) return Object.keys(deaths).some(k => DEATHS[k] && DEATHS[k].cat === c.deathCat);
  if (!S) return false;
  if (c.flag) return !!S.flags[c.flag];
  if (c.ending) return !!S.flags['finale_' + c.ending] && S.phase === 'end';
  if (c.relics != null) return relicKinds() >= c.relics;
  if (c.net != null) return (S.shop.best || 0) >= c.net;
  if (c.upgrades != null) return Object.keys(S.shop.upg).length >= c.upgrades;
  if (c.staff != null) return (S.shop.everHired || 0) >= c.staff;
  return false;
}
function checkAchieve() {
  const book = achBook(); let got = [];
  for (const a of (SH.achievements || [])) if (!book[a.id] && achMet(a)) { book[a.id] = Date.now(); got.push(a); }
  if (got.length) { store.set(ACH_KEY, book); UI.achToast = got.map(a => a.title); if (S) S.achNew = (S.achNew || []).concat(got.map(a => a.id)); }
  return got;
}
function unlockedBonuses() { const book = achBook(); return [...new Set((SH.achievements || []).filter(a => book[a.id]).map(a => a.bonus))].filter(b => (SH.bonuses || {})[b]); }
const bonusPicks = () => Math.min(4, 1 + Math.floor(Object.keys(achBook()).length / 4));
function applyBonuses(ids) {
  for (const id of ids || []) {
    const b = (SH.bonuses || {})[id]; if (!b) continue;
    if (b.stones) S.stones += b.stones;
    if (b.lifespan) S.lifespan += b.lifespan;
    if (b.give) addLot({ item: b.give, qty: 1, cost: 0, known: true });
    if (b.flag) S.flags[b.flag] = true;
    if (b.gear) { S.shop.gear = S.shop.gear || {}; S.shop.gear[b.gear] = true; }
    if (b.upg) S.shop.upg[b.upg] = true;
    if (b.staff && !S.shop.staff.includes(b.staff)) { S.shop.staff.push(b.staff); S.shop.hiredDay[b.staff] = 0; S.flags['hired_' + b.staff] = true; S.shop.everHired = (S.shop.everHired || 0) + 1; }
  }
  S.bonuses = ids || [];
}
/* ----- 謎題簿 ----- */
const stepDone = st => st.flag ? !!S.flags[st.flag] : st.anyFlag ? st.anyFlag.some(f => S.flags[f]) : false;
/* 跨局的謎題記憶：上一次走到哪裡，櫃檯會記得 */
function threadMemSave() { const m = store.get(THR_KEY) || {}; for (const t of THREADS) { const ds = t.steps.map((st, i) => stepDone(st) ? i : -1).filter(i => i >= 0); if (ds.length) m[t.id] = [...new Set([...(m[t.id] || []), ...ds])]; } store.set(THR_KEY, m); }
const threadMem = () => (S && S.thrMem) || {};
function threadState(t) { const done = t.steps.filter(stepDone).length; let i = 0; while (i < t.steps.length && stepDone(t.steps[i])) i++; return { done, next: t.steps[i] || null, started: done > 0 || (t.id === 'lamp' && S.flags.lamp_hint) }; }

/* ----- 找上門的事：故事插曲，一次看完，只做一個決定 ----- */
const INTER_WHERE = { shop: '店裡', market: '舊公路市場', herb: '藥田', tea: '聽雨茶館' };
/* 生意一天最多找上門一件；其他快過期的，晚上由店裡的人照店規處理 */
const isStoryDeal = d => !!d.neutral || /^m\d/.test(d.id);
function interruptsAvail() {
  const all = interruptsAll(), story = all.filter(isStoryDeal);
  if (S.bizDay === dayKey()) return story;
  const lastDay = d => !d.repeatable && d.days && d.days[1] === S.day;
  const biz = all.filter(d => !isStoryDeal(d)).sort((a, b) => (lastDay(b) - lastDay(a)) || ((b.prio || 0) - (a.prio || 0)));
  return [...story, ...biz.slice(0, 1)].sort((a, b) => (b.prio || 0) - (a.prio || 0));
}
function autoBiz() {
  if (S.dead) return [];
  const out = [], ph = S.phase, pl = S.place;
  const expiring = d => d.repeatable || (d.days && d.days[1] === S.day);
  for (const d of interruptsAll().filter(d => !isStoryDeal(d) && expiring(d)).slice(0, 4)) {
    try {
      S.phase = 'day'; S.place = null;
      startDeal(d.id, 'visit'); S.seenDeal[d.id] = true; S.seenDeal[d.id + ':' + MON() + ':' + S.day] = true; autoTalk(S.enc);
      const os = encOptions().filter(o => !o.disabled && !(((d.opts || {})[o.key] || {}).fx || {}).death);
      const v = shopStats().appraise >= 1 ? os.find(o => (d.verdict || []).includes(o.key)) : null;
      const o = v || os.find(o => o.key === 'decline');
      if (!o) { S.enc = null; continue; }
      decide(o.key); S.enc = null; if (S.dead) break;
      out.push(`${NP[d.npc] ? NP[d.npc].name : '有人'}來過。店裡的人${v ? '照店規替你決定了：' + o.label : '替你婉拒了'}。`);
    } catch (e) { S.enc = null; }
  }
  S.phase = ph; S.place = pl; return out;
}
function interruptsAll() {
  return D.deals.filter(d => INTER_WHERE[d.where] && d.where !== 'dues' && d.id !== 'd18' && dealAvail(d) && !(d.repeatable && !Object.entries(d.opts).some(([k, o]) => k !== 'decline' && needOk(o.need))) && !(d.repeatable && S.seenDeal[d.id + ':' + MON() + ':' + S.day]))
    .sort((a, b) => (b.prio || 0) - (a.prio || 0));
}
function openInterrupt(id) {
  const d = DEALS[id]; if (!d) return;
  const first = !S.seenDeal[id];
  if (!first && S.shop.pol.sign === '張揚') S.wind--; // 重開不重算
  startDeal(id, 'visit'); if (!isStoryDeal(d)) S.bizDay = dayKey();
  S.seenDeal[id] = true; S.seenDeal[id + ':' + MON() + ':' + S.day] = true;
  autoTalk(S.enc);
}
function autoTalk(e) {
  const d = DEALS[e.deal]; e.auto = true;
  if (d.ask) actAsk();
  if (d.press) while (e.press < d.press.length) actPress();
  if (d.silence) actSilence();
  const st = shopStats();
  if (st.sales >= 3 && d.haggle && (d.side === 'sell' || d.side === 'buy')) { const before = e.price; actHaggle(); if (e.price !== before) e.th.push({ k: 'note', t: `夥計替你把價錢談到 ${fmt(e.price)}。` }); }
  if (d.appraise && st.appraise > 0) {
    e.appraised = true;
    const who = S.shop.staff.map(x => ST()[x]).find(x => x && (x.traits || {}).appraise);
    e.th.push({ k: 'note', t: `（${who ? who.name : '鑑定燈下'}替你看了一眼。）` });
    for (const a of d.appraise) if (S.level + st.appraise >= a.realm) e.th.push({ k: 'sys', t: a.text });
    learnTrigger(e.deal + ':appraise');
  }
  const asks = Math.min(2, (st.gossip > 0 ? 1 : 0) + (S.shop.staff.includes('caijie') ? 1 : 0));
  if (asks && d.verify) for (const v of verifyList().slice(0, asks)) {
    e.verified.push(v.who); S.met[v.who] = true;
    e.th.push({ k: 'note', t: `（夥計先跑去問了${NP[v.who].name}。）` });
    e.th.push({ k: 'npc', who: v.who, t: sub(v.a, v.who), f: v.f || baseFace(v.who) });
    if (!learnTrigger(`${e.deal}:verify:${v.who}`)) noteGeneric(`${NP[v.who].name}談「${d.title}」：${sub(v.a, v.who)}`, 'verify');
  }
}

/* ================= rendering ================= */
const $app = $('#app'), $bar = $('#bar'), $hud = $('#hud'), $sheet = $('#sheet');
/* ----- 線條圖示（內嵌 SVG，跟著文字顏色） ----- */
const ICONS = {
  death_explore: '<path d="M3 6.5h5.5L10 9"/><circle cx="9.6" cy="10.9" r=".95" fill="currentColor" stroke="none"/><circle cx="11.1" cy="14.4" r=".95" fill="currentColor" stroke="none"/><circle cx="15.0" cy="15.1" r=".95" fill="currentColor" stroke="none"/><path d="M3 20h12.2l1.6 2.6M21 20h-1.4l-1.6 2.6"/><circle cx="16.6" cy="18.6" r="1.1" fill="var(--cinnabar)" stroke="none"/>',
  death_ascent: '<path d="M5 3v18M12 3v18M5 13h7M5 18h7"/><path d="M5 8h2.8l.6 1M9.2 7.1l.5.9H12" stroke="var(--cinnabar)"/><path d="M12 9.5l4.2 4.5"/><path d="M14.5 14h4l1.6 5.3a1 1 0 0 1-1 1.2h-5.2a1 1 0 0 1-1-1.2z"/>',
  death_relic: '<path d="M2.5 11l3.6-5.5h11.8l3.6 5.5-9.5 8.5z"/><path d="M2.5 11h19M9 5.5 7.6 11l4.4 8.5M15 5.5l1.4 5.5-4.4 8.5" stroke-width="1.1"/><path d="M12 5.5l-1.4 3 2 2-1.6 3.5" stroke="var(--cinnabar)"/>',
  death_shop: '<path d="M3 4.5h18M4.5 4.5V21M19.5 4.5V21"/><path d="M4.5 8h15M4.5 10.5h15M4.5 13.2h15"/><path d="M7 20h10" stroke="var(--cinnabar)"/><path d="M12.5 20c1.4 1.3 3 1.8 5 1.9" stroke-width="1.1" opacity=".6"/>',
  main: '<path d="M3.5 9.5 5 4h14l1.5 5.5M4.5 9.5V20h15V9.5M3.5 9.5h17M9.5 20v-5.5h5V20"/>',
  shop: '<path d="M6 3.5h11.5a1.5 1.5 0 0 1 1.5 1.5v15.5H7.5A1.5 1.5 0 0 1 6 19zM6 18a1.5 1.5 0 0 1 1.5-1.5H19M9.5 7.5h6M9.5 11h6"/>',
  threads: '<path d="M12 2.5v2.5M8.5 5h7M8 7.5h8a1 1 0 0 1 1 1v7.5a5 5 0 0 1-10 0V8.5a1 1 0 0 1 1-1zM10 21.5h4M12 19.5v2"/><path d="M12 10.5c1.2 1.3 1.6 2.3 1.6 3.2a1.6 1.6 0 0 1-3.2 0c0-.9.4-1.9 1.6-3.2z"/>',
  store: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4zM3.5 7.5l8.5 4 8.5-4M12 11.5v9"/>',
  intel: '<path d="M4 5h12.5v14.5H6A2 2 0 0 1 4 17.5zM16.5 9H20v8.5a2 2 0 0 1-2 2M7 9h6.5M7 12.5h6.5M7 16h4"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.3A6 6 0 0 1 21 20"/>',
  stone: '<path d="M7 4h10l3.5 5L12 20.5 3.5 9zM3.5 9h17M9.5 4 8 9l4 11.5M14.5 4 16 9l-4 11.5"/>',
  breath: '<path d="M12 3c3.2 4.2 5.2 6.6 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.1 1-3.4 2.1-4.4 0 2 1 3.3 2.1 3.3 0-3.1-1.1-5.1 1-9.1z"/>',
  pack: '<path d="M7 9a5 5 0 0 1 10 0v11.5H7zM9.5 4.2h5M7 13.5h10M10 13.5v2.5"/>',
  life: '<path d="M7 3.5h10M7 20.5h10M8 3.5c0 5 8 6.5 8 8.5s-8 3.5-8 8.5M16 3.5c0 5-8 6.5-8 8.5s8 3.5 8 8.5"/>',
  down: '<path d="M12 4v15M6.5 13.5 12 19l5.5-5.5"/>',
  town: '<path d="M3 20.5h18M5 20.5v-8l4-3 4 3v8M13 20.5v-11l3.5-2.5 3.5 2.5v11M8 14.5h2M16 12.5h1.5"/>',
  seal: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M9 9h6M9 12h6M12 9v7"/>',
  lamp: '<path d="M12 2.5v3M9 5.5h6l1 3H8zM8.5 8.5h7l-1 8h-5zM10 16.5h4v2.5h-4zM12 19v2.5"/>'
};
const ic = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;
const LAYER = { ruin: 1, tunnel: 2, reservoir: 2, cliff: 3, north: 4, stair: 5, lampst: 6, platform: 7 };
const LAYER_NAME = ['聚落', '第一層', '第二層', '第三層', '第四層', '第五層', '第六層', '第七層'];
function depthGauge(n) {
  return `<div class="depth" aria-label="深度：${LAYER_NAME[n]}"><span class="depth-l">${ic('town')}</span><div class="depth-t">${LAYER_NAME.slice(1).map((_, i) => `<i class="${i + 1 < n ? 'past' : i + 1 === n ? 'now' : ''}"></i>`).join('')}</div><b>${LAYER_NAME[n]}</b></div>`;
}
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(root) {
  const els = root.querySelectorAll('[data-count]'); if (!els.length || reduceMotion()) return;
  els.forEach(el => {
    const to = +el.dataset.count, signed = el.dataset.sign === '1', t0 = performance.now(), D = 420;
    const show = v => { const r = Math.round(v); el.textContent = (signed ? (r >= 0 ? '＋' : '－') : '') + fmt(Math.abs(r)); };
    const step = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); show(to * e); if (k < 1) requestAnimationFrame(step); };
    show(0); requestAnimationFrame(step);
  });
}
function sceneOf() {
  if (UI.view === 'title' || !S) return { scene: 'title', depth: 0, key: 'title' };
  if (S.dead || S.phase === 'dead') return { scene: 'dead', depth: 0, key: 'dead' };
  const pl = S.phase === 'place' && S.place && UI.tab === 'main' ? S.place.id : null;
  const depth = pl && LAYER[pl] || 0;
  const scene = UI.tab !== 'main' ? 'tab' : depth ? 'explore' : S.phase;
  return { scene, depth, key: [UI.tab, S.phase, pl, S.enc && S.enc.deal, MON(), S.day, S.phase === 'day' ? S.slot : ''].join('|') };
}
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
  if (!S || UI.view === 'title' || S.phase === 'dead') { $hud.hidden = true; return; }
  $hud.hidden = false;
  const dn = `<small class="mon">${monthLabel(MON())}</small>` + (M.dayNames[Math.min(S.day, DAYS()) - 1] || '');
  const mk = MD().marketDay;
  const tag = S.day === mk ? '市集日' : S.day === DAYS() ? (MD().lastDayTag || '') : '';
  const slots = ['上', '下', '傍', '夜'].map((s, i) => {
    const cur = S.phase === 'end' ? 4 : S.phase === 'morning' ? -1 : (S.phase === 'night' || S.slot >= 3) ? 3 : S.slot;
    return `<span class="${i < cur ? 'past' : i === cur ? 'now' : ''}">${s}</span>`;
  }).join('');
  const need = M.xpNeed[S.level] || 999, L = burdenLimit(), b = S.burden;
  const bcls = b > L ? 'cin' : b > L * 0.5 ? 'gold' : 'jade';
  $hud.innerHTML = `<div class="hud-top"><div class="hud-day"><span class="lampdot" aria-hidden="true"></span>${dn}${tag ? `<span class="tagline">${tag}</span>` : ''}</div><div class="track" aria-label="時段">${slots}</div></div>
  <div class="hud-stats"><span class="stat stone" title="靈石">${ic('stone')}<b>${fmt(S.stones)}</b></span><span class="stat lv" title="修行 ${S.xp}/${need}">${ic('breath')}${lvName(S.level)}<span class="xpbar"><i style="width:${Math.min(100, S.xp / need * 100)}%"></i></span></span>
  <span class="stat burden ${bcls}" title="負擔">${ic('pack')}<b>${b}</b><small>/${L}</small></span><span class="stat life" title="壽命">${ic('life')}<b>${S.lifespan}</b><small>月</small></span></div>`;
}
function renderTitle() {
  const saved = S && S.phase !== 'end';
  const dbook = store.get(DEATH_KEY) || {}, nd = Object.keys(dbook).filter(k => DEATHS[k]).length, ND = Object.keys(DEATHS).length;
  const na = Object.keys(achBook()).length, NA = (SH.achievements || []).length;
  return `<div class="skyline" aria-hidden="true"><svg viewBox="0 0 390 150" preserveAspectRatio="xMidYMax slice"><path class="r3" d="M0 150V96l38-22 30 14 44-40 36 26 30-18 52 40 40-30 46 34 34-20 40 24v46z"/><path class="r2" d="M0 150v-34l52-18 40 16 46-30 50 30 36-12 58 26 44-22 64 26v18z"/><path class="r1" d="M0 150v-16l70-10 60 8 70-14 80 14 50-6 60 10v14z"/><g class="town"><path d="M228 118v-10h8v10M240 118v-14h6v14M250 118v-8h10v8"/></g><circle class="glow" cx="243" cy="108" r="9"/><circle class="lit" cx="243" cy="108" r="1.8"/></svg></div>
  <section class="title">
    <div class="stack">
      <div class="ticket"><span class="label">長生當鋪 · 當票</span><p class="q">${esc(D.intro.ticket)}</p><div class="left">尚餘${monthsText(M.lifespan)}</div>
      <svg class="seal" viewBox="0 0 60 60" aria-hidden="true"><rect x="4" y="4" width="52" height="52" rx="4" fill="none" stroke="var(--cinnabar)" stroke-width="3"/><text x="30" y="27" text-anchor="middle" font-family="var(--serif)" font-weight="900" font-size="17" fill="var(--cinnabar)">長生</text><text x="30" y="47" text-anchor="middle" font-family="var(--serif)" font-weight="900" font-size="17" fill="var(--cinnabar)">典押</text></svg></div>
      <p class="lede">${esc(D.intro.lede)}</p>
    </div>
    <h1 class="title-v">坊市掌櫃<small>許家店 · ${saved ? monthLabel(S.month) : monthLabel(1)}</small></h1>
  </section>
  <details class="card howto"${saved ? '' : ' open'}><summary>怎麼玩</summary><div class="stack" style="margin-top:10px"><p class="lede">${esc(D.intro.how)}</p><p class="lede"><b>${esc(D.intro.goal)}</b></p></div></details>
  <div class="title-actions">${saved ? `<button class="btn primary wide" data-act="continue">${S.phase === 'dead' ? '回到死亡畫面' : '繼續：' + monthLabel(S.month) + (M.dayNames[Math.min(S.day, DAYS()) - 1] || '')}</button><button class="btn quiet wide" data-act="setup">重新開張</button>` : `<button class="btn primary wide" data-act="setup">開張</button>`}
  <div class="row2"><button class="btn quiet" data-act="achsheet">成就 ${na}/${NA}</button><button class="btn quiet" data-act="deathsheet">死法圖鑑 ${nd}/${ND}</button></div></div>`;
}
function newsHTML(id, short) {
  const n = NEWS.find(x => x.id === id);
  const goods = (n.goods || []).map(g => IT[g] ? IT[g].name : g).join('、');
  return `<div class="newscard"><div class="src">${esc(n.source)}</div><div class="txt">${esc(n.text)}</div>${!short && (goods || (n.ask || []).length) ? `<div class="meta">${goods ? '牽動：' + esc(goods) : ''}${goods && n.ask.length ? '　·　' : ''}${n.ask && n.ask.length ? '打聽：' + esc(n.ask.join('、')) : ''}</div>` : ''}</div>`;
}
const extraToday = () => (S.extraNews || []).filter(n => n.day === S.day);
const extraHTML = n => `<div class="newscard"><div class="src">${esc(n.src)}</div><div class="txt">${esc(n.text)}</div></div>`;
function renderMorning() {
  const cards = S.cards.map((c, ci) => `<div class="event${c.face ? ' withface' : ''}${c.choices ? ' pending' : ''}">${c.face ? portrait('me', c.face, 'evface') : ''}<h3>${c.icon ? icon(c.icon, 'sm') + ' ' : ''}${esc(c.title)}</h3><p>${esc(c.text)}</p>${c.result ? `<p class="serif" style="margin-top:6px">${esc(c.result)}</p>` : ''}${c.choices ? `<div class="choice" style="margin-top:8px">${c.choices.map((o, vi) => `<button class="opt${UI.confirm === 'dc:' + ci + ':' + vi ? ' confirm' : ''}" data-act="dchoice" data-id="${ci}" data-v="${vi}"><b>${UI.confirm === 'dc:' + ci + ':' + vi ? '再按一次：' : ''}${esc(o.label)}</b>${o.desc ? `<span>${esc(o.desc)}</span>` : ''}</button>`).join('')}</div>` : ''}${c.notes && c.notes.length ? `<div class="fxline">${esc(c.notes.join('　'))}</div>` : ''}</div>`).join('');
  return `<h2 class="sec-h">早上</h2>${cards ? `<div class="stack">${cards}</div>` : ''}
  <div class="card" style="margin-top:12px">${S.todayNews.map(id => newsHTML(id)).join('') + extraToday().map(extraHTML).join('') || '<p class="muted">今天聚落很安靜。</p>'}</div>`;
}
function renderHub() {
  let h = '';
  const st = shopStats(), est = shopDay('est', true);
  h += `<div class="card shopcard" style="margin-top:12px"><div class="row"><b class="serif" style="flex:1">許家店・${esc(tierOf().name)}</b><button class="btn quiet sm" data-act="tab" data-v="shop">店務 ›</button></div>
    <p class="small muted">${S.shop.staff.length ? S.shop.staff.map(x => ST()[x].name).join('、') + '顧店' : '你不在的時候，店門上掛著「老闆出去一下」'}。今天大概能賺 <b class="gold">${fmt(est.total)}</b> 靈石，晚上自己結帳。</p></div>`;
  const ints = interruptsAvail();
  if (ints.length) {
    const isStory = isStoryDeal, lastDay = d => !d.repeatable && d.days && d.days[1] === S.day;
    const sorted = [...ints].sort((a, b) => (lastDay(b) - lastDay(a)) || (isStory(b) - isStory(a)));
    h += `<h2 class="sec-h">找上門的事 <span class="pill cin">${ints.length}</span></h2><p class="small muted" style="margin:-4px 0 8px">不花時間。看完、做一個決定就好；不想管的，放著就會自己過去。</p>` + sorted.map(d => `<button class="go hot" data-act="inter" data-id="${d.id}">${portrait(d.npc, 'neutral', 'tiny')}<div><div class="gt">${esc(NP[d.npc].name)}${d.where !== 'shop' ? `<small class="muted">　${INTER_WHERE[d.where]}</small>` : ''}</div><div class="gd">${esc(d.hook ? d.hook.d : d.title)}</div><div class="tags"><span class="pill ${isStory(d) ? 'jade' : ''}">${isStory(d) ? '故事' : '生意'}</span>${lastDay(d) ? '<span class="pill cin">今天過後就沒了</span>' : ''}</div></div><span class="arrow">›</span></button>`).join('');
  }
  if (S.slot < 3) {
    h += `<h2 class="sec-h">往外走 <small class="muted">${SLOT[S.slot]}・還有 ${3 - S.slot} 個時段</small></h2><p class="small muted" style="margin:-4px 0 8px">負擔 ${S.burden}/${burdenLimit()}：${burdenWord()}。越深越怪、越重；超過上限，回程可能上不來。進去什麼都沒做就出來，不花時間。</p><div class="places">`;
    let cold = '', nCold = 0;
    for (const id of EXPLORE) {
      const p = PL[id]; if (!p || !revealed(p)) continue; const o = placeOpen(id);
      const n = spotsNew(id), seen = exploredCount(id);
      let note = p.depth || '';
      if (o === 'level') note += '　·　' + (p.levelText || '身體還撐不住');
      else if (!o) note += '　·　只有' + p.hours.map(x => SLOT[x]).join('、') + '去得了';
      else note += seen ? `　·　去過 ${seen} 處${n ? `，還有 ${n} 處沒看過` : ''}` : '　·　還沒去過';
      const ll = o === true && !n && seen ? lethalLeft(id).length : 0;
      if (ll) note += '　·　剩下的地方，最好別去';
      const pb = (PFX[id] || {}).burden || 0;
      const dz = Math.min(3, Math.ceil((pb + spotList(id).filter(sp => sp.fx && sp.fx.death).length) / 2));
      note = '危險 ' + '●'.repeat(dz) + '○'.repeat(3 - dz) + '　·　' + note;
      if (o === true && pb && S.burden + pb > burdenLimit()) note += '　·　去了會超過負擔';
      const btn = `<button class="place ex${n && o === true ? ' hot' : ''}${ll ? ' grey' : ''}" style="--l:${LAYER[id] || 0}" data-act="enter" data-id="${id}" ${o === true ? '' : 'disabled'}><b>${esc(p.name)}${n && o === true && seen ? '<em>新</em>' : ''}</b><span>${esc(note)}</span></button>`;
      if (o !== true || (seen && !n && !(S.leftBehind || {})[id])) { cold += btn; nCold++; } else h += btn;
    }
    if (nCold) h += `</div><details class="fold"><summary class="small muted">其他地方（${nCold}）：沒開、太深，或暫時沒有新的</summary><div class="places">${cold}</div></details><div class="places">`;
    h += `</div><h2 class="sec-h">在聚落裡</h2><div class="places">`;
    for (const id of ['school', 'tea', 'office', 'homes', 'pawn']) {
      const p = PL[id]; const o = placeOpen(id);
      if (p.days && !p.days.includes(S.day)) continue;
      let note = '';
      if (o === 'closed') note = '今天沒開';
      else if (!o) note = '這個時段沒開';
      else if (id === 'homes') note = homesKnown().length ? '知道 ' + homesKnown().length + ' 處住址' : '還不知道誰住哪';
      else if (id === 'school') note = '舊物：研究、賣、捐' + (relicLots().length ? `（你有 ${relicLots().length} 樣）` : '');
      else if (id === 'tea') note = '買消息、賣消息';
      else if (id === 'office') note = '告發、交東西';
      else if (id === 'pawn') note = '贖回壽命';
      const tn = o === true ? spotsNew(id) : 0; if (tn) note += `　·　有 ${tn} 處怪事可以看`;
      h += `<button class="place${tn ? ' hot' : ''}" data-act="enter" data-id="${id}" ${o === true ? '' : 'disabled'}><b>${esc(p.name)}${tn ? '<em>新</em>' : ''}</b><span>${esc(note)}</span></button>`;
    }
    h += `</div>`;
  }
  const todayLog = S.log.filter(l => l.day === S.day && (l.m == null || l.m === MON()));
  if (todayLog.length) h += `<details class="fold card small" style="margin-top:14px"><summary class="muted">今天做過的事（${todayLog.length}）</summary>${todayLog.slice(-6).map(l => `<div>${esc(l.t)}</div>`).join('')}</details>`;
  return h;
}
function goodsCard(e) {
  if (e.generic) {
    if (!e.lot) return '';
    const l = lotById(e.lot), it = IT[e.item];
    return `<div class="goods${e.done ? ' done' : ''}"><div class="g-grade">${esc(it.grade)}　·　你的貨：${esc(l ? l.label : it.name)}</div><div class="g-name">${icon(e.item)}<span>${esc(it.name)} × ${e.qty}</span></div>
      <div class="g-price"><b>${fmt(e.price)}</b><span class="muted">靈石／${esc(it.unit)}</span><span class="g-mkt">今日市價 ${fmt(price(e.item))}　·　你的成本 ${l ? fmt(l.cost) : '—'}</span></div>
      <button class="g-link" data-act="lore" data-id="${e.item}">物品文本</button>${e.done ? sealSVG(e.done.label) : ''}</div>`;
  }
  const d = DEALS[e.deal]; const it = IT[d.item];
  const name = d.itemName || (d.lot && d.lot.label) || (it && it.name) || d.item;
  let price_ = '';
  if (d.side === 'sell') price_ = `<b>${fmt(e.price)}</b><span class="muted">靈石／${esc(it ? it.unit : '件')}</span>${e.qty > 1 ? `<span class="g-mkt">共 ${fmt(e.price * e.qty)}</span>` : ''}${it && it.base ? `<span class="g-mkt">今日市價 ${fmt(price(d.item))}</span>` : ''}`;
  else if (d.side === 'buy') price_ = `<b>${fmt(e.price)}</b><span class="muted">他出的價／${esc(it.unit)}</span><span class="g-mkt">今日市價 ${fmt(price(d.item))}　·　你有 ${held(d.item)}</span>`;
  else if (e.deal === 'd18') price_ = `<b>${fmt(e.due)}</b><span class="muted">靈石</span><span class="g-mkt">你有 ${fmt(S.stones)}</span>`;
  else if (d.price) price_ = `<b>${fmt(e.price)}</b><span class="muted">靈石辛苦費</span>`;
  let lots = '';
  if (d.side === 'buy' && !e.done) {
    const ls = S.lots.filter(l => l.item === d.item);
    if (ls.length > 1) lots = `<div class="lotpick" role="group" aria-label="賣哪一批">${ls.map(l => `<button data-act="pick" data-id="${l.id}" class="${l.id === e.lot ? 'on' : ''}">${esc(l.label)} ×${l.qty}${l.known && l.q < 0.9 ? '（成色差）' : ''}</button>`).join('')}</div>`;
  }
  return `<div class="goods${e.done ? ' done' : ''}">${it ? `<div class="g-grade">${esc(it.grade)}</div>` : ''}<div class="g-name">${icon(d.item)}<span>${esc(name)}${e.qty > 1 ? ' × ' + e.qty : ''}</span></div>
    <div class="g-price">${price_}</div>${lots}${it && it.text ? `<button class="g-link" data-act="lore" data-id="${d.item}">物品文本</button>` : ''}${e.done ? sealSVG(e.done.seal || e.done.label) : ''}</div>`;
}
function renderEnc() {
  const e = S.enc;
  const n = NP[e.npc];
  const head = `<div class="who">${portrait(e.npc, e.face, 'big')}<div><div class="nm">${esc(n.name)}</div><div class="rl">${esc(n.role)}</div><div class="lv muted">${esc(npcLv(e.npc))}${S.rel[e.npc] ? '　·　' + attitude(e.npc) : ''}</div></div></div>`;
  const th = e.th.map(x => {
    if (x.k === 'npc') return `<div class="ln"><span class="sp">${x.who ? portrait(x.who, x.f, 'tiny') : ''}${esc(x.who ? NP[x.who].name : n.name)}</span><span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'me') return `<div class="ln me">${x.f ? portrait('me', x.f, 'tiny me') : ''}<span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'sys') return `<div class="ln sys"><span class="label">眼力</span><span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'res') return `<div class="ln res"><span class="tx">${esc(x.t)}</span>${x.notes && x.notes.length ? `<span class="small muted">${esc(x.notes.join('　'))}</span>` : ''}</div>`;
    return `<div class="ln ${x.k}"><span class="tx">${esc(x.t)}</span></div>`;
  }).join('');
  let opts = '';
  if (!e.done) {
    const os = encOptions();
    opts = `<h2 class="sec-h">你怎麼做？</h2><p class="small muted" style="margin:-4px 0 8px">遊戲不會告訴你誰在說謊。${canAct('appraise') ? '下面可以花一點眼力自己看。' : ''}</p><div class="choice">${os.map(o => `<button class="opt ${o.key === 'expose' || o.key === 'report' ? 'danger' : ''}" data-act="decide" data-k="${o.key}" ${o.disabled ? 'disabled' : ''}><b>${esc(o.label)}</b><span>${esc(o.desc || '')}</span></button>`).join('')}</div>`;
  }
  return `${head}${goodsCard(e)}<div class="thread" id="thread">${th}</div>${opts}`;
}
const rememberLine = sp => { const did = deathOf(sp); return did && !sp.repeat && (S.remember || {})[did] && DEATHS[did] ? `<span class="small cin" style="display:block">你記得：${esc(DEATHS[did].title)}</span>` : ''; };
const altBtn = sp => { const did = deathOf(sp); if (!did || sp.repeat || !(S.remember || {})[did] || !isLethal(sp) || !needOk(sp.need)) return ''; return `<button class="opt" data-act="exploresafe" data-id="${sp.id}"><b>換個做法：${esc(sp.title)}</b><span>你記得上一次。這次繞遠路、只看不碰：拿不到東西，負擔＋2，但不會那樣死</span></button>`; };
function spotRelicHint(sp) {
  const fx = sp && sp.fx; if (!fx || !fx.death || S.place.found && S.dead) return '';
  const dd = typeof fx.death === 'string' ? { id: fx.death } : fx.death; const out = [];
  const rid = protectBy(dd.id); if (rid && !(dd.unless && needOk(dd.unless))) out.push(`「${IT[rid].name}」：危險比較小`);
  if (dd.unless && needOk(dd.unless)) { const uj = JSON.stringify(dd.unless); const hid = [...uj.matchAll(/"has":\{([^}]*)\}/g)].flatMap(m => [...m[1].matchAll(/"(\w+)"/g)].map(x => x[1])).find(x => held(x) && IT[x]); if (hid) out.push(`「${IT[hid].name}」：這裡你不會有事`); }
  const see = S.reveal === dayKey() || relicEff().some(([, e]) => e.warn);
  if (see) out.push(dd.unless && needOk(dd.unless) ? '看起來不會出事' : chanceWord(deathChance(fx)) + '會出事');
  return out.length ? `<span class="small jade" style="display:block">${esc(out.join('　'))}</span>` : '';
}
function renderPlace() {
  const id = S.place.id, p = PL[id];
  let h = `${LAYER[id] ? depthGauge(LAYER[id]) : ''}<div class="who place-h"><div><div class="nm">${esc(p.name)}</div><div class="rl">${esc((p.depth ? p.depth + '　·　' : '') + (SLOT[S.slot] || ''))}</div></div></div><p class="serif blurb">${esc(p.blurb)}${p.blurbM && p.blurbM[MON()] ? ' ' + esc(p.blurbM[MON()]) : ''}${id === 'market' && S.day === MD().marketDay ? ' ' + esc(p.blurbMarketDay) : ''}</p>`;
  if (S.place.say) h += `<div class="ln" style="margin-top:12px">${S.place.sayWho || p.npc ? `<span class="sp">${esc(NP[S.place.sayWho || p.npc].name)}</span>` : ''}<span class="tx">${esc(S.place.say)}</span></div>`;
  if (p.type === 'explore') { const gr = gearStats().relic; h += `<p class="small ${S.burden > burdenLimit() ? 'cin' : 'muted'}" style="margin-top:6px">負擔 ${S.burden}/${burdenLimit()}：${burdenWord()}${ascentRisk() > 0 ? `。負擔超過上限，${riskWord(ascentRisk())}。` : '。'}${gr.limit || gr.ascent < 1 || gr.steps || ((PFX[id] || {}).ascent && gr.by[PFX[id].ascent]) ? `<span class="jade">（遺物：${[gr.limit ? '上限＋' + gr.limit : '', gr.ascent < 1 ? '回程比較安全' : '', (PFX[id] || {}).ascent && gr.by[PFX[id].ascent] ? '「' + IT[gr.by[PFX[id].ascent]].name + '」：這裡的回程比較安全' : '', gr.steps ? '多看' + gr.steps + '處' : ''].filter(Boolean).join('、')}）</span>` : ''}</p>`; }
  if (p.type === 'explore' && firstVisit(id) && !S.place.found) { const hid = lethalLeft(id); if (hid.length) h += `<div class="card dim" style="margin-top:10px"><p class="small muted">第一次來。有幾個方向，你還不敢往那邊看：</p>${hid.slice(0, 3).map(sp => `<p class="small warn" style="margin-top:4px">${esc(sp.danger || '那邊很安靜，安靜得不對勁。')}</p>`).join('')}<p class="small muted" style="margin-top:4px">下次再來，也許就敢了。</p></div>`; }
  if (S.place.found) { const f = S.place.found; h += `<div class="card" style="margin-top:12px"><b class="serif">${f.icon ? icon(f.icon, 'sm') + ' ' : ''}${esc(f.title)}</b>${f.text.split('\n').map(t => `<p class="serif" style="line-height:1.9;margin-top:6px">${esc(t)}</p>`).join('')}${f.notes.length ? `<p class="small jade" style="margin-top:6px">${esc(f.notes.join('　'))}</p>` : ''}</div>`; }
  if (p.type === 'explore') { const us = heldRelics().filter(r => { const u = IT[r].eff.use; return u && u.where !== 'shop'; }); if (us.length) h += `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:10px"><span class="small muted">身上可以拿出來用的：</span>${us.map(r => useBtn(r)).join('')}</div>`; }
  if (p.spots) {
    const av = spotsAvail(id);
    if (S.place.acted) h += `<p class="small muted" style="margin-top:12px">${p.type === 'explore' ? (S.place.strain ? '天色不早了，回程會比較久。' : '在這裡的時間差不多了。') : '今天先這樣。'}</p>`;
    else if (av.length) {
      h += `<h2 class="sec-h">${p.type === 'explore' ? '要往哪裡走' : '看看'}</h2>`;
      h += av.map(sp => { const ok = needOk(sp.need) && !(sp.cost && S.stones < sp.cost); const isNew = !sp.repeat && !S.explored[sp.id]; const bb = p.type === 'explore' ? spotBurden(id, sp) : 0, over = bb && S.burden + bb > burdenLimit(); return `<button class="opt${sp.strain || sp.danger ? ' danger' : ''}${UI.confirm === 'sp:' + sp.id ? ' confirm' : ''}" data-act="explore" data-id="${sp.id}" ${ok ? '' : 'disabled'}><b>${UI.confirm === 'sp:' + sp.id ? '再按一次：' : ''}${esc(sp.title)}${isNew ? '　<span class="jade small">沒去過</span>' : ''}</b><span>${esc(sp.hint || '')}${sp.cost ? `　·　${sp.cost} 靈石` : ''}${sp.strain ? '　·　回程多花一個時段' : ''}${bb ? `　·　負擔＋${bb}${over ? '（會超過上限）' : ''}` : ''}</span>${sp.danger ? `<span class="warn">${esc(sp.danger)}</span>` : ''}${(S.signs || {})[sp.id] && isLethal(sp) ? `<span class="small warn" style="display:block">你在邊上看過：${esc(chanceWord(deathChance(sp.fx)))}會出事</span>` : ''}${rememberLine(sp)}${spotRelicHint(sp)}</button>${altBtn(sp)}`; }).join('');
    } else h += `<p class="small muted" style="margin-top:12px">這裡現在沒有別的可以看了。換個日子、換個季節再來，也許不一樣。</p>`;
    if (p.type === 'explore' && !S.place.steps && !S.place.acted && !S.place.watched) h += `<button class="opt quietopt" style="margin-top:8px" data-act="watch"><b>站在邊上看一會兒</b><span>不往裡走，不加負擔。看清楚這一帶，也喘口氣（會花掉這個時段）</span></button>`;
    const lb = (S.leftBehind || {})[id];
    if (lb && !S.place.acted) h += `<button class="opt" style="margin-top:8px" data-act="pickback"><b>${icon(lb.item, 'sm')} 撿回你留下的${esc(lb.label)}</b><span>它還在原地。負擔＋1，不算一處</span></button>`;
  }
  if (p.type === 'archive') {
    const rl = relicLots();
    h += `<h2 class="sec-h">拿給林老師看</h2><p class="small muted">${esc(p.note || '')}</p>`;
    h += rl.length ? `<div class="stack">${rl.map(l => { const it = IT[l.item]; const st = S.flags['studied_' + l.item]; return `<div class="row" style="flex-wrap:wrap;gap:6px"><span class="serif" style="flex:1;min-width:8em">${icon(l.item, 'sm')} ${esc(l.label)} × ${l.qty}</span><button class="btn quiet" style="min-height:34px" data-act="lin" data-k="sell" data-id="${l.id}">賣 ${fmt(linPrice(l))}</button><button class="btn quiet" style="min-height:34px" data-act="lin" data-k="study" data-id="${l.id}" ${st ? 'disabled' : ''}>${st ? '研究過了' : '請她研究'}</button><button class="btn quiet" style="min-height:34px" data-act="lin" data-k="give" data-id="${l.id}">捐出</button></div>`; }).join('')}</div>` : '<p class="small muted">你身上沒有舊物或異物。去外面走走，總會撿到一點什麼。</p>';
    if (S.donated) h += `<p class="small jade" style="margin-top:8px">舊物室的架子上，有 ${S.donated} 張小卡寫著你的名字。</p>`;
  }
  if (id === 'market') {
    h += `<h2 class="sec-h">攤子</h2><div class="stack">`;
    for (const s of stallsToday()) {
      const n = NP[s.npc];
      if (s.special === 'smith') { h += smithHTML(s); continue; }
      const d = stallDeal(s), done = d && S.done[d.id];
      const avail = d && dealAvail(d);
      h += `<div class="person"><div class="ph"><b>${esc(n.name)}</b><span class="small muted">${esc(n.role)}</span></div><p class="serif small">${esc(s.goods)}</p>
        ${avail ? `<button class="btn quiet" data-act="deal" data-id="${d.id}">上前看看</button>` : `<span class="small muted">${done ? '已經談過了。' : '今天沒有你的事。'}</span>`}${s.npc === 'mang' && done !== 'special' && S.flags.mang_saw_jiansui && held('yupai') && !S.flags.mang_saw_yupai ? `<button class="btn quiet" data-act="mangyupai">給她看霜紋隊牌</button>` : ''}</div>`;
    }
    h += `</div>`;
    if (S.day === MD().marketDay) h += `<h2 class="sec-h">擺攤</h2><p class="small muted">市集日可以自己擺個攤，客人多是逛街的人，賣得快、利薄。照市價九五折，最多擺三批貨。</p><button class="btn quiet wide" data-act="stall" ${S.place.stalled ? 'disabled' : ''}>${S.place.stalled ? '今天擺過了' : '擺攤'}</button>`;
  }
  if (id === 'huichun') {
    h += `<h2 class="sec-h">藥櫃</h2><p class="small muted" style="margin-bottom:6px">回春藥行賣得比市價貴一成半，收貨只給八折，拿來轉賣通常虧錢。要賺，得趕在消息讓價錢漲起來之前買；定神香、養氣錠則是夜裡靜坐自己用的。你不製藥。</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>貨</th><th class="r">價</th><th></th></tr></thead><tbody>`;
    for (const s of p.sells) { const pr = rp(price(s.item) * s.mult); h += `<tr><td><button class="g-link ilink" style="margin:0" data-act="lore" data-id="${s.item}">${icon(s.item, 'sm')}<span>${esc(IT[s.item].name)}</span></button><div class="small muted">${esc(IT[s.item].grade)}${['dingshen', 'yangqi'].includes(s.item) ? '　·　<span class="jade">夜裡靜坐用</span>' : ''}</div></td><td class="r">${fmt(pr)}</td><td class="r"><button class="btn quiet" style="min-height:34px" data-act="hbuy" data-id="${s.item}" ${S.stones < pr ? 'disabled' : ''}>買一${esc(IT[s.item].unit)}</button></td></tr>`; }
    for (const x of p.display) h += `<tr><td><button class="g-link ilink" style="margin:0" data-act="lore" data-id="${x}">${icon(x, 'sm')}<span>${esc(IT[x].name)}</span></button><div class="small muted">${esc(IT[x].stat)}</div></td><td class="r muted">—</td><td></td></tr>`;
    h += `</tbody></table></div><h2 class="sec-h">賣給回春藥行</h2>`;
    const mine = S.lots.filter(l => (IT[l.item].sell || []).includes('huichun'));
    h += mine.length ? `<div class="stack">${mine.map(l => { const o = huichunOffer(l); return `<div class="row"><span class="serif" style="flex:1;min-width:0">${esc(l.label)} × ${l.qty}</span><button class="btn quiet" data-act="hsell" data-id="${l.id}">${typeof o === 'number' ? '賣 ' + fmt(o * l.qty) : '問問看'}</button></div>`; }).join('')}</div><p class="small muted" style="margin-top:6px">回春藥行照市價八折收，成色照實算。張主任看得出金線真假。</p>` : `<p class="small muted">你手上沒有回春藥行收的貨。</p>`;
  }
  if (id === 'tea') {
    const list = D.news.teahouse.filter(x => inMonth(x) && x.day === S.day), bought = S.teaBought[S.day] || [];
    h += `<h2 class="sec-h">消息單</h2><div class="stack">${list.map((t, i) => bought.includes(i) ? `<div class="newscard"><div class="src">買到的消息</div><div class="txt">${esc(t.text)}</div></div>` : `<div class="row"><span class="small muted" style="flex:1">一則消息</span><button class="btn quiet" data-act="tbuy" data-i="${i}" ${S.stones < t.price ? 'disabled' : ''}>${t.price} 靈石</button></div>`).join('') || '<p class="small muted">今天沒有新消息。</p>'}</div>`;
    const oh = D.news.overhear.find(o => inMonth(o) && o.day === S.day);
    h += `<h2 class="sec-h">偷聽</h2>${S.overheard[S.day] ? `<div class="ln"><span class="sp">隔壁桌</span><span class="tx">${esc(oh.text)}</span></div>` : `<button class="btn quiet wide" data-act="overhear">挑張桌子坐下</button>`}`;
    h += `<h2 class="sec-h">問白姐一個人</h2><p class="small muted">每問一個人 ${PL.tea.askCost} 塊靈石。她只說她願意說的。</p><button class="btn quiet wide" data-act="askbai">問……</button>`;
    const bn = S.baiSold[S.day] || 0;
    h += `<h2 class="sec-h">賣消息</h2><p class="small muted">白姐一天收兩則。消息越新、知道的人越少，越值錢。舊聞、人人都知道的、聽雨茶館自己傳出去的，她不收。</p><button class="btn quiet wide" data-act="intelsheet" ${bn >= 2 ? 'disabled' : ''}>${bn >= 2 ? '今天她不收了' : '翻開消息簿……'}</button>`;
  }
  if (id === 'office') {
    const n = NP.zhou;
    h += `<div class="ln" style="margin-top:12px"><span class="sp">${esc(n.name)}</span><span class="tx">${esc(rel('zhou') >= 2 ? '「許老闆，有事？」' : rel('zhou') <= -2 ? '「又是你。」' : '「什麼事？」')}</span></div>`;
    if (S.flags.bounty_seen && MON() === 1) h += `<h2 class="sec-h">懸賞</h2>${newsHTML('n_bounty', true)}`;
    if (MON() === 2 && S.day >= 3 && !S.flags.scar_caught) h += `<h2 class="sec-h">懸賞</h2>${newsHTML('n2_shen', true)}`;
    const acts = [];
    if (held('xuechan')) acts.push(`<button class="opt" data-act="turnxc"><b>交出雪蟾酥</b><span>懸賞${S.flags.bounty_seen ? '六十' : '還沒貼出來，先給四十'}</span></button>`);
    if (held('duanshui') && S.flags.bounty_seen) acts.push(`<button class="opt" data-act="turn" data-k="duanshui"><b>交出斷水刀</b><span>余小六的佩刀，賞二十</span></button>`);
    if (holdFlag('sting')) acts.push(`<button class="opt" data-act="turn" data-k="sting"><b>交出柳醫師的療傷藥</b><span>瓶底有管理處的印</span></button>`);
    h += acts.length ? `<h2 class="sec-h">交東西</h2>${acts.join('')}` : '';
    const al = accuseList();
    if (al.length) h += `<h2 class="sec-h">告發</h2><p class="small muted">告得成告不成，看你手上的證據，也看管理處管不管。</p>${al.map(a => `<button class="opt danger" data-act="accusesheet" data-id="${a.id}"><b>${esc(a.label)}</b><span>${esc(NP[a.who].name)}</span></button>`).join('')}`;
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
    h += `<div class="ln" style="margin-top:12px"><span class="sp">${esc(NP.dianzhu.name)}</span><span class="tx">「許先生，尚餘${monthsText(S.lifespan)}。」</span></div>
      <div class="card" style="margin-top:12px"><div class="lore">${esc(IT.dangpiao.text)}</div></div>
      <button class="opt" data-act="redeem" ${S.stones < redeemCost() ? 'disabled' : ''}><b>贖回一個月壽命</b><span>${redeemCost()} 靈石。${pawnMult() !== 1 ? '今天的價錢跟平常不一樣。' : '越贖越貴。'}</span></button>`;
    const rl = [...new Map(S.lots.filter(l => IT[l.item] && IT[l.item].cat === 'relic').map(l => [l.item, l])).values()];
    if (!S.flags.deposited && rl.length) h += `<h2 class="sec-h">寄放給下一次</h2><p class="small muted">老闆說，有些東西不是給這一次的你。寄放一件遺物，下一次重新開張，它會自己找回來。一局只能寄一件。</p><div class="stack">${rl.map(l => `<button class="opt" data-act="deposit" data-id="${l.id}"><b>${icon(l.item, 'sm')} ${esc(l.label)}</b><span>${esc(IT[l.item].eff ? IT[l.item].eff.desc : '')}</span></button>`).join('')}</div>`;
    else if (S.flags.deposited) h += `<p class="small muted" style="margin-top:10px">你寄放的東西，在櫃檯後面的架子上。單子上的日期，你還是看不懂。</p>`;
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
  h += mine.length ? mine.map(l => { const o = smithOffer(l); const tot = PL.smith.buys[l.item].fixed ? o : o * l.qty; return `<div class="row"><span class="small" style="flex:1;min-width:0">${esc(l.label)} × ${l.qty}</span><button class="btn quiet" style="min-height:34px" data-act="ssell" data-id="${l.id}">賣 ${fmt(tot)}</button></div>`; }).join('') : `<span class="small muted">他收寒鐵、狼牙、刀，和會發燙的石頭。</span>`;
  if (dirty) h += `<span class="small muted">你那批沒有印記的寒鐵，他看了一眼就推回來：「這個我不收。你最好也別留。」</span>`;
  for (const c of sellCfg) { const pr = rp(price(c.item) * c.mult); h += `<div class="row"><span class="small" style="flex:1">他也賣${esc(IT[c.item].name)}：${fmt(pr)} 一${esc(IT[c.item].unit)}，一次${cnNum(c.lot)}${esc(IT[c.item].unit)}</span><button class="btn quiet" style="min-height:34px" data-act="sbuy" data-id="${c.item}" ${S.stones < pr * c.lot ? 'disabled' : ''}>買 ${fmt(pr * c.lot)}</button></div>`; }
  if (S.commission && !S.commission.done) h += `<span class="small muted">訂的刀，${M.dayNames[S.commission.ready - 1]}好。</span>`;
  else if (!S.commission) h += `<button class="btn quiet" data-act="commission" ${held(c.needItem) < c.needQty || S.stones < c.fee ? 'disabled' : ''}>訂一把寒鐵短刀（${c.needQty}公斤寒鐵＋${c.fee}靈石，三天）</button>`;
  return h + `</div>`;
}

function renderNight() {
  const n = S.night; if (!n || !n.rep) return '<p class="muted">夜。</p>';
  const r = n.rep, need = M.xpNeed[S.level] || 999;
  const row = (a, v, cls = '') => `<div class="row"><span class="label" style="flex:1">${a}</span><b class="num ${cls}">${v}</b></div>`;
  const sign = x => (x >= 0 ? '＋' : '－') + fmt(Math.abs(x));
  return `<section class="night stack"><h2>日報・${esc(monthLabel(MON()))}${esc(M.dayNames[S.day - 1] || '')}</h2>
    <div class="card ledger"><div class="row"><span class="label" style="flex:1">店裡今天淨賺</span><b class="num big ${r.total >= 0 ? 'jade' : 'cin'}" data-count="${r.total}" data-sign="1">${sign(r.total)}</b></div>
    <p class="small muted" style="margin:4px 0 6px">來客 ${r.traffic} 人・營業額 ${fmt(r.gross)}・收了 ${r.acc} 批貨${r.fakes ? `（其中 ${r.fakes} 批是假的，虧 ${r.fakeLoss}）` : ''}</p>
    ${r.lines.map(t => `<p class="serif small" style="line-height:1.8">・${esc(t)}</p>`).join('')}
    <details style="margin-top:6px"><summary class="small muted">細帳</summary>${row('賣貨毛利', sign(r.net))}${row('收購轉賣', sign(r.buyProfit))}${r.fakeLoss ? row('假貨', sign(-r.fakeLoss), 'cin') : ''}${r.shady ? row('不問來路的貨', sign(r.shady)) : ''}${r.night ? row('夜班', sign(r.night)) : ''}${r.skim ? row('抽屜少了', sign(-r.skim), 'cin') : ''}${row('薪水', sign(-r.wages))}</details>
    ${r.relic ? `<p class="small jade" style="margin-top:6px">夥計收到一件「${esc(IT[r.relic].name)}」，放進你的庫房了。</p>` : ''}
    ${r.gossip ? `<p class="small muted" style="margin-top:4px">客人閒聊：${esc(r.gossip)}</p>` : ''}</div>
    ${(n.autoDeals || []).length || n.pawnLine ? `<div class="card"><b class="serif">你不在的時候</b>${[...(n.autoDeals || []), ...(n.pawnLine ? [n.pawnLine] : [])].map(t => `<p class="small" style="margin-top:4px">${esc(t)}</p>`).join('')}</div>` : ''}
    ${(n.carryLines || []).length ? `<div class="card"><b class="serif">身上</b>${n.carryLines.map(x => `<p class="small" style="margin-top:4px">${icon(x.id, 'sm')} 「${esc(IT[x.id].name)}」<span class="${x.spoke ? 'jade' : 'muted'}">${x.spoke ? '今天出聲了。' : '今天沒出聲。'}</span></p>`).join('')}</div>` : ''}
    ${(n.relicLines || []).length || (n.relicOn || []).length || n.relicGain || (n.restBy || []).length ? `<div class="card"><b class="serif">遺物</b>${(n.relicLines || []).map(x => `<p class="serif small" style="line-height:1.8;margin-top:4px">${icon(x.id, 'sm')} 「${esc(IT[x.id].name)}」${esc(x.text)}<span class="small ${x.curse ? 'cin' : 'jade'}">　${esc(x.notes.join('　'))}</span></p>`).join('')}${n.relicGain ? `<p class="small ${n.relicGain > 0 ? 'jade' : 'cin'}" style="margin-top:4px">店裡的遺物，今天大約${n.relicGain > 0 ? '多賺' : '少賺'} ${fmt(Math.abs(n.relicGain))} 靈石。</p>` : ''}${(n.restBy || []).length ? `<p class="small muted" style="margin-top:4px">夜裡退負擔：${n.restBy.map(x => esc(IT[x.id].name) + (x.v > 0 ? '多退 ' : '少退 ') + Math.abs(x.v)).join('、')}（負擔 ${n.burden[0]}→${n.burden[1]}）</p>` : ''}${(n.relicOn || []).length ? `<p class="small muted" style="margin-top:4px">庫房裡在作用、或等著出聲的：${n.relicOn.map(id => esc(IT[id].name)).join('、')}</p>` : ''}</div>` : ''}
    ${n.dues ? `<div class="card"><b class="serif">規費</b><p class="small" style="margin-top:4px">${esc(n.dues)}</p></div>` : ''}
    <div class="card">${row('晚上靜坐', n.invest ? `投 ${n.invest}，修行＋${n.gain}` : '沒有靜坐')}${row('修行', `${S.xp} / ${need}`)}${row('負擔', `${n.burden[0]} → ${n.burden[1]}（${burdenWord(n.burden[1])}）`)}
    ${S.level > n.lvBefore ? `<p class="jade serif" style="margin-top:6px"><b>身體又適應了一層。你現在是${lvName(S.level)}。負擔上限變成 ${burdenLimit()}，更深的地方撐得住了。</b></p>` : ''}</div>
    ${tomorrowHTML()}
    <p class="small muted">明天早上，店裡的事會變成卡片。方針、夥計、店面，在「店務」裡調。</p></section>`;
}
function nightGain(inv, burn, pill) { return Math.round(inv * (burn ? 1.4 : 1) + (pill ? (S.pillYesterday ? 9 : 18) : 0)); }
function updateNight() {
  const max = Math.min(M.nightCap, Math.floor(S.stones)), inv = Math.min(UI.night.invest, max);
  const burn = UI.night.burn && held('dingshen') > 0, pill = UI.night.pill && held('yangqi') > 0;
  const g = nightGain(inv, burn, pill), need = M.xpNeed[S.level];
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('inv-val', inv); set('gain-val', '＋' + g); set('xp-to', `${S.xp} → ${S.xp + g} / ${need}`);
  const b = document.querySelector('[data-act="meditate"]'); if (b) b.textContent = inv || pill ? '靜坐' : '不靜坐，睡覺';
}

function tomorrowHTML() {
  if (S.day >= DAYS()) return MON() < LAST_MONTH ? '<div class="card small"><b>明天</b>　這個月的事告一段落，日子會一跳就過去，店照常開。</div>' : '';
  const t = S.day + 1, out = [];
  if (t === MD().marketDay) out.push('市集日，客人會比較多。');
  if (t === DAYS() && !S.dues && !MD().noDues) { const high = S.shop.pol.sign === '張揚' || S.wind >= M.windHigh || S.stones >= M.richHigh; const due = high ? MD().duesHigh : MD().dues; out.push(`這個月最後一天，晚上管理處收規費，大概 ${due}${high ? '（你太顯眼，收高的）' : ''}。` + (S.stones < due + 20 ? '抽屜裡的錢可能不夠，修行可以先投少一點。' : '')); }
  if (t === DAYS() && MON() === LAST_MONTH) out.push('最後一天。該來的人會來。');
  if (S.burden > burdenLimit() * 0.5) out.push(`負擔還有 ${S.burden}，明天下去要算好。`);
  return out.length ? `<div class="card small"><b>明天</b>　${esc(out.join(''))}</div>` : '';
}
function renderShop() {
  const st = shopStats(), P = S.shop.pol, est = shopDay('est', true), A = SH.policy || {};
  const seg = (k, group) => `<div class="pol"><span class="label">${esc(group.label)}</span><div class="seg">${Object.entries(group.opts).map(([v, o]) => `<button data-act="pol" data-k="${k}" data-v="${v}" class="${P[k] === v ? 'on' : ''}">${esc(o.name)}</button>`).join('')}</div><p class="small muted">${esc((group.opts[P[k]] || {}).desc || '')}</p></div>`;
  let h = `<h2 class="sec-h">許家店・${esc(tierOf().name)}</h2><div class="card">
    <div class="row"><span class="label" style="flex:1">照現在這樣，一天大概</span><b class="num gold">${fmt(est.total)}</b></div>
    <div class="row"><span class="label" style="flex:1">開張以來淨賺</span><b class="num">${fmt(S.shop.total)}</b></div>
    <div class="row"><span class="label" style="flex:1">最好的一天</span><b class="num">${fmt(S.shop.best || 0)}</b></div>
    <p class="small muted" style="margin-top:6px">客流 ${fmt(st.traffic)}・會賣 ${st.sales}・眼力 ${st.appraise}・守夜 ${st.security}・每晚退負擔 ${st.rest}</p></div>`;
  h += `<h2 class="sec-h">方針</h2><div class="card stack">${seg('buy', A.buy)}${seg('price', A.price)}${seg('sign', A.sign)}${seg('cult', A.cult)}
    <div class="pol"><span class="label">${esc(A.cats.label)}</span><div class="seg wrap">${Object.entries(A.cats.list).map(([k, o]) => `<button data-act="cat" data-k="${k}" class="${P.cats[k] ? 'on' : ''}${k === 'shady' ? ' risky' : ''}">${esc(o.name)}</button>`).join('')}</div><p class="small muted">${Object.entries(A.cats.list).filter(([k]) => P.cats[k]).map(([, o]) => o.desc).join(' ')}</p></div></div>`;
  h += `<h2 class="sec-h">夥計 <small class="muted">${S.shop.staff.length}/${staffSlots()}</small></h2><div class="stack">`;
  for (const id of S.shop.staff) { const s = ST()[id]; h += `<div class="person"><div class="ph"><b>${esc(s.name)}</b><span class="small muted">${esc(s.role)}　·　日薪 ${s.wage}</span><button class="btn quiet sm" style="margin-left:auto" data-act="fire" data-id="${id}">請走</button></div><p class="small">${esc(s.desc)}</p><div class="small jade">${esc((s.tags || []).join('・'))}</div></div>`; }
  const cand = Object.entries(ST()).filter(([id, s]) => !s.bonusOnly && !S.shop.staff.includes(id) && needOk(s.need) && !(id === 'amei' && S.flags.amei_lost) && !(id === 'akai' && S.flags.hired_akai && !S.shop.staff.includes('akai')));
  const candHTML = ([id, s]) => `<div class="person"><div class="ph"><b>${esc(s.name)}</b><span class="small muted">${esc(s.role)}　·　日薪 ${s.wage}</span><button class="btn jade sm" style="margin-left:auto" data-act="hire" data-id="${id}" ${S.stones < s.hire || S.shop.staff.length >= staffSlots() ? 'disabled' : ''}>請 ${s.hire}</button></div><p class="small">${esc(s.desc)}</p><div class="small jade">${esc((s.tags || []).join('・'))}</div></div>`;
  if (cand.length) { const full = S.shop.staff.length >= staffSlots(); const top = full ? [] : cand.filter(([, s]) => S.stones >= s.hire).slice(0, 2); const rest = cand.filter(c => !top.includes(c));
    h += (top.length ? `<p class="small muted" style="margin-top:4px">現在請得起的人：</p>` + top.map(candHTML).join('') : '') + (rest.length ? `<details class="card"><summary class="small">${full ? '店裡站不下了。其他人選' : '其他人選'}（${rest.length}）</summary><div class="stack" style="margin-top:8px">${rest.map(candHTML).join('')}</div></details>` : ''); }
  const shelf = (title, note, table, owned, act, word) => {
    const ents = Object.entries(table).filter(([id, u]) => owned[id] || needOk(u.need));
    const have = ents.filter(([id]) => owned[id]), want = ents.filter(([id]) => !owned[id]).sort((a, b) => a[1].cost - b[1].cost);
    return `</div><h2 class="sec-h">${title} <small class="muted">${have.length}/${ents.length}</small></h2>${note}${have.length ? `<div class="chips">${have.map(([, u]) => `<span class="pill jade">${esc(u.name)}</span>`).join('')}</div>` : ''}<div class="stack">` + want.slice(0, 3).map(([id, u]) => `<div class="row upg"><div style="flex:1"><b class="serif">${esc(u.name)}</b><div class="small muted">${esc(u.desc)}</div></div><button class="btn quiet sm" data-act="${act}" data-id="${id}" ${S.stones < u.cost ? 'disabled' : ''}>${u.cost}</button></div>`).join('') + (want.length > 3 ? `<details><summary class="small muted">更貴的（${want.length - 3}）</summary>${want.slice(3).map(([id, u]) => `<div class="row upg"><div style="flex:1"><b class="serif">${esc(u.name)}</b><div class="small muted">${esc(u.desc)}</div></div><button class="btn quiet sm" data-act="${act}" data-id="${id}" ${S.stones < u.cost ? 'disabled' : ''}>${u.cost}</button></div>`).join('')}</details>` : '') + (!want.length ? `<p class="small jade">${word}</p>` : '');
  };
  h += shelf('店面', '', UP(), S.shop.upg, 'upg', '能修的都修好了。');
  h += shelf('探索裝備', `<p class="small muted" style="margin:-4px 0 8px">負擔上限 ${burdenLimit()}（吐納層數越高越多）。裝備讓你走得更深、活著回來。</p>`, GE(), S.shop.gear || {}, 'gear', '能帶的都帶齊了。');
  h += `</div>`;
  if (S.reports.length) h += `<h2 class="sec-h">最近的日報</h2><div class="card small">${S.reports.slice(0, 6).map(r => `<div class="row"><span style="flex:1">${esc(monthLabel(r.m))}${esc(M.dayNames[r.day - 1] || '')}</span><b class="${r.total >= 0 ? 'jade' : 'cin'}">${r.total >= 0 ? '＋' : '－'}${fmt(Math.abs(r.total))}</b></div>`).join('')}</div>`;
  return h;
}
function renderThreads() {
  const list = THREADS.map(t => ({ t, s: threadState(t) }));
  const on = list.filter(x => x.s.started), off = list.filter(x => !x.s.started);
  const card = ({ t, s }) => `<div class="card thread-card"><div class="row"><b class="serif" style="flex:1">${esc(t.title)}</b><span class="pill ${s.done === t.steps.length ? 'jade' : ''}">${s.done}/${t.steps.length}</span></div><p class="small muted">${esc(t.desc)}</p>
    <ol class="steps">${t.steps.map((st, i) => stepDone(st) ? `<li class="done">${esc(st.text)}</li>` : (threadMem()[t.id] || []).includes(i) ? `<li class="ghost muted">上一次：${esc(st.text)}</li>` : '').join('')}${s.next ? `<li class="next">？　<span class="muted">${esc(s.next.hint)}</span></li>` : '<li class="next jade">這一條走完了。</li>'}</ol></div>`;
  return `<h2 class="sec-h">謎題簿</h2><p class="small muted" style="margin-bottom:8px">一條一條追下去的事。只寫你已經知道的；下一步的方向，是你自己的推測。</p><div class="stack">${on.map(card).join('') || '<p class="muted">還沒有。去外面走走，或等人找上門。</p>'}</div>
    ${off.length ? `<details class="card" style="margin-top:12px"><summary class="small muted">還沒開始的（${off.length}）</summary>${off.map(({ t, s }) => `<p class="small" style="margin-top:6px"><b>${esc(t.title)}</b>　<span class="muted">${esc(t.steps[0].hint)}</span></p>`).join('')}</details>` : ''}`;
}
const DCAT = { 探索: 'death_explore', 上升負擔: 'death_ascent', 遺物: 'death_relic', 店裡: 'death_shop' };
function renderDead() {
  const d = DEATHS[S.dead.id] || { title: '死了', text: '', seal: '歿' };
  const book = store.get(DEATH_KEY) || {}, nd = Object.keys(book).filter(k => DEATHS[k]).length, ND = Object.keys(DEATHS).length;
  const ck = ckptInfo();
  return `<section class="dead stack" style="padding-top:22px">
    <span class="label">${ic(DCAT[d.cat] || 'death_explore', 'dcat')} ${esc(monthLabel(S.dead.m))}${esc(M.dayNames[S.dead.day - 1] || '')}・${esc(d.cat || '')}</span>
    <h2 class="dead-h">${esc(d.title)}</h2>
    ${S.dead.again ? `<div class="event finale"><p class="serif" style="font-size:1.3em">它記得你。</p>${sealSVG(d.seal || '歿')}</div><details class="card"><summary class="small muted">上一次的樣子</summary><p class="small" style="margin-top:6px">${esc(d.text)}</p></details>` : `<div class="event finale"><p>${esc(d.text)}</p>${sealSVG(d.seal || '歿')}</div>`}
    <p class="small ${S.deathNew ? 'jade' : 'muted'}">${S.deathNew ? '新的死法。' : '這種死法，你見過了。'}死法圖鑑 ${nd}/${ND}${UI.achToast ? '　·　解鎖成就：' + esc(UI.achToast.join('、')) : ''}</p>
    <details class="card"><summary class="small">怎麼避開</summary><p class="small" style="margin-top:6px">${esc(d.hint || '')}</p></details>
    <div class="stack">
      ${ck.today ? `<button class="btn primary wide" data-act="restore" data-v="today">回到這一天早上（${esc(ck.today.label)}）</button>` : ''}
      ${ck.prev ? `<button class="btn quiet wide" data-act="restore" data-v="prev">回到前一天早上（${esc(ck.prev.label)}）</button>` : ''}
      <button class="btn quiet wide" data-act="setup">重新開張</button>
      <button class="btn ghost wide" data-act="deathsheet">看死法圖鑑</button>
    </div></section>`;
}
function renderEnd() {
  // 舊存檔停在月底結算畫面：不再評等，直接讓日子往下過。
  if (MON() < LAST_MONTH) return `<section class="stack" style="padding-top:18px">
    ${S.cards.length ? `<div class="stack">${S.cards.map(c => `<div class="event"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>${c.notes && c.notes.length ? `<div class="fxline">${esc(c.notes.join('　'))}</div>` : ''}</div>`).join('')}</div>` : ''}
    <p class="serif muted">${esc(((M.months || {})[MON() + 1] || {}).gap ? M.months[MON() + 1].gap.text : '日子往下過。')}</p>
    <button class="btn primary wide" data-act="nextmonth">日子往下過</button></section>`;
  const EN = D.endings['m' + MON()] || D.endings;
  const nw = netWorth(true);
  const mistakes = S.stats.fooled + S.stats.wronged;
  const grade = gradeOf();
  const T = M.truthLabels;
  const missed = Object.values(S.done).filter(v => v === 'missed').length;
  const truthOf = id => { const d = DEALS[id]; const t = d.truth; return `<div class="truth"><b>${esc(d.title.includes(NP[d.npc].name) ? d.title : NP[d.npc].name + '：' + d.title)}</b><div class="t3"><span class="pill">${esc(T.goods[t.goods])}</span><span class="pill">${esc(T.origin[t.origin])}</span><span class="pill ${t.intent === 'plain' ? '' : 'cin'}">${esc(T.intent[t.intent])}</span></div><span class="small muted">你的處置：${esc(labelOf(id, S.done[id]))}${S.flags['won_' + id] ? '，後來到管理處告成了' : ''}</span>${d.lesson ? `<details class="lesson"><summary>線索在哪</summary><p>${esc(d.lesson)}</p></details>` : ''}</div>`; };
  const doneIds = D.deals.filter(d => !d.extra && S.done[d.id] && S.done[d.id] !== 'missed' && S.done[d.id] !== 'na');
  const groups = [...new Set(doneIds.map(d => d.month === 'all' ? 1 : (d.month || 1)))].sort();
  const truths = groups.map(m => { const ids = doneIds.filter(d => (d.month === 'all' ? 1 : (d.month || 1)) === m).map(d => d.id); return `<details class="lesson" ${m === MON() ? 'open' : ''}><summary>${esc(monthLabel(m))}（${ids.length} 筆）</summary>${ids.map(truthOf).join('')}</details>`; }).join('');
  return `<section class="stack" style="padding-top:18px">
    <div class="row"><div><span class="label">許家店 · 終局</span><div class="grade">${grade}等</div></div><div style="margin-left:auto;text-align:right"><span class="label">長生當鋪</span><div class="serif cin" style="font-size:20px;font-weight:700">尚餘${monthsText(S.lifespan - 1)}</div></div></div>
    ${S.cards.length ? `<div class="stack">${S.cards.map(c => `<div class="event"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>${c.notes && c.notes.length ? `<div class="fxline">${esc(c.notes.join('　'))}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${(() => { const f = (EN.finale || []).find(x => needOk(x.need)); if (!f) return ''; return `<div class="event finale"><h3>${esc(f.title)}</h3>${(f.visit || []).filter(v => needOk(v.need)).map(v => `<p>${esc(v.text)}</p>`).join('')}${f.text.split('\n').filter(Boolean).map(t => `<p>${esc(t)}</p>`).join('')}${f.seal ? sealSVG(f.seal) : ''}</div>`; })()}
    <p class="serif" style="line-height:1.95">${esc((grade === '上' ? EN.top : grade === '中' ? EN.mid : S.debt > 0 ? EN.low : EN.lowFooled).replace('{left}', monthsText(S.lifespan - 1)))}</p>
    <div class="card"><table class="tbl"><tbody>
      <tr><td>靈石</td><td class="r">${fmt(S.stones)}</td></tr>
      <tr><td>庫房（照真實成色）</td><td class="r">${fmt(S.lots.reduce((a, l) => a + lotValue(l, DAYS(), true), 0))}</td></tr>
      ${S.debt ? `<tr><td>欠錢不語</td><td class="r cin">－${fmt(S.debt)}</td></tr>` : ''}
      <tr><td><b>身家</b></td><td class="r"><b>${fmt(nw)}</b></td></tr>
      <tr><td>修行</td><td class="r">${lvName(S.level)}　${S.xp}/${M.xpNeed[S.level]}</td></tr>
      <tr><td>錯過的生意</td><td class="r">${missed} 筆</td></tr>
    </tbody></table></div>
    ${(() => { const deep = ['platform', 'lampst', 'stair', 'north', 'cliff', 'reservoir', 'tunnel', 'ruin'].find(id => PL[id] && spotList(id).some(sp => S.explored[sp.id])); const th = THREADS.filter(t => threadState(t).done === t.steps.length).length; return `<h2 class="sec-h">這一局</h2><div class="card"><table class="tbl"><tbody>
      <tr><td>店</td><td class="r">${esc(tierOf().name)}・夥計 ${S.shop.staff.length} 人・修了 ${Object.keys(S.shop.upg).length} 處</td></tr>
      <tr><td>店裡總共賺</td><td class="r">${fmt(S.shop.total)}（最好的一天 ${fmt(S.shop.best || 0)}）</td></tr>
      <tr><td>走到最深</td><td class="r">${deep ? esc(PL[deep].name + '・' + (PL[deep].depth || '')) : '沒出過聚落'}</td></tr>
      <tr><td>看過的地方</td><td class="r">${Object.keys(S.explored).length} 處</td></tr>
      <tr><td>見過的舊物</td><td class="r">${relicKinds()} 種</td></tr>
      <tr><td>走完的謎題</td><td class="r">${th}/${THREADS.length}</td></tr>
      <tr><td>回到早上</td><td class="r">${S.restored || 0} 次</td></tr>
      <tr><td>成就</td><td class="r">${Object.keys(achBook()).length}/${(SH.achievements || []).length}</td></tr></tbody></table></div>`; })()}
    <h2 class="sec-h">評等（整段日子一起算）</h2><div class="card stack">
      ${[['修行到' + lvName(goalLevel()), S.level >= goalLevel(), lvName(S.level)], [`被騙＋錯怪不超過${CN[GR().top]}次`, mistakes <= GR().top, `${mistakes} 次`], ['沒有欠債', !(S.debt > 0), S.debt > 0 ? '欠錢家店' : '沒有']].map(([t, ok, v]) => `<div class="row"><span class="${ok ? 'jade' : 'cin'}" style="width:1.2em">${ok ? '✓' : '✗'}</span><span style="flex:1">${t}</span><span class="small muted">${esc(v)}</span></div>`).join('')}
      <p class="small muted">三條都做到是上等。欠債，或被騙＋錯怪${CN[GR().low]}次以上，是下等。其他是中等。</p></div>
    <h2 class="sec-h">帳面分</h2><div class="card"><table class="tbl score"><thead><tr><th>項目</th><th class="r">數</th><th class="r">每個</th><th class="r">分</th></tr></thead><tbody>
      ${scoreRows().map(r => `<tr${r.k && r.n ? ` class="tap" data-act="statsheet" data-id="${r.k}"` : ''}><td>${esc(r.label)}${r.k && r.n ? '<span class="small jade">　看是哪幾筆 ›</span>' : ''}</td><td class="r">${r.n}</td><td class="r muted">${r.per > 0 ? '＋' : '－'}${Math.abs(r.per)}</td><td class="r ${r.n * r.per < 0 ? 'cin' : ''}">${r.n * r.per > 0 ? '＋' : r.n * r.per < 0 ? '－' : ''}${Math.abs(r.n * r.per)}</td></tr>`).join('')}
      <tr><td><b>合計</b></td><td></td><td></td><td class="r"><b>${scoreTotal()}</b></td></tr></tbody></table>
      <p class="small muted" style="margin-top:8px">${S.prevBest == null ? '這是你第一次走到底，之後每一輪都會跟最高分比。' : S.finalScore > S.prevBest ? `新紀錄。之前最高 ${S.prevBest} 分。` : `你的最高紀錄是 ${S.prevBest} 分。`}</p></div>
    <h2 class="sec-h">這些日子的真相</h2><div>${truths || '<p class="muted">你沒談成什麼生意。</p>'}</div>
    ${(() => { const ts = (EN.teasers || []).filter(t => needOk(t.need)).slice(0, 5); return ts.length ? `<h2 class="sec-h">後來</h2><div class="stack">${ts.map(t => `<p class="serif" style="line-height:1.9">${esc(t.text)}</p>`).join('')}</div>` : ''; })()}
    <p class="serif muted" style="margin-top:12px">${esc(EN.next)}</p>
    <button class="btn primary wide" data-act="setup">從頭再開一次張</button></section>`;
}
function labelOf(id, key) {
  const d = DEALS[id], o = d.opts[key];
  if (String(key).startsWith('info')) return '賣了消息';
  if (key === 'barter') return '拿消息換';
  if (!o) return key;
  if (o.label) return o.label;
  return ({ deal: d.side === 'sell' ? '買下' : d.side === 'buy' ? '賣給他' : '答應', decline: '婉拒', expose: '拆穿', report: '報警', refer: '轉介給錢家店' })[key] || key;
}

function renderStore() {
  const lots = S.lots.map(l => { const it = IT[l.item]; const v = it.base ? lotValue(l) : 0; const flags = l.known ? l.flags.map(f => ({ painted: '金線是畫的', damp: '受潮', stolen: '燙手', sting: '瓶底有印', sect: '寒潭會的東西', alive: '活取', entrusted: '阿蘅託付', contraband: '沒有印記', fake: '假的', cut: '摻了東西', evidence: '證物' })[f]).filter(Boolean) : [];
    return `<tr><td><button class="g-link ilink" style="margin:0" data-act="lore" data-id="${l.item}">${icon(l.item, 'sm')}<span>${esc(l.label)}</span></button>${it.eff ? `<div class="small ${it.eff.curse ? 'cin' : 'jade'}">${esc(effLine(l.item))}</div>${isCarryRelic(l.item) && S.lots.find(x => x.item === l.item) === l && S.phase !== 'end' ? `<button class="btn quiet sm" style="margin-top:4px" data-act="carry" data-id="${l.item}">${(S.carry || []).includes(l.item) ? '放回庫房' : '帶在身上'}</button>` : ''}` : ''}${flags.length ? `<div class="small cin">${esc(flags.join('、'))}${l.known && l.q < 0.9 ? '，成色' + Math.round(l.q * 10) + '成' : ''}</div>` : ''}${l.perishDay ? `<div class="small cin">${M.dayNames[l.perishDay - 1] || ''}化</div>` : ''}</td><td class="r">${l.qty}</td><td class="r">${fmt(l.cost)}</td><td class="r">${it.base ? fmt(v) : '—'}</td><td class="r">${it.eff && it.eff.use && S.lots.find(x => x.item === l.item) === l ? useBtn(l.item, true) : ''}${!l.known && S.spirit > 0 ? `<button class="btn quiet" style="min-height:32px;font-size:13px" data-act="lotapp" data-id="${l.id}">鑑定</button>` : ''}${shopSellable(l) && S.phase !== 'end' ? `<button class="btn quiet" style="min-height:32px;font-size:13px" data-act="shopsell" data-id="${l.id}" style="white-space:nowrap">${UI.confirm === 'ss:' + l.id ? '確定賣' : '賣掉'}</button>` : ''}</td></tr>`; }).join('');
  const items = Object.keys(IT).filter(k => IT[k].base && IT[k].base < 100 && S.codex[k]);
  const board = items.map(k => { const p = price(k), y = S.day > 1 ? price(k, S.day - 1) : p; const ch = p > y ? `<span class="up">▲</span>` : p < y ? `<span class="down">▼</span>` : ''; return `<tr><td class="nm">${icon(k, 'sm')} ${esc(IT[k].name)}</td><td class="r">${fmt(p)} ${ch}</td><td class="r muted">${esc(IT[k].unit)}</td></tr>`; }).join('');
  syncCarry();
  const carryH = heldRelics().some(isCarryRelic) ? `<div class="card small" style="margin-bottom:8px"><b>身上</b>（${S.carry.length}/${CARRY_N}）：${S.carry.length ? S.carry.map(id => icon(id, 'sm') + esc(IT[id].name)).join('、') : '什麼都沒帶'}<p class="muted" style="margin-top:4px">回程、保命、預感這類遺物，要帶在身上才有用。身上只放得下三件；新撿到的，有空位就自己帶上。</p></div>` : '';
  return `<h2 class="sec-h">庫房</h2>${carryH}${S.lots.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>貨</th><th class="r">數</th><th class="r">成本</th><th class="r">估值</th><th></th></tr></thead><tbody>${lots}</tbody></table></div><p class="small muted" style="margin-top:6px">估值照今日市價。成色你沒看過的，照賣家的說法算。「賣掉」是交給店裡照市價出清；舊物拿去舊物室給林老師研究，常常比賣掉值得。</p>` : '<p class="muted">庫房空了。</p>'}
    <p class="row" style="margin-top:8px;gap:8px">${S.lots.some(l => shopSellable(l) && IT[l.item].cat !== 'relic') && S.phase !== 'end' ? '<button class="btn quiet sm" data-act="sellall">一般貨全部交給店裡賣</button>' : ''}<button class="btn quiet sm" data-act="codextab">物品圖鑑 ›</button></p>
    <h2 class="sec-h">今日市價</h2><div class="tbl-wrap"><table class="tbl"><tbody>${board}</tbody></table></div><p class="small muted" style="margin-top:6px">只列你見過的貨。紅漲綠跌。</p>`;
}
function renderPeople() {
  const T = { loose: '街坊', sect: '寒潭會那邊', ghost: '黑市' };
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
const threadDone = () => S ? THREADS.reduce((a, t) => a + threadState(t).done, 0) : 0;
const newThread = () => S && threadDone() > (S.threadSeen || 0);
const newIntel = () => S && Object.keys(S.intel || {}).length > (S.intelSeenN || 0);
function heatWord() { const h = S.heat; return h >= 5 ? '盯上你了' : h >= 3 ? '有人在打聽你' : h >= 1 ? '有人留意' : '平靜'; }
const ACT_WORD = { open: '開口時', ask: '問來歷', press0: '追問', press1: '追問', press2: '追問', silence: '沉默時', appraise: '鑑定', opt: '當面' };
function srcLabel(rec, I) {
  const s = rec.src || '';
  if (s === 'flag') return (I && I.srcText) || '';
  if (s === 'bai') return '聽雨茶館'; if (s === 'street') return '散客閒聊'; if (s === 'verify') return '查證';
  const p = s.split(':');
  if (p[0] === 'home') return '登門拜訪' + NP[p[1]].name;
  if (p[0] === 'explore') return (PL[p[1]] && PL[p[1]].name) || '外面';
  if (p[0] === 'smith') return '鐵師傅的攤子';
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
    if (sold && sold.burned) pills.push('<span class="pill cin">白姐說是假的</span>');
    else if (sold) pills.push(`<span class="pill cin">${esc(dayLabel(sold.day, sold.m))}賣過</span>`);
    if (I.value || I.refuse) {
      if (intelDead(I)) pills.push('<span class="pill">舊聞</span>');
      else if (intelPublic(I)) pills.push('<span class="pill">人盡皆知</span>');
      else if (!sold) pills.push(`<span class="pill">${intelAge(rec)}</span>`);
      if (intelSolo(I) && !intelDead(I) && !intelPublic(I)) pills.push('<span class="pill jade">只有你知道</span>');
    }
  }
  const tk = (S.truthKnown || {})[id]; if (tk) pills.push(`<span class="pill ${tk === 'false' ? 'cin' : 'jade'}">茶籌：${tk === 'false' ? '假' : '真'}</span>`);
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
  return `<h2 class="sec-h">消息簿</h2><div class="card"><div class="row"><span class="label" style="flex:1">聚落對你的注意</span><b class="serif">${heatWord()}</b></div><p class="small muted" style="margin-top:6px">消息會舊，也會傳開。只有你知道的最值錢，也最容易被人想到是你說出去的。</p></div>
    ${ids.length ? '' : '<p class="muted" style="margin-top:12px">還沒記下什麼。問出來的、看出來的、聽來的，都會記在這裡。</p>'}
    ${sec('親眼所見', seen)}${sec('聽人說的', heard, '別人說的話，不一定是真的。')}
    ${misc.length ? `<details class="card" style="margin-top:18px"><summary class="small muted">茶館與街上的閒話（${misc.length}）</summary><div class="intels">${misc.map(intelRow).join('')}</div></details>` : ''}`;
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
  const sh = UI.sheet; if (!sh) { UI.sheetOpen = null; $sheet.hidden = true; $sheet.innerHTML = ''; return; }
  let h = '';
  if (sh.type === 'lore') {
    const it = IT[sh.id]; S.codex[sh.id] = true;
    h = `<span class="label">${esc(it.grade)}</span><h2 class="lore-h">${icon(sh.id, 'lg')}<span>${esc(it.name)}</span></h2><div class="lore-stat">${esc(it.stat)}${it.base && it.base < 100 ? `　·　今日市價 ${fmt(price(sh.id))}` : ''}</div><div class="lore">${esc(it.text)}</div>${it.eff ? `<p class="small ${it.eff.curse ? 'cin' : 'jade'}" style="margin-top:8px;line-height:1.7"><b>效果：</b>${esc(scaleEff(sh.id, it.eff).desc)}${it.eff.use ? `<br><b>可以用：</b>${esc(it.eff.use.desc)}` : ''}${scaleEff(sh.id, it.eff).studied ? '<br>林老師研究過：好的那一面加強了。' : ''}${held(sh.id) ? '' : '（要放在庫房裡才會作用）'}</p>${held(sh.id) && it.eff.use ? `<div style="margin-top:6px">${useBtn(sh.id)}</div>` : ''}` : ''}${unlockedHidden(sh.id).map(x => `<div class="hidden-line"><span class="label">${esc(x.label)}</span>${esc(x.text)}</div>`).join('')}`;
  } else if (sh.type === 'verify') {
    h = `<h2>查證</h2><p class="small muted">去找人問一問，會花掉兩個小時。對方會等你，但第三方也有自己的立場。</p>` + verifyList().map(v => `<button class="opt" data-act="verifyw" data-id="${v.who}" ${v.used || (v.cost && S.stones < v.cost) ? 'disabled' : ''}><b>${esc(NP[v.who].name)}</b><span>${esc(NP[v.who].role)}${v.cost ? `　·　${v.cost} 靈石` : '　·　不收錢'}${v.used ? '　·　問過了' : ''}</span></button>`).join('');
  } else if (sh.type === 'decide') {
    h = `<h2>處置</h2>` + encOptions().map(o => `<button class="opt ${o.key === 'expose' || o.key === 'report' ? 'danger' : ''}" data-act="decide" data-k="${o.key}" ${o.disabled ? 'disabled' : ''}><b>${esc(o.label)}</b><span>${esc(o.desc || '')}</span></button>`).join('');
  } else if (sh.type === 'askbai') {
    const ps = Object.keys(S.met).filter(n => NP[n] && !NP[n].oneoff && n !== 'bai').concat(['bai']);
    h = `<h2>問白姐</h2><p class="small muted">每問一個人 ${PL.tea.askCost} 塊靈石。</p>` + ps.map(n => `<button class="opt" data-act="baiwho" data-id="${n}"><b>${esc(NP[n].name)}</b><span>${esc(NP[n].role)}</span></button>`).join('');
  } else if (sh.type === 'turnxc') {
    const lot = S.lots.find(l => l.item === 'xuechan');
    h = `<h2>周警員問：「從哪收的？」</h2>` + (lot && lot.flags.includes('entrusted') ? `<button class="opt" data-act="turnxcw" data-v="entrust"><b>「阿蘅託我交的。」</b><span>獎金分她一半</span></button>` : `<button class="opt danger" data-act="turnxcw" data-v="aheng"><b>「採藥的阿蘅。」</b><span>說實話</span></button><button class="opt" data-act="turnxcw" data-v="other"><b>「一個路過的人。」</b><span>他不一定信</span></button>`);
  } else if (sh.type === 'stall') {
    const ls = S.lots.filter(l => IT[l.item].base && (IT[l.item].sell || []).includes('walk') && !l.flags.some(f => ['sect', 'sting', 'contraband'].includes(f)));
    const pick = UI.stallPick || [];
    h = `<h2>擺攤</h2><p class="small muted">最多三批。照今日市價九五折賣出，成色差的貨，第二天可能有人回來退。</p>` + (ls.length ? ls.map(l => `<label class="check" style="margin-top:8px"><input type="checkbox" data-stall="${l.id}" ${pick.includes(l.id) ? 'checked' : ''} ${!pick.includes(l.id) && pick.length >= 3 ? 'disabled' : ''}><span>${esc(l.label)} × ${l.qty}<br><span class="small muted">約 ${fmt(rp(price(l.item) * 0.95) * l.qty)} 靈石</span></span></label>`).join('') + `<button class="btn primary wide" style="margin-top:12px" data-act="stallgo" ${pick.length ? '' : 'disabled'}>擺出去</button>` : '<p class="muted">沒有可以擺的貨。</p>');
  } else if (sh.type === 'sellintel') {
    const ids = Object.keys(S.intel).filter(i => IN[i]).map(i => ({ i, o: intelOffer(i) })).sort((a, b) => b.o.price - a.o.price);
    h = `<h2>賣消息給白姐</h2><p class="small muted">今天還收 ${2 - (S.baiSold[S.day] || 0)} 則。</p>` + (ids.length ? ids.map(({ i, o }) => `<button class="opt" data-act="sellintel" data-id="${i}" ${o.price || o.refuse ? '' : 'disabled'}><b>${esc(IN[i].short)}</b><span class="it">${esc(IN[i].text)}</span><span>${o.price ? `白姐出 <b class="gold">${o.price}</b> 靈石` : esc(o.why)}</span></button>`).join('') : '<p class="muted" style="margin-top:8px">消息簿裡還沒有能賣的東西。</p>');
  } else if (sh.type === 'accuse') {
    const a = ACC.find(x => x.id === sh.id), had = evidenceHad(a);
    h = `<h2>${esc(a.label)}</h2><p class="small muted" style="margin-top:6px">你手上的證據：</p>${had.length ? `<ul class="evid">${had.map(ev => `<li>${esc(ev.text)}</li>`).join('')}</ul>` : '<p class="small" style="margin-top:4px">什麼都沒有。</p>'}<p class="small muted" style="margin-top:8px">告了就收不回來。</p><button class="opt danger" data-act="accusego" data-id="${a.id}"><b>去告</b><span>周警員會聽你說完</span></button>`;
  } else if (sh.type === 'stat') {
    const T = { saw: '看穿', fooled: '吃虧', wronged: '錯怪好人' }, TL = M.truthLabels;
    const list = (S.statLog || []).filter(x => x.kind === sh.id && true);
    h = `<h2>${T[sh.id]}</h2>` + (list.length ? list.map(x => { const d = DEALS[x.deal], t = d.truth; return `<div class="card" style="margin-top:10px"><b class="serif">${esc(NP[d.npc].name + '：' + d.title)}</b><div class="t3" style="margin:6px 0">${['goods', 'origin', 'intent'].map(k => `<span class="pill ${k === 'intent' && t.intent !== 'plain' ? 'cin' : ''}">${esc(TL[k][t[k]])}</span>`).join(' ')}</div><p class="small">${esc(M.dayNames[x.day - 1])}，你選了「${esc(labelOf(x.deal, x.key))}」。${S.flags['won_' + x.deal] ? '後來到管理處告成了，這筆不算吃虧。' : ''}</p>${d.lesson ? `<p class="serif" style="margin-top:6px;line-height:1.85">${esc(d.lesson)}</p>` : ''}</div>`; }).join('') : '<p class="muted">沒有紀錄。</p>');
  } else if (sh.type === 'deaths') {
    const book = store.get(DEATH_KEY) || {}; const cats = {};
    for (const [id, d] of Object.entries(DEATHS)) (cats[d.cat] = cats[d.cat] || []).push([id, d]);
    h = `<h2>死法圖鑑 ${Object.keys(book).filter(k => DEATHS[k]).length}/${Object.keys(DEATHS).length}</h2><p class="small muted">死過一次，這裡就會記下來。換一局也不會忘。</p>` + Object.entries(cats).map(([c, list]) => `<h3 class="sec-h">${ic(DCAT[c] || 'death_explore', 'dcat')} ${esc(c)}</h3>` + list.filter(([id]) => book[id]).map(([id, d]) => `<div class="card" style="margin-top:6px"><b class="serif">${esc(d.title)}</b>${book[id].n > 1 ? `<span class="small muted">　×${book[id].n}</span>` : ''}<p class="small muted" style="margin-top:4px">${esc(d.hint || '')}</p></div>`).join('') + (list.some(([id]) => !book[id]) ? `<div class="locks">${list.filter(([id]) => !book[id]).map(() => '<span>？</span>').join('')}</div>` : '')).join('');
  } else if (sh.type === 'ach') {
    const book = achBook(), BN = SH.bonuses || {};
    h = `<h2>成就 ${Object.keys(book).length}/${(SH.achievements || []).length}</h2><p class="small muted">每個成就會解鎖一個開張加成。每局能帶 ${bonusPicks()} 個（成就越多，能帶越多，最多四個）。</p>` + (SH.achievements || []).map(a => `<div class="card${book[a.id] ? '' : ' dim'}" style="margin-top:6px"><b class="serif">${book[a.id] ? esc(a.title) : '？？？'}</b><p class="small ${book[a.id] ? '' : 'muted'}">${esc(book[a.id] ? a.desc : (a.hint || a.desc))}</p><p class="small jade">→ ${esc((BN[a.bonus] || {}).name || '')}</p></div>`).join('');
  } else if (sh.type === 'setup') {
    const un = unlockedBonuses(), BN = SH.bonuses || {}, pick = UI.setupPick || [], max = bonusPicks();
    h = `<h2>重新開張</h2>${S && S.phase !== 'end' && !S.dead ? '<p class="small cin">這一局會清掉（成就和死法圖鑑會留著）。</p>' : ''}` + (un.length ? `<p class="small muted">從成就解鎖的加成裡，挑 ${max} 個帶進新的一局。</p>` + un.map(id => `<button class="opt${pick.includes(id) ? ' on' : ''}" data-act="bpick" data-id="${id}" ${!pick.includes(id) && pick.length >= max ? 'disabled' : ''}><b>${pick.includes(id) ? '✓ ' : ''}${esc(BN[id].name)}</b><span>${esc(BN[id].desc)}</span></button>`).join('') : '<p class="small muted">還沒有解鎖任何加成。死幾次、走深一點、把店做大，成就會帶給你下一局的好處。</p>') + `<button class="btn primary wide" style="margin-top:12px" data-act="new">開張${pick.length ? `（帶 ${pick.length} 個加成）` : ''}</button>`;
  } else if (sh.type === 'menu') {
    h = `<h2>選單</h2>${sh.confirm ? `<p class="small">重新開始會清掉這一局。確定嗎？</p><button class="opt danger" data-act="new"><b>確定，重新開始</b><span>這一局會消失</span></button>` : `<button class="opt" data-act="home"><b>回到封面</b><span>進度會保留</span></button><button class="opt" data-act="setup"><b>重新開張</b><span>清掉這一局，挑加成</span></button><button class="opt" data-act="achsheet"><b>成就</b><span>解鎖下一局的加成</span></button><button class="opt" data-act="deathsheet"><b>死法圖鑑</b><span>你死過的方式</span></button>`}`;
  }
  $sheet.hidden = false;
  const fresh = UI.sheetOpen !== sh.type; UI.sheetOpen = sh.type;
  $sheet.innerHTML = `<div class="veil${fresh ? ' fresh' : ''}" data-act="closesheet"><div class="sheet" role="dialog" aria-modal="true" data-stop="1">${h}<button class="btn ghost wide" style="margin-top:10px" data-act="closesheet">關上</button></div></div>`;
}

function renderBar() {
  let h = '';
  const nav = () => `<nav class="nav">${[['main', '店面', '今天'], ['shop', '店務', '方針'], ['threads', '謎題', newThread() ? '有新的' : '線索'], ['store', '庫房', '貨'], ['intel', '消息', newIntel() ? '有新的' : '簿'], ['people', '人脈', '名聲']].map(([k, a, b]) => `<button data-act="tab" data-v="${k}" class="${UI.tab === k ? 'on' : ''}${(k === 'intel' && newIntel()) || (k === 'threads' && newThread()) ? ' new' : ''}" aria-label="${a}・${b}">${ic(k)}<span>${a}</span></button>`).join('')}</nav>`;
  if (UI.view === 'title' || S.phase === 'dead') { $bar.hidden = true; return; }
  if (UI.tab !== 'main') h = nav();
  else if (S.phase === 'morning') { const pend = S.cards.some(c => c.choices); h = `<button class="btn primary wide" data-act="open" ${pend ? 'disabled' : ''}>${pend ? '先處理卡片上的事' : '開門'}</button>` + nav(); }
  else if (S.phase === 'enc') {
    const e = S.enc;
    if (e.done) h = `<button class="btn primary wide" data-act="close">繼續</button>`;
    else h = `<div class="decide"><button class="btn quiet col" data-act="appraise" ${canAct('appraise') ? '' : 'disabled'}>自己看一眼<span class="sub">眼力 ${S.spirit}</span></button><button class="btn quiet col" data-act="later">先放著<span class="sub">回店面</span></button></div>`;
  } else if (S.phase === 'place' && S.place) {
    const ex = PL[S.place.id].type === 'explore' && S.place.steps, risk = ex ? ascentRisk() : 0;
    const dc = dropCands().length && S.burden > 0;
    const free = !S.place.steps && !S.place.did && !S.place.watched;
    h = (dc ? `<button class="btn quiet wide" style="margin-bottom:6px" data-act="drop">把最重的留下<span class="sub">留下這趟撿到最值錢的一樣，負擔減一半。下次來還在</span></button>` : '') + `<button class="btn ${risk > 0 ? 'danger' : 'primary'} wide" data-act="leave">${S.place.strain ? '慢慢走回聚落（多花一個時段）' : PL[S.place.id].type === 'explore' ? (free ? '轉身回聚落' : (UI.confirm === 'leave' ? '再按一次：' : '') + '往上爬，回聚落') : '離開' + esc(PL[S.place.id].name)}${risk > 0 && S.place.steps ? `<span class="sub">負擔超過上限，${riskWord(risk)}${relicEff().some(([, e]) => e.warn) ? '（' + chanceWord(risk) + '會上不來）' : ''}</span>` : free ? '<span class="sub">什麼都還沒做，不花時間</span>' : ''}</button>` + nav();
  }
  else if (S.phase === 'night') h = `<button class="btn primary wide" data-act="sleep">${S.day >= DAYS() ? (MD().lastNight || '就寢') : '就寢'}</button>` + nav();
  else if (S.phase === 'day') h = (S.slot >= 3 ? `<button class="btn primary wide" data-act="evening">打烊，看日報</button>` : `<button class="btn quiet wide${UI.confirm === 'evening' ? ' confirm' : ''}" data-act="evening">${UI.confirm === 'evening' ? '再按一次：直接打烊' : '今天不出門了，直接打烊'}</button>`) + nav();
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
  else if (S.dead || S.phase === 'dead') { S.phase = 'dead'; h = renderDead(); }
  else if (UI.tab === 'store') h = renderStore();
  else if (UI.tab === 'shop') h = renderShop();
  else if (UI.tab === 'threads') h = renderThreads();
  else if (UI.tab === 'people') h = renderPeople();
  else if (UI.tab === 'intel') h = renderIntel();
  else if (UI.tab === 'codex') h = renderCodex();
  else if (S.phase === 'morning') h = renderMorning();
  else if (S.phase === 'day') h = renderHub();
  else if (S.phase === 'enc') h = renderEnc();
  else if (S.phase === 'place') { if (S.place) h = renderPlace(); else { S.phase = 'day'; h = renderHub(); } }
  else if (S.phase === 'night') h = renderNight();
  else if (S.phase === 'end') h = renderEnd();
  const sc = sceneOf(), B = document.body, changed = sc.key !== UI.sceneKey;
  B.dataset.scene = sc.scene; B.dataset.depth = sc.depth;
  $app.innerHTML = h;
  if (changed && !reduceMotion()) { $app.classList.remove('enter'); void $app.offsetWidth; $app.classList.add('enter'); }
  if (changed && sc.scene === 'night') countUp($app);
  UI.sceneKey = sc.key;
  renderBar(); renderSheet();
  if (UI.achToast) { if (!(S && S.dead)) UI.toast = '解鎖成就：' + UI.achToast.join('、') + (UI.toast ? '　' + UI.toast : ''); UI.achToast = null; }
  if (UI.toast) { const ach = UI.toast.startsWith('解鎖成就'); document.querySelectorAll('.toast').forEach(x => x.remove()); const t = document.createElement('div'); t.className = 'toast' + (ach ? ' ach' : ''); t.setAttribute('role', 'status'); if (ach) t.innerHTML = ic('seal') + `<span>${esc(UI.toast)}</span>`; else t.textContent = UI.toast; document.body.appendChild(t); UI.toast = null; const life = ach ? 2800 : 1900; setTimeout(() => t.classList.add('out'), life - 260); setTimeout(() => t.remove(), life); }
}
function toast(t) { UI.toast = t; }
function save() { if (S) { if (S.phase !== 'end') scanLearn(); store.set(SAVE_KEY, S); } }
function commit(scroll) {
  save(); render();
  if (scroll === 'top') window.scrollTo(0, 0);
  if (scroll === 'thread') { const th = document.getElementById('thread'); if (th && th.lastElementChild) th.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

/* ================= events ================= */
function sureDeath(fx) { const d = fx && fx.death; if (!d) return false; const dd = typeof d === 'string' ? { id: d } : d; if (dd.unless && needOk(dd.unless)) return false; return (dd.chance == null ? 1 : dd.chance) * protectMult(dd.id) >= 0.5; }
const VIEW_ACTS = ['leave', 'lore', 'tab', 'codextab', 'intelsheet', 'stall', 'deathsheet', 'achsheet', 'close', 'sheet', 'pick', 'tag', 'carry', 'askbai', 'watch', 'drop', 'pickback', 'deposit'];
function onAct(a, el) {
  const id = el.dataset.id;
  if (UI.confirm && !['evening', 'explore', 'dchoice', 'leave', 'shopsell'].includes(a)) UI.confirm = null;
  if (S && S.place && S.phase === 'place' && !VIEW_ACTS.includes(a)) S.place.did = true;
  switch (a) {
    case 'new': S = newGame((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, UI.setupPick || []); UI.setupPick = []; UI.view = 'game'; UI.tab = 'main'; UI.sheet = null; commit('top'); break;
    case 'setup': UI.setupPick = (S && S.bonuses || []).filter(b => unlockedBonuses().includes(b)).slice(0, bonusPicks()); UI.sheet = { type: 'setup' }; UI.view = UI.view; render(); break;
    case 'bpick': { const p = UI.setupPick || []; UI.setupPick = p.includes(id) ? p.filter(x => x !== id) : p.length < bonusPicks() ? [...p, id] : p; renderSheet(); break; }
    case 'achsheet': UI.sheet = { type: 'ach' }; render(); break;
    case 'deathsheet': UI.sheet = { type: 'deaths' }; render(); break;
    case 'restore': if (ckptRestore(el.dataset.v)) { toast('回到' + (S.day ? monthLabel(MON()) + (M.dayNames[S.day - 1] || '') : '') + '早上。'); } commit('top'); break;
    case 'inter': openInterrupt(id); commit('top'); break;
    case 'later': S.enc = null; S.phase = 'day'; commit('top'); break;
    case 'pol': S.shop.pol[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'sign') S.stance = el.dataset.v; commit(); break;
    case 'cat': S.shop.pol.cats[el.dataset.k] = !S.shop.pol.cats[el.dataset.k]; commit(); break;
    case 'hire': hireStaff(id); checkAchieve(); commit(); break;
    case 'fire': fireStaff(id); commit(); break;
    case 'upg': buyUpg(id); checkAchieve(); commit(); break;
    case 'gear': buyGear(id); commit(); break;
    case 'sellall': { let n = 0; for (const l of [...S.lots]) if (shopSellable(l) && IT[l.item].cat !== 'relic') { shopSellLot(l.id); n++; } if (n) toast(`交給店裡賣了 ${n} 批貨。舊物留著，拿去舊物室研究比較值得。`); commit(); break; }
    case 'codextab': UI.tab = 'codex'; commit('top'); break;
    case 'shopsell': { const l = lotById(+id); if (l && IT[l.item].eff && UI.confirm !== 'ss:' + id) { UI.confirm = 'ss:' + id; toast('賣掉，「' + IT[l.item].name + '」的效果就沒了。再按一次才賣。'); render(); break; } UI.confirm = null; shopSellLot(+id); commit(); break; }
    case 'continue': UI.view = 'game'; render(); window.scrollTo(0, 0); break;
    case 'home': UI.view = 'title'; UI.sheet = null; render(); window.scrollTo(0, 0); break;
    case 'menu': UI.sheet = { type: 'menu' }; render(); break;
    case 'askrestart': UI.sheet = { type: 'menu', confirm: true }; render(); break;
    case 'closesheet': UI.sheet = null; render(); break;
    case 'tab': UI.tab = el.dataset.v; if (UI.tab === 'intel') S.intelSeenN = Object.keys(S.intel).length; if (UI.tab === 'threads') S.threadSeen = threadDone(); commit('top'); break;
    case 'stance': S.stance = el.dataset.v; commit(); break;
    case 'open': openShop(); commit('top'); break;
    case 'shop': { const d = nextShopDeal(); if (d) startDeal(d.id, 'shop'); else startWalkin(); commit('top'); break; }
    case 'enter': enterPlace(id); commit('top'); break;
    case 'leave': { const r = S.place && S.place.steps && PL[S.place.id].type === 'explore' ? ascentRisk() : 0; const wr = r > 0 && S.flags.ascent_grace ? relicEff().find(([, e]) => e.warn) : null; if (wr && UI.confirm !== 'leave') { UI.confirm = 'leave'; S.relicLog = (S.relicLog || []).concat([{ id: wr[0], k: 'warn' }]); toast(wr[1].warn + '（' + chanceWord(r) + '會上不來）再按一次，就真的往上爬。'); render(); break; } UI.confirm = null; leavePlace(); commit('top'); break; }
    case 'watch': watchPlace(); commit(); break;
    case 'drop': dropHeavy(); commit(); break;
    case 'pickback': pickBack(); commit(); break;
    case 'deposit': deposit(+id); commit(); break;
    case 'carry': toggleCarry(id); commit(); break;
    case 'exploresafe': explore(id, true); commit(); break;
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
    case 'sbuy': { const c = (PL.smith.sells || []).find(x => x.item === id), pr = rp(price(id) * c.mult) * c.lot; S.smithBought = S.smithBought || {}; if ((S.smithBought[S.day] || 0) >= 2) { toast('鐵師傅：「今天就這麼多了。」'); commit(); break; } if (S.stones >= pr) { S.smithBought[S.day] = (S.smithBought[S.day] || 0) + 1; S.stones -= pr; addLot({ item: id, qty: c.lot, cost: rp(price(id) * c.mult), known: true, label: c.label || IT[id].name }); toast(`向鐵師傅買了${cnNum(c.lot)}${IT[id].unit}${IT[id].name}`); } commit(); break; }
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
    case 'explore': { const sp = spotList(S.place.id).find(x => x.id === id); const wr = warnRelic(sp && sp.fx); if ((sureDeath(sp && sp.fx) || wr) && UI.confirm !== 'sp:' + id) { UI.confirm = 'sp:' + id; if (wr) S.relicLog = (S.relicLog || []).concat([{ id: wr[0], k: 'warn' }]); toast((wr ? warnText(wr, sp && sp.fx) + ' ' : '你有一種很不好的預感。') + '再按一次，就真的去做。'); render(); break; } UI.confirm = null; explore(id); commit(); break; }
    case 'relicuse': { if (useRelic(id)) commit(); else render(); break; }
    case 'dchoice': { const c = S.cards[+id], e = c && ALLEV[c.drift], o = e && (e.choices || []).filter(x => needOk(x.need || {}))[+el.dataset.v]; const key = 'dc:' + id + ':' + el.dataset.v; const wr = warnRelic(o && o.fx); if ((sureDeath(o && o.fx) || wr) && UI.confirm !== key) { UI.confirm = key; if (wr) S.relicLog = (S.relicLog || []).concat([{ id: wr[0], k: 'warn' }]); toast((wr ? warnText(wr, o && o.fx) + ' ' : '你有一種很不好的預感。') + '再按一次，就真的去做。'); render(); break; } UI.confirm = null; driftChoose(+id, +el.dataset.v); commit(); break; }
    case 'lin': linAct(el.dataset.k, +id); commit(); break;
    case 'redeem': redeem(); commit(); break;
    case 'stall': UI.stallPick = []; UI.sheet = { type: 'stall' }; render(); break;
    case 'stallgo': marketStall(UI.stallPick || []); UI.sheet = null; commit(); break;
    case 'lotapp': appraiseLot(+id); commit(); break;
    case 'tag': S.tags[id] = el.dataset.v; commit(); break;
    case 'evening': if (S.slot < 3 && UI.confirm !== 'evening') { UI.confirm = 'evening'; toast('還有時段沒用完。再按一次，就直接打烊。'); render(); break; } UI.confirm = null; goNight(); commit('top'); break;
    case 'meditate': meditate(UI.night.invest, UI.night.burn, UI.night.pill); UI.night = { invest: 0, burn: false, pill: false }; commit('top'); break;
    case 'sleep': endDay(); commit('top'); break;
    case 'nextmonth': nextMonth(); UI.tab = 'main'; commit('top'); break;
  }
}
function marketStall(ids) {
  let total = 0;
  for (const id of ids.slice(0, 3)) { const l = lotById(id); if (!l) continue; const unit = rp(price(l.item) * 0.95); total += unit * l.qty; if (l.q < 0.7) scheduleComplaint(l, l.qty, unit); S.lots = S.lots.filter(x => x !== l); }
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
  if (t.dataset && t.dataset.note) { S.notes[t.dataset.note] = t.value; save(); }
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
  if (data && data.S) { S = data.S; UI.view = data.view || 'game'; UI.tab = data.tab || 'main'; }
  else { const saved = store.get(SAVE_KEY); S = saved && saved.v === 1 ? migrate(saved) : null; UI.view = 'title'; }
  if (S) migrate(S);
  render();
}
window.claude?.hot?.snapshot?.(() => ({ S, view: UI.view, tab: UI.tab }));
window.__fs = { redeemCost, pawnMult, relicReactions, watchPlace, dropHeavy, dropCands, pickBack, toggleCarry, syncCarry, isCarryRelic, autoBiz, interruptsAll, lethalLeft, firstVisit, isLethal, spotOk, spotOk0, threadMemSave, deposit, isStoryDeal, shopFlavor, CARRY_N, useRelic, relicUseState, scaleEff, protectMult, deathChance, redeem, applyFx, heldRelics, relicEff, warnRelic, held, IT,  ALLEV, spotList, shopSellLot, shopSellable, die, goNight, shopDay, shopStats, hireStaff, fireStaff, buyUpg, buyGear, interruptsAvail, openInterrupt, ckptRestore, ckptInfo, ckptSave, burdenLimit, ascentRisk, achBook, unlockedBonuses, bonusPicks, threadState, checkAchieve, gearStats, spotBurden, DEATHS, THREADS, SH, PFX, explore, spotsAvail, linAct, EXPLORE, needOk, placeOpen, driftChoose, relicLots, newGame, startDeal, startWalkin, actAsk, actPress, actSilence, actHaggle, actAppraise, actVerify, decide, closeEnc, enterPlace, leavePlace, advanceSlot, meditate, endDay, beginDay, openShop, nextShopDeal, encOptions, canAct, verifyList, sellToSmith, sellToHuichun, buyFromHuichun, turnIn, marketStall, nextMonth, gradeOf, scoreTotal, stallsToday, stallDeal, dealAvail, netWorth, price, held, render, onAct, sellAtTea, sellIntel, intelOffer, accuse, accuseList, evidenceHad, appraiseLot, visitHome, askBai, overhear, buyTea, scanLearn, IN,
  get S() { return S; }, set S(v) { S = v; }, UI, D, DEALS, NP, IT };
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
