(() => {
'use strict';
/* ================================================================
   坊市掌櫃・卡片版
   一局十八個月；一次一張卡；選錯會死；死了回到這個月開頭。
   舊內容（交易、散事、店裡事件、地點、遺物、死法）在這裡轉成卡片。
   ================================================================ */
const D = __GAME_DATA__;
const C = D.cards, M = D.meta, IT = D.items, NP = D.npcs, PL = D.places, DEATHS = D.deaths, PFX = D.placeFx || {};
const SH = D.shop || {}, THREADS = D.threads || [];
const MONTHS = C.months, LAST = MONTHS.length;           // 21 張膠囊：17 個月＋結霜四天
const FROST0 = MONTHS.findIndex(m => m.frost) + 1;         // 18
const DEALS = {}; D.deals.forEach(d => { DEALS[d.id] = d; });
const EV = {}; (D.events.drift || []).forEach(e => { EV[e.id] = { ...e, _k: 'drift' }; }); (SH.events || []).forEach(e => { EV[e.id] = { ...e, _k: 'shop' }; });
const SPOTS = {}; const SPOT_PLACE = {};
for (const [pid, p] of Object.entries(PL)) if (p && typeof p === 'object' && !Array.isArray(p)) for (const s of (p.spots || [])) { SPOTS[s.id] = s; SPOT_PLACE[s.id] = pid; }
const TOWN = ['tea', 'school', 'homes', 'office', 'pawn'];
const FAR = ['ruin', 'tunnel', 'reservoir', 'cliff', 'north', 'stair', 'lampst', 'platform'];
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const lvName = n => n <= 9 ? `吐納${CN[n]}層` : (['築基初期', '築基中期', '築基後期', '金丹初期', '金丹中期', '金丹後期', '元嬰初期', '元嬰中期', '元嬰後期'][n - 10] || '深不可測');
const SAVE = 'fs-card-save-v1', CKPT = 'fs-card-ckpt-v1', BOOK = 'fs-card-book-v1';
const LETTERS = 'ABCDEFGH';

/* ---------------- 小工具 ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }
const R = key => hash(S.seed + ':' + key);                                  // 固定：同一局同一個月重來，抽到的卡一樣
const RL = key => hash(S.seed + ':' + key + ':try' + S.tries + ':' + (S.rolls = (S.rolls || 0) + 1)); // 生死骰：重來會不一樣
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 存不了就算了 */ } };
const pct = p => { const n = Math.round(p * 10); return n >= 10 ? '幾乎一定' : n <= 0 ? '不到一成' : `大概${CN[n]}成`; };

let S = null;                       // 目前這一局
let BK = load(BOOK, { deaths: {}, endings: {}, remember: {}, runs: 0, best: 0 });
let UI = { sheet: null, armed: null, paused: false };
let PREF = load('fs-card-pref-v1', { sound: true, voice: false });
const savePref = () => store('fs-card-pref-v1', PREF);

/* ---------------- 時間：舊內容的月份與天數，攤到十八個月上 ---------------- */
const cmonthOf = st => st >= FROST0 ? 3 : st >= C.spans[2][0] ? 2 : 1;
function stageWindow(cm, days) {
  if (cm === 3) { const [a, b] = days || [1, 4]; return [FROST0 - 1 + a, FROST0 - 1 + Math.min(b, 4)]; }
  const [s, e] = C.spans[cm]; const n = e - s + 1;
  const at = d => s + Math.floor((d - 1) * n / 6);
  if (!days) return [s, e];
  const lo = at(clamp(days[0], 1, 6)), hi = days[1] >= 6 ? e : Math.max(lo, at(days[1] + 1) - 1);
  return [lo, hi];
}
function windowsOf(x) {
  const ms = x.month === 'all' ? [1, 2] : x.month == null ? [1] : arr(x.month);
  return ms.map(m => [m, stageWindow(m, x.days)]);
}
const inWindow = (x, st) => windowsOf(x).some(([, [a, b]]) => st >= a && st <= b);
const windowEnd = (x, st) => { const w = windowsOf(x).find(([, [a, b]]) => st >= a && st <= b); return w ? w[1][1] : 99; };

/* ---------------- 狀態 ---------------- */
function fresh() {
  const st = C.start;
  return {
    v: 1, seed: Math.floor(Math.random() * 1e9).toString(36), stage: 1, tries: 0, rolls: 0,
    stones: st.stones, lifespan: st.lifespan, level: st.level, xp: st.xp, burden: st.burden,
    items: {}, flags: {}, done: {}, rel: {}, heat: 0, upg: [], gear: [], notes: [], pending: [], dueDebt: 0,
    stats: { seen: 0, fooled: 0, cards: 0, trips: 0, slack: 0 }, deathsThisRun: 0,
    clock: 420, slack: 0, slackLog: [],
    queue: [], card: null, trip: null, dead: null, ended: null, phase: 'title', runNo: (BK.runs || 0) + 1,
  };
}
function startItems() { for (const l of (M.startLots || [])) give(l.item, l.qty, true); }
const save = () => { if (S) store(SAVE, S); };
const snapshot = () => JSON.parse(JSON.stringify(S));

/* ---------------- 條件 ---------------- */
const has = (id, n = 1) => (S.items[id] || 0) >= n;
const flagOn = f => !!S.flags[f];
function needOk(n) {
  if (!n) return true;
  for (const [k, v] of Object.entries(n)) {
    switch (k) {
      case 'has': for (const [i, q] of Object.entries(v)) if (!has(i, q)) return false; break;
      case 'flag': if (!arr(v).every(flagOn)) return false; break;
      case 'not': if (arr(v).some(flagOn)) return false; break;
      case 'anyFlag': if (!arr(v).some(flagOn)) return false; break;
      case 'level': case 'realm': if (S.level < v) return false; break;
      case 'stones': if (S.stones < v) return false; break;
      case 'done': if (!arr(v).every(x => S.done[x])) return false; break;
      case 'doneAs': for (const [i, q] of Object.entries(v)) if (S.done[i] !== q) return false; break;
      case 'rel': for (const [p, q] of Object.entries(v)) if ((S.rel[p] || 0) < q) return false; break;
      case 'heatMin': if (S.heat < v) return false; break;
      case 'holdAny': if (!arr(v).some(i => has(i))) return false; break;
      case 'burdenHigh': if (S.burden < limit() - 1) return false; break;
      case 'month': if (!arr(v).includes(cmonthOf(S.stage))) return false; break;
      case 'minDays': if (S.stage < Math.min(v, 6)) return false; break;
      case 'upg': if (!S.upg.includes(v)) return false; break;
      case 'anyOf': if (!arr(v).some(needOk)) return false; break;
      case 'usedAgo': for (const i of Object.keys(v)) if (!S.flags['used_' + i]) return false; break;
      // 卡片版沒有夥計、方針、消息簿、鑑定這些系統
      case 'staff': case 'minHired': case 'pol': case 'net': case 'secMax': case 'appraised': case 'noticed': return false;
      case 'noStaff': case 'notIntel': break;
      default: break;
    }
  }
  return true;
}

/* ---------------- 數值 ---------------- */
const relics = () => Object.keys(S.items).filter(k => S.items[k] > 0 && IT[k] && IT[k].eff);
const effOf = id => (IT[id] && IT[id].eff) || {};
const gearFx = () => S.gear.map(g => (SH.gear[g] || {}).fx || {});
function limit() { return 5 + 2 * (S.level - 4) + gearFx().reduce((a, f) => a + (f.limit || 0), 0); }
function steps() { return 2 + gearFx().reduce((a, f) => a + (f.steps || 0), 0); }
function traffic() {
  let t = S.upg.reduce((a, u) => a + (((SH.upgrades[u] || {}).fx || {}).traffic || 0), 0);
  for (const r of relics()) t += (effOf(r).passive || {}).traffic || 0;
  return t + (S.flags._traffic || 0);
}
function income() { return Math.round(58 + 12 * traffic() + (S.upg.includes('cart') ? 25 : 0) + (S.upg.includes('coldbox') ? 8 : 0) + (S.upg.includes('sign') ? 10 : 0)); }
function protectMult(deathId) {
  let m = 1;
  for (const f of gearFx()) if (f.protect && f.protect[deathId] != null) m *= f.protect[deathId];
  for (const r of relics()) { const c = effOf(r).carry || {}; if (c.protect && c.protect[deathId] != null) m *= c.protect[deathId]; if (c.protectAll) m *= c.protectAll; }
  return m;
}
function ascentMult(place) {
  let m = 1;
  for (const f of gearFx()) if (f.ascent) m *= f.ascent;
  for (const r of relics()) { const c = effOf(r).carry || {}; if (c.ascent) m *= c.ascent; }
  return m * protectMult((PFX[place] || {}).ascent);
}
const warnRelic = () => relics().find(r => effOf(r).warn);
const xpNeed = lv => (M.xpNeed || {})[lv] || 300;
function gainXp(n) { S.xp += n; let up = 0; while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; up++; } return up; }
function give(id, q = 1, silent) { S.items[id] = (S.items[id] || 0) + q; return silent ? null : `得到「${(IT[id] || {}).name || id}」`; }
function take(id, q = 1) { const had = S.items[id] || 0; S.items[id] = Math.max(0, had - q); if (!S.items[id]) delete S.items[id]; return had > 0 ? `少了「${(IT[id] || {}).name || id}」` : null; }
const youCall = npc => { const n = NP[npc]; return (n && n.call && (n.call.up || n.call.eq)) || '許老闆'; };
const sub = (t, npc) => String(t ?? '').replace(/〈你〉/g, youCall(npc));
const nm = id => (IT[id] || {}).name || id;

/* ---------------- 效果 ---------------- */
// 回傳 { notes:[], death: {id, ...} | null, saved: 文字 | null }
function applyFx(fx, ctx = {}) {
  const out = { notes: [], death: null, saved: null };
  if (!fx) return out;
  const n = s => s && out.notes.push(s);
  if (fx.stones) { S.stones += fx.stones; n(`靈石 ${fx.stones > 0 ? '＋' : '－'}${Math.abs(fx.stones)}`); }
  if (fx.lifespan) { S.lifespan += fx.lifespan; n(`壽命 ${fx.lifespan > 0 ? '＋' : '－'}${Math.abs(fx.lifespan)} 個月`); }
  if (fx.burden) { S.burden = Math.max(0, S.burden + fx.burden); n(`負擔 ${fx.burden > 0 ? '＋' : '－'}${Math.abs(fx.burden)}`); }
  if (fx.xp) { const up = gainXp(fx.xp); n(`身體適應 ＋${fx.xp}${up ? `，到了${lvName(S.level)}` : ''}`); }
  for (const f of arr(fx.flag)) S.flags[f] = true;
  if (fx.heat) S.heat += fx.heat;
  for (const [p, v] of Object.entries(fx.rel || {})) S.rel[p] = (S.rel[p] || 0) + v;
  for (const g of arr(fx.give)) n(give(g.item, g.qty || 1));
  for (const g of arr(fx.giveRelic)) n(give(typeof g === 'string' ? g : g.item, 1));
  for (const t of arr(fx.take)) n(take(typeof t === 'string' ? t : t.item, (t && t.qty) || 1));
  if (fx.traffic) S.flags._traffic = (S.flags._traffic || 0) + fx.traffic;
  if (fx.note) addNote(fx.note);
  if (fx.death) {
    const d = typeof fx.death === 'string' ? { id: fx.death } : fx.death;
    const r = rollDeath(d, ctx);
    if (r.dead) out.death = d; else if (r.saved) out.saved = r.saved;
  }
  if (!out.death && S.lifespan <= 0) out.death = { id: 'pawn_due' };
  return out;
}
function dangerOf(d) {
  if (!d) return 0;
  if (d.if && !needOk(d.if)) return 0;
  if (d.unless && needOk(d.unless)) return 0;
  return clamp((d.chance ?? 1) * protectMult(d.id), 0, 1);
}
function rollDeath(d, ctx) {
  if (d.if && !needOk(d.if)) return { dead: false, saved: null };
  if (d.unless && needOk(d.unless)) {
    const sv = (d.savedIf || []).find(x => needOk(x.need));
    return { dead: false, saved: sv ? sv.text : d.saved || null };
  }
  const base = d.chance ?? 1, p = dangerOf(d);
  if (RL('death:' + d.id + ':' + (ctx.key || '')) < p) return { dead: true };
  if (base >= 1 && p >= 1) return { dead: true };
  // 逃過了：誰救了你
  let who = null;
  if (p < base) for (const r of relics()) { const c = effOf(r).carry || {}; if ((c.protect && c.protect[d.id] != null) || c.protectAll) { who = effOf(r).saved; if (who) break; } }
  return { dead: false, saved: who || d.saved || (base < 1 ? '你差一點就回不來了。' : null) };
}
function addNote(t) { if (t && !S.notes.includes(t)) S.notes.push(t); }

/* ================================================================
   排一個月的卡
   ================================================================ */
function dealOk(d, st) {
  if (S.done[d.id] && !(d.repeatable && !S.flags['_deal_closed_' + d.id])) return false;
  if (!inWindow(d, st)) return false;
  if (d.repeatable && S.flags['_deal_seen_' + d.id] && st - S.flags['_deal_seen_' + d.id] < 3) return false;
  return needOk(d.need);
}
function evOk(e, st) {
  if (S.done[e.id]) return false;
  if (e._k === 'drift' && !inWindow(e, st)) return false;
  if (e._k === 'shop' && st >= FROST0) return false;
  return needOk(e.need);
}
function planStage(st) {
  const m = MONTHS[st - 1], q = [];
  if (st === 1 && !S.flags._intro) q.push({ t: 'intro' });
  q.push({ t: 'month' });
  const frost = m.frost;
  for (const l of (S.later || []).filter(l => l.at <= st)) q.push(l);
  S.later = (S.later || []).filter(l => l.at > st);
  // 交易（故事人物找上門）
  const deals = D.deals.filter(d => dealOk(d, st) && !(d.repeatable && R('rep:' + d.id + ':' + st) > 0.35))
    .sort((a, b) => (windowEnd(a, st) === st ? 1 : 0) - (windowEnd(b, st) === st ? 1 : 0) || (b.prio || 0) - (a.prio || 0) || R('d' + a.id) - R('d' + b.id));
  const urgent = deals.filter(d => windowEnd(d, st) === st);
  // 快過期的先排；沒有急件時一個月最多一件普通生意，少點連點
  const nDeals = frost ? deals.length : (urgent.length ? clamp(urgent.length, 1, 2) : (deals.length ? 1 : 0));
  const pickD = (urgent.length ? urgent.concat(deals.filter(d => !urgent.includes(d))) : deals).slice(0, nDeals);
  // 散事
  const drifts = Object.values(EV).filter(e => e._k === 'drift' && evOk(e, st) && (frost || R('dr:' + e.id + ':' + st) < (e.chance ?? 0.4)))
    .sort((a, b) => (b.prio || 0) - (a.prio || 0) || R('o' + a.id) - R('o' + b.id));
  const pickR = drifts.slice(0, frost ? 2 : (drifts[1] && (drifts[1].prio || 0) >= 5 ? 2 : 1));
  const shopEv = frost ? [] : Object.values(EV).filter(e => e._k === 'shop' && evOk(e, st) && R('se:' + e.id + ':' + st) < Math.min(0.5, e.chance ?? 0.3)).slice(0, 1);
  // 交錯放：店裡的事、散事
  const mix = [];
  while (pickD.length || pickR.length || shopEv.length) {
    if (pickD.length) mix.push({ t: 'deal', id: pickD.shift().id });
    if (pickR.length) mix.push({ t: 'ev', id: pickR.shift().id });
    if (shopEv.length && R('mx' + st) < 0.6) mix.push({ t: 'ev', id: shopEv.shift().id });
    else if (shopEv.length && !pickD.length && !pickR.length) mix.push({ t: 'ev', id: shopEv.shift().id });
  }
  // 結霜四天：故事照天數排
  if (frost) mix.sort((a, b) => (a.t === 'deal' ? (DEALS[a.id].prio || 0) : 0) - (b.t === 'deal' ? (DEALS[b.id].prio || 0) : 0));
  // 空檔插在中段：先處理一半店裡的事，出門一趟，再回來收尾
  const mid = Math.ceil(mix.length / 2);
  q.push(...mix.slice(0, mid));
  if (!frost || m.frost < 4) q.push({ t: 'out' });
  q.push(...mix.slice(mid));
  if (!frost && st % 3 === 2) q.push({ t: 'smith' });
  if (!frost && st % 3 === 1 && st > 1) q.push({ t: 'upgrade' });
  if (st < FROST0) q.push({ t: 'pawn' });
  if (m.dues) q.push({ t: 'dues', n: m.dues });
  return q;
}

/* ================================================================
   卡片產生
   card = { kind, id, key, title, where, scene, paras:[{t, cls}], opts:[{k,label,desc,info,danger,risk,disabled,why}], res:null }
   ================================================================ */
const P = (t, cls) => ({ t, cls });
function makeCard(spec) {
  switch (spec.t) {
    case 'intro': return introCard();
    case 'month': return monthCard();
    case 'deal': return dealCard(DEALS[spec.id]);
    case 'ev': return evCard(EV[spec.id]);
    case 'out': return outCard();
    case 'town': return pickPlaceCard('town');
    case 'far': return pickPlaceCard('far');
    case 'place': return placeCard(spec.id, spec.first);
    case 'ascent': return ascentCard(spec.id);
    case 'smith': return smithCard();
    case 'upgrade': return upgradeCard();
    case 'dues': return duesCard(spec.n);
    case 'pawn': return pawnCard();
    case 'ending': return endingCard();
    case 'raid': return raidCard(spec);
    default: return null;
  }
}
function introCard() {
  return { kind: 'intro', key: 'intro', title: '開張', where: '許家店', scene: 'shop', paras: [P(C.start.lede), P(C.start.ticket, 'ticket'), P(C.start.how, 'small')], opts: [{ k: 'go', label: '把鐵捲門拉起來' }] };
}
function monthCard() {
  const st = S.stage, m = MONTHS[st - 1], paras = [P(m.gap)];
  const notes = [];
  if (st > 1 && (!m.frost || m.frost === 1)) {
    S.lifespan -= 1;
    const inc = income(); S.stones += inc; notes.push(`店裡這個月進帳 ＋${inc} 靈石`);
    for (const p of S.pending.splice(0)) {
      S.stones += p.val; if (p.item && S.items[p.item]) take(p.item, p.qty);
      notes.push(p.val > 0 ? `上個月收的「${p.label}」賣掉了，回收 ${p.val} 靈石` : `上個月收的「${p.label}」一件也賣不出去`);
    }
    const rest = 3 + (S.upg.includes('quiet') ? 1 : 0) + relics().reduce((a, r) => a + ((effOf(r).passive || {}).rest || 0), 0);
    if (S.burden > 0) { const b0 = S.burden; S.burden = Math.max(0, S.burden - Math.max(1, rest)); if (b0 !== S.burden) notes.push(`身上的負擔退了一些（${b0} → ${S.burden}）`); }
    const up = gainXp(28 + (S.upg.includes('quiet') ? 12 : 0)); if (up) notes.push(`晚上靜坐，身體到了${lvName(S.level)}`);
    for (const r of relics()) { const nt = effOf(r).night; if (nt && R('night:' + r + ':' + st) < (nt.chance ?? 0.3)) { applyFx(nt.fx); notes.push(nt.text); } }
    notes.push(`長生當鋪的字條：尚餘 ${Math.max(0, S.lifespan)} 個月。`);
  }
  // 段落開頭（第二段、結霜）的卡片
  const cm = cmonthOf(st);
  if ((st === C.spans[2][0] || st === FROST0) && !S.flags['_ms' + cm]) {
    S.flags['_ms' + cm] = true;
    for (const e of ((D.events.monthStart || {})[cm] || [])) if (needOk(e.need) && R('ms:' + e.title + cm) < (e.chance ?? 1)) { paras.push(P(e.title, 'h')); paras.push(P(e.text)); if (e.fx) applyFx(e.fx); }
  }
  const card = { kind: 'month', key: 'month' + st, title: m.frost ? `結霜・第${CN[m.frost]}天` : `${m.name}`, where: m.frost ? '六月' : `第 ${st} 個月`, scene: m.frost ? 'frost' : 'shop', paras, opts: [{ k: 'go', label: '開門' }] };
  if (notes.length) card.paras.push(P(notes.join('\n'), 'ledger'));
  if (m.dues && S.stones + S.dueDebt * 0 < m.dues + S.dueDebt && BK.remember['dues:pawnpay']) {
    card.paras.push(P('你記得規費單。這個月最好先把錢留著，庫房裡能賣的也能應急。', 'small'));
  }
  if (S.lifespan <= 0) card.forceDeath = 'pawn_due';
  return card;
}
function dealCard(d) {
  if (!d || !needOk(d.need)) return null;
  const npc = NP[d.npc] || { name: '客人' };
  const where = d.where === 'market' ? '舊公路市集' : d.where === 'tea' ? '聽雨茶館' : d.where === 'herb' ? '回春藥行' : '許家店';
  const paras = [];
  if (d.intro) paras.push(P(sub(d.intro, d.npc)));
  paras.push(P(`${npc.name}：${sub(typeof d.open === 'object' ? d.open.a || d.open.narr : d.open, d.npc)}`, 'say'));
  for (const t of (d.tells || []).filter(t => t.after === 'open')) paras.push(P('你注意到：' + t.text, 'tell'));
  for (const a of (d.appraise || []).filter(a => (a.realm || 0) <= S.level)) paras.push(P('你自己看貨：' + a.text, 'tell'));
  const card = { kind: 'deal', id: d.id, key: 'deal:' + d.id, title: d.title, who: npc.name, role: npc.role, where, scene: d.where === 'market' ? 'town' : d.where === 'tea' ? 'tea' : 'shop', paras, opts: [], price: d.price, haggled: 0 };
  if (d.repeatable) S.flags['_deal_seen_' + d.id] = S.stage;
  dealOpts(card, d);
  return card;
}
function dealOpts(card, d) {
  const asked = card.asked || {};
  const info = [];
  if (d.ask && !asked.ask) info.push({ k: 'i:ask', info: true, label: '問：' + d.ask.q });
  (d.press || []).forEach((p, i) => { if (asked.ask && !asked['p' + i] && i < 2) info.push({ k: 'i:p' + i, info: true, label: '追問：' + p.q }); });
  if (d.silence && !asked.silence && asked.ask) info.push({ k: 'i:silence', info: true, label: '不說話，等他' });
  if ((d.haggle || []).length > card.haggled && d.side === 'sell') info.push({ k: 'i:haggle', info: true, label: '殺價' });
  (d.verify || []).forEach((v, i) => { if (!asked['v' + i] && i < 2) info.push({ k: 'i:v' + i, info: true, label: `去問${(NP[v.who] || {}).name || v.who}${v.cost ? `（${v.cost} 靈石）` : ''}`, disabled: v.cost && S.stones < v.cost }); });
  const o = [];
  const order = ['special', 'special2', 'deal', 'expose', 'report', 'refer', 'decline'];
  const keys = Object.keys(d.opts).sort((a, b) => (order.indexOf(a) + 1 || 9) - (order.indexOf(b) + 1 || 9));
  for (const k of keys) {
    const op = d.opts[k]; if (!op || typeof op !== 'object') continue;
    if (op.need && !needOk(op.need)) continue;
    let label = op.label || { deal: d.side === 'sell' ? '買下' : d.side === 'buy' ? '賣給他' : '答應', decline: '婉拒', expose: '當面點破', report: '去派出所報案', refer: '指去別家' }[k] || k;
    const x = { k, label };
    const qty = d.qty || 1, price = card.price ?? d.price;
    if (k === 'deal' && d.side === 'sell' && price) { const cost = Math.round(qty * price); x.desc = `付 ${cost} 靈石`; if (S.stones < cost) { x.disabled = true; x.why = '錢不夠'; } }
    if (k === 'deal' && d.side === 'buy' && price) { const got = Math.round(qty * price); x.desc = `收 ${got} 靈石，交出${qty > 1 ? ` ${qty} ${(IT[d.item] || {}).unit || '件'}` : ''}${nm(d.item)}`; if (!has(d.item, Math.min(qty, 1))) { x.disabled = true; x.why = '庫房裡沒有'; } }
    deathHint(x, op.fx, card.key + ':' + k);
    o.push(x);
  }
  // 決定在前、打聽在後：想快推可以直接選，想問清楚往下捲
  card.opts = o.concat(info);
}
function evCard(e) {
  if (!e || !needOk(e.need)) return null;
  const paras = [P(sub(e.text))];
  const card = { kind: 'ev', id: e.id, key: 'ev:' + e.id, title: e.title, where: e._k === 'shop' ? '許家店' : '這陣子', scene: e._k === 'shop' ? 'shop' : sceneForStage(), paras, opts: [] };
  const ch = (e.choices || []).filter(c => needOk(c.need));
  if (ch.length) ch.forEach((c, i) => { const x = { k: 'c' + (e.choices.indexOf(c)), label: c.label, desc: c.desc }; if (c.need && c.need.has) x.relic = Object.keys(c.need.has).map(nm).join('、'); deathHint(x, c.fx, card.key + ':' + x.k); card.opts.push(x); });
  else card.opts.push({ k: 'ok', label: '繼續', plain: true });
  return card;
}
function sceneForStage() { const m = MONTHS[S.stage - 1]; return m.frost ? 'frost' : 'town'; }
// 會死的選項：危險字、你記得、警示類遺物說幾成
function deathHint(x, fx, key) {
  const d = fx && fx.death ? (typeof fx.death === 'string' ? { id: fx.death } : fx.death) : null;
  const mem = BK.remember[key];
  if (mem && DEATHS[mem]) x.remember = DEATHS[mem].seal || DEATHS[mem].title;
  if (!d) return;
  const p = dangerOf(d);
  x.deadly = p > 0;
  if (p > 0 && warnRelic()) { x.risk = p; x.warn = effOf(warnRelic()).warn; }
}
/* ---------------- 沒管的事 ---------------- */
const SLACK_MAX = 4;
const SLACK_RE = /不管|不理|算了|先放|放著|不開|沒看到|裝作|假裝|裝沒|不去|關門|關上門|不要|走開|不回|別管|不收|不買|不答應|不說|躲|沒聽到|不接|不應|當沒|告辭|婉拒|拒絕|推掉|不碰|不動它|不出聲/;
function slackOf(c, o) {
  if (!c || !o || o.info) return false;
  if (o.slack != null) return !!o.slack;
  if (c.kind === 'deal') { const op = (DEALS[c.id].opts || {})[o.k] || {}; if (op.slack != null) return !!op.slack; return o.k === 'decline' || o.k === 'refer'; }
  if (c.kind === 'ev' && o.k[0] === 'c') { const ch = (EV[c.id].choices || [])[+o.k.slice(1)] || {}; if (ch.slack != null) return !!ch.slack; return SLACK_RE.test(ch.label || '') && !(ch.fx && ch.fx.death); }
  return false;
}
/* ---------------- 時鐘 ---------------- */
const hhmm = t => `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
const period = t => t < 420 ? '開門前' : t < 660 ? '上午' : t < 780 ? '中午' : t < 1020 ? '下午' : t < 1140 ? '傍晚' : '夜裡';
function setClock(card) {
  const k = card.kind, j = R('ck' + S.stage + ':' + S.stats.cards + ':' + k + ':' + (card.id || ''));
  if (k === 'month' || k === 'intro') S.clock = 400 + Math.floor(j * 35);
  else if (k === 'dues') S.clock = Math.max(S.clock + 10, 600 + Math.floor(j * 60));
  else if (k === 'out') S.clock = Math.max(S.clock + 15, 780 + Math.floor(j * 40));
  else if (k === 'pawn') S.clock = Math.max(S.clock + 15, 1080 + Math.floor(j * 50));
  else if (k === 'ending') S.clock += 5;
  else S.clock += 30 + Math.floor(j * (k === 'place' || k === 'ascent' || k === 'pick' ? 60 : 75));
  S.clock = Math.min(S.clock, 23 * 60 + 40);
  card.time = S.clock;
}
/* ---------------- 聲音、朗讀 ---------------- */
let AC = null;
function snd(kind) {
  if (!PREF.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
    const env = (type, f0, f1, vol, dur) => { o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.start(t); o.stop(t + dur + 0.02); };
    if (kind === 'tap') env('triangle', 660, 440, 0.05, 0.08);
    else if (kind === 'turn') env('sine', 320, 520, 0.035, 0.15);
    else if (kind === 'slack') env('sine', 392, 247, 0.05, 0.45);
    else if (kind === 'stamp') env('square', 120, 38, 0.16, 0.32);
  } catch (e) { /* 沒有聲音也能玩 */ }
}
function speak(text) {
  try {
    const ss = window.speechSynthesis; if (!ss || !text) return;
    ss.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ' ').slice(0, 900));
    u.lang = 'zh-TW'; u.rate = 1.05;
    const vs = ss.getVoices(); const v = vs.find(x => /zh[-_]TW/i.test(x.lang)) || vs.find(x => /^zh/i.test(x.lang)); if (v) u.voice = v;
    ss.speak(u);
  } catch (e) { /* 不支援就算了 */ }
}
const hush = () => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* */ } };
function cardSpeech(c, resOnly) {
  if (!c) return '';
  if (resOnly && c.res) return [c.res.stamp, c.res.text, c.res.slackLine && '這件事，沒有人管了。'].filter(Boolean).join('。');
  return [c.title, ...c.paras.map(p => p.t)].filter(Boolean).join('。');
}

function outCard() {
  const o = C.out;
  const opts = [{ k: 'town', label: o.town }, { k: 'far', label: o.far }, { k: 'stay', label: o.stay, desc: '負擔－2、身體適應＋8' }];
  return { kind: 'out', key: 'out', title: o.title, where: '許家店', scene: 'shop', paras: [P(o.text)], opts };
}
function placeOpen(pid) {
  const p = PL[pid]; if (!p) return false;
  const i = FAR.indexOf(pid);
  if (p.minLevel && S.level < p.minLevel) return false;
  if (p.reveal && !arr(p.reveal).some(flagOn)) return false;
  if (i >= 1 && i <= 2 && S.stage < 2 && !S.done.ru_edge) return false;
  if (pid === 'cliff' && !(S.flags._v_tunnel || S.flags._v_reservoir) && S.stage < 4) return false;
  return true;
}
function pickPlaceCard(kind) {
  const o = C.out, list = kind === 'town' ? TOWN : FAR;
  const opts = list.filter(placeOpen).filter(pid => availSpots(pid).length).map(pid => {
    const p = PL[pid], fx = PFX[pid] || {};
    return { k: 'go:' + pid, label: p.name, desc: kind === 'far' ? `${p.depth || ''}${fx.burden ? `・負擔＋${fx.burden}` : ''}` : (p.blurbShort || '') };
  });
  if (kind === 'far') { const locked = FAR.filter(pid => !placeOpen(pid) && PL[pid] && PL[pid].minLevel && (!PL[pid].reveal || arr(PL[pid].reveal).some(flagOn))); for (const pid of locked.slice(0, 1)) opts.push({ k: 'x', label: PL[pid].name, desc: `身體要到${lvName(PL[pid].minLevel)}`, disabled: true }); }
  opts.push({ k: 'back', label: o.back });
  return { kind: 'pick', key: 'pick:' + kind, title: kind === 'town' ? o.townTitle : o.farTitle, where: '這個月的空檔', scene: kind === 'town' ? 'town' : 'road', paras: [P(kind === 'town' ? o.townText : `${o.farText}\n現在身上的負擔 ${S.burden}／上限 ${limit()}。`)], opts };
}
function availSpots(pid) {
  const p = PL[pid]; if (!p) return [];
  const cm = cmonthOf(S.stage);
  return (p.spots || []).filter(s => {
    if (S.done[s.id] && !s.repeat) return false;
    if (s.repeat && S.flags['_rep_' + s.id] === S.stage) return false;
    if (s.after && !arr(s.after).every(a => S.done[a])) return false;
    if (s.months && !arr(s.months).includes(cm)) return false;
    if (s.need && !needOk(s.need)) return false;
    if (s.cost && S.stones < s.cost) return false;
    return true;
  });
}
function placeCard(pid, first) {
  const p = PL[pid], far = FAR.includes(pid);
  let sp = availSpots(pid);
  // 最多四個：沒去過的先、會出事的留一個、翻翻看留一個
  const fresh = sp.filter(s => !s.repeat), rep = sp.filter(s => s.repeat);
  const deadly = fresh.filter(s => s.fx && s.fx.death), safe = fresh.filter(s => !(s.fx && s.fx.death));
  const pick = [...safe.slice(0, 2), ...deadly.sort((a, b) => R('dk' + a.id) - R('dk' + b.id)).slice(0, safe.length ? 1 : 2), ...rep.slice(0, 1)];
  for (const s of safe.slice(2)) if (pick.length < 4) pick.splice(2, 0, s);
  const paras = [];
  if (first) { const bm = (p.blurbM || {})[cmonthOf(S.stage)]; paras.push(P(bm || p.blurb)); }
  else paras.push(P(S.trip && S.trip.left > 0 ? `還可以再看${CN[S.trip.left]}處。身上的負擔 ${S.burden}／上限 ${limit()}。` : ''));
  const opts = pick.map(s => {
    const x = { k: 'spot:' + s.id, label: s.title, desc: s.hint + (s.cost ? `（${s.cost} 靈石）` : '') + (s.strain ? '・會累' : '') };
    if (s.need && s.need.has) x.relic = Object.keys(s.need.has).map(nm).join('、');
    if (s.danger) x.danger = s.danger;
    deathHint(x, s.fx, 'spot:' + s.id);
    return x;
  });
  opts.push({ k: 'leave', label: far ? '往回走' : '回店裡' });
  return { kind: 'place', id: pid, key: 'place:' + pid, title: p.name, where: far ? (p.depth || '外面') : '聚落裡', scene: pid, paras: paras.filter(x => x.t), opts };
}
function ascentCard(pid) {
  const a = C.ascent, lim = limit(), over = S.burden - lim;
  const card = { kind: 'ascent', id: pid, key: 'asc:' + pid, title: a.title, where: PL[pid].name, scene: pid, paras: [], opts: [] };
  if (over <= 0) { card.paras.push(P(a.ok)); card.opts.push({ k: 'ok', label: '回到聚落', plain: true }); return card; }
  const risk = clamp((0.3 + 0.2 * (over - 1)) * ascentMult(pid), 0, 0.95);
  card.risk = risk;
  card.paras.push(P(`${a.heavy}\n負擔 ${S.burden}，你撐得住的只有 ${lim}。`));
  const x = { k: 'climb', label: a.climb, deadly: true, danger: over >= 3 ? '多半回不來。' : over >= 2 ? '不一定回得來。' : '會喘。' };
  const mem = BK.remember['asc:' + pid + ':climb']; if (mem) x.remember = (DEATHS[mem] || {}).seal;
  if (warnRelic()) { x.risk = risk; x.warn = effOf(warnRelic()).warn; }
  card.opts.push(x);
  const heavy = (S.trip && S.trip.got || []).filter(i => has(i) && !(IT[i] || {}).key).sort((x2, y) => ((IT[y] || {}).base || 0) - ((IT[x2] || {}).base || 0))[0];
  if (heavy) card.opts.push({ k: 'drop', label: a.drop.replace('{item}', nm(heavy)), desc: '負擔減半', item: heavy });
  for (const r of relics()) { const u = effOf(r).use; if (u && u.special === 'safeReturn') card.opts.push({ k: 'use:' + r, label: `${u.label}（${nm(r)}）`, desc: u.desc, relic: nm(r) }); }
  return card;
}
function smithCard() {
  const g = Object.entries(SH.gear || {}).filter(([k, v]) => !S.gear.includes(k) && needOk(v.need)).sort((a, b) => R('g' + a[0] + S.stage) - R('g' + b[0] + S.stage)).slice(0, 3);
  if (!g.length) return null;
  const opts = g.map(([k, v]) => ({ k: 'buy:' + k, label: `${v.name}（${v.cost} 靈石）`, desc: v.desc, disabled: S.stones < v.cost, why: '錢不夠' }));
  opts.push({ k: 'no', label: C.smith.leave });
  return { kind: 'smith', key: 'smith', title: C.smith.title, where: '舊公路邊', scene: 'town', paras: [P(C.smith.text)], opts };
}
function upgradeCard() {
  const u = Object.entries(SH.upgrades || {}).filter(([k, v]) => !S.upg.includes(k) && (!v.need || (v.need.upg ? S.upg.includes(v.need.upg) : true) && (!v.need.month || cmonthOf(S.stage) >= v.need.month))).sort((a, b) => a[1].cost - b[1].cost).slice(0, 3);
  if (!u.length || S.stones < u[0][1].cost) return null;
  const opts = u.map(([k, v]) => ({ k: 'up:' + k, label: `${v.name}（${v.cost} 靈石）`, desc: v.desc, disabled: S.stones < v.cost, why: '錢不夠' }));
  opts.push({ k: 'no', label: C.upgrade.leave });
  return { kind: 'upgrade', key: 'upgrade', title: C.upgrade.title, where: '許家店', scene: 'shop', paras: [P(C.upgrade.text + `\n現在每個月大約進帳 ${income()} 靈石。`)], opts };
}

function bagLiquidateValue() {
  let v = 0, lots = [];
  for (const p of (S.pending || [])) { v += Math.max(0, Math.round((p.val || 0) * 0.85)); lots.push({ kind: 'pending', p, val: Math.max(0, Math.round((p.val || 0) * 0.85)) }); }
  for (const [id, q] of Object.entries(S.items || {})) {
    const it = IT[id] || {};
    if (!q || it.key || it.eff) continue; // 遺物與關鍵物不抵規費
    const unit = Math.round(((it.base || 20) * 0.7));
    const val = unit * q;
    if (val > 0) { v += val; lots.push({ kind: 'item', id, q, val }); }
  }
  return { v, lots };
}
function liquidateFor(need) {
  const { lots } = bagLiquidateValue();
  lots.sort((a, b) => b.val - a.val);
  let got = 0, notes = [];
  for (const L of lots) {
    if (got >= need) break;
    if (L.kind === 'pending') {
      S.pending = S.pending.filter(x => x !== L.p);
      if (L.p.item && S.items[L.p.item]) take(L.p.item, L.p.qty);
      got += L.val; notes.push(`「${L.p.label}」趕著賣掉，換 ${L.val} 靈石`);
    } else {
      take(L.id, L.q); got += L.val; notes.push(`庫房「${nm(L.id)}」×${L.q} 抵 ${L.val} 靈石`);
    }
  }
  return { got, notes };
}
function duesCard(n0) {
  const n = Math.round(n0 + S.dueDebt * 1.15), dd = C.dues;
  const card = { kind: 'dues', key: 'dues', title: dd.title, where: '許家店', scene: 'shop', paras: [P(dd.text.replace('{n}', n))], opts: [], n };
  card.opts.push({ k: 'pay', label: dd.pay.replace('{n}', n), disabled: S.stones < n, why: '錢不夠' });
  if (!S.dueDebt) card.opts.push({ k: 'beg', label: dd.beg, desc: '下次多收三成' });
  else if (!S.flags._duesBeg2) card.opts.push({ k: 'beg2', label: '再求一次，下個月一定繳', desc: '下次收雙倍，最後一次', slack: true });
  if (S.stones < n) {
    const bag = bagLiquidateValue();
    if (bag.v > 0) {
      const need = n - S.stones;
      const cover = Math.min(bag.v, need);
      card.opts.push({ k: 'sellbag', label: cover >= need ? '把庫房趕著賣掉，湊規費' : `把能賣的先賣掉（約 ${cover} 靈石）`, desc: cover >= need ? `庫房約值 ${bag.v} 靈石，夠繳` : `還差 ${need - cover}，之後再想辦法`, safeMoney: true });
    }
    if (!S.flags._duesSplit) {
      const half = Math.ceil(n / 2);
      card.opts.push({ k: 'split', label: `先繳一半（${half}），其餘下月`, desc: '一次機會，下月照原額加一半，不再翻倍', disabled: S.stones < half, why: '連一半都湊不出來', safeMoney: true });
    }
    const needMore = n - S.stones;
    const months = Math.max(1, Math.ceil(needMore / C.pawn.gain));
    const gain = months * C.pawn.gain;
    const x = { k: 'pawnpay', label: months > 1 ? `去當鋪再押 ${months} 個月` : dd.pawnpay, desc: `壽命 －${months} 個月，靈石 ＋${gain}，再繳規費`, months, gain, deadly: S.lifespan - months < FROST0 - S.stage };
    if (x.deadly) x.danger = '剩下的日子，不夠走到結霜了。';
    if (BK.remember['dues:pawnpay']) x.remember = (DEATHS.pawn_due || {}).seal || '收當';
    card.opts.push(x);
    if (months > 2 || (x.deadly && bag.v + S.stones < n)) card.opts.push({ k: 'seal', label: '……', deadly: true, desc: dd.cant.replace('{n}', n) });
  }
  return card;
}
function pawnCard() {
  const need = FROST0 - S.stage, left = S.lifespan, pw = C.pawn;
  const margin = left - need;
  // 還夠撐：少出現。只剩一個月：半數出現。已經不夠：一定出現。
  if (margin > 2 && R('pawn' + S.stage) > 0.18) return null;
  if (margin === 2 && R('pawn' + S.stage) > 0.4) return null;
  if (margin === 1 && R('pawn' + S.stage) > 0.55) return null;
  const card = { kind: 'pawn', key: 'pawn', title: pw.title, where: '許家店門口', scene: 'pawn', paras: [P(pw.text.replace('{left}', left).replace('{need}', need))], opts: [] };
  const rx = { k: 'redeem', label: pw.redeem.replace('{cost}', pw.cost), disabled: S.stones < pw.cost, why: '錢不夠' };
  if (margin <= 1 && !rx.disabled) rx.desc = '還來得及。把這個月贖回來。';
  card.opts.push(rx);
  const sx = { k: 'sell', label: pw.sell.replace('{gain}', pw.gain), deadly: margin <= 1 };
  if (margin <= 1) sx.danger = '剩下的日子，不夠走到結霜了。';
  card.opts.push(sx);
  // 壽命已經不夠時，不給「再說吧」當無痛脫身：改成明確會死
  card.opts.push({ k: 'leave', label: pw.leave, deadly: margin <= 0, danger: margin <= 0 ? '帳會自己走。' : (margin === 1 ? '只剩一個月緩衝了。' : null) });
  return card;
}
function raidCard(spec) {
  const d = DEALS[spec.id], rd = C.raid, label = (d.lot && d.lot.label) || d.itemName || nm(d.item);
  const card = { kind: 'raid', id: d.id, key: 'raid', title: rd.title, where: '許家店', scene: 'shop', paras: [P(rd.text.replace('{item}', label))], opts: [], item: d.item, qty: d.qty || 1 };
  const gaveBefore = BK.remember['raid:lie'] || BK.remember['raid:bribe'];
  card.opts.push({ k: 'give', label: rd.give, desc: gaveBefore ? `交出貨、罰 ${rd.fine} 靈石（你記得：別再嘴硬）` : `交出貨、罰 ${rd.fine} 靈石` });
  for (const k of ['lie', 'bribe']) { const x = { k, label: rd[k], deadly: true }; deathHint(x, { death: { id: 'raid_' + k, chance: k === 'lie' ? 0.7 : 0.85 } }, 'raid:' + k); card.opts.push(x); }
  return card;
}
function endingCard() {
  const fin = (((D.endings || {}).m3 || {}).finale || []);
  let e = fin.find(f => needOk(f.need)) || fin[fin.length - 1];
  if (!S.flags.finale_lamp && !S.flags.finale_ledger && !S.flags.finale_pawn) S.flags.missed_visit = true, e = fin.find(f => f.id === 'missed') || e;
  const paras = [P(e.text)];
  for (const v of (e.visit || [])) if (needOk(v.need)) paras.push(P(v.text, 'visit'));
  return { kind: 'ending', id: e.id, key: 'end', title: e.title, seal: e.seal || e.title.replace('終局・', ''), where: '結局', scene: e.id === 'lamp' ? 'north' : 'frost', paras, opts: [{ k: 'done', label: '看這一局' }] };
}

/* ================================================================
   選擇
   ================================================================ */
function choose(k) {
  const c = S.card; if (!c || c.res) return;
  const o = c.opts.find(x => x.k === k); if (!o || o.disabled) return;
  // 會死的選項一律按兩次，避免手滑；有警示遺物時會多寫幾成
  if (o.deadly && UI.armed !== k) { UI.armed = k; render(); return; }
  UI.armed = null;
  if (o.info) { info(c, k); save(); render(); return; }
  if (c.kind === 'ending') { finish(); return; }
  c.pick = k;
  const r = resolve(c, o);
  c.res = r;
  if (!r.death && !r.slackLine && (r.silent || (!r.text && !r.notes.filter(Boolean).length && !r.saved))) { S.stats.cards++; snd('tap'); next(); return; }
  if (r.death) {
    BK.remember[c.key + ':' + k] = r.death.id; store(BOOK, BK);
    c.res.stamp = (DEATHS[r.death.id] || {}).seal || '出事了';
    snd('stamp');
  } else snd(r.slackLine ? 'slack' : 'tap');
  if (PREF.voice) speak(cardSpeech(c, true));
  S.stats.cards++;
  save(); render(true);
}
function info(c, k) {
  const d = DEALS[c.id]; if (!d) return;
  c.asked = c.asked || {};
  const say = t => c.paras.push(P(t, 'say'));
  if (k === 'i:ask') { c.asked.ask = 1; c.paras.push(P('你問：' + d.ask.q, 'me')); say(sub(d.ask.a, d.npc)); }
  else if (k.startsWith('i:p')) { const i = +k.slice(3); c.asked['p' + i] = 1; c.paras.push(P('你問：' + d.press[i].q, 'me')); say(sub(d.press[i].a, d.npc)); for (const t of (d.tells || []).filter(t => t.after === 'press')) if (!c.paras.some(p => p.t.endsWith(t.text))) c.paras.push(P('你注意到：' + t.text, 'tell')); }
  else if (k === 'i:silence') { c.asked.silence = 1; const s = d.silence; say(sub(typeof s === 'object' ? (s.narr || s.a) : s, d.npc)); if (d.silenceRaise) c.price = d.silenceRaise; if (d.silenceDrop && d.side === 'sell') c.price = Math.max(1, (c.price ?? d.price) - (d.silenceDrop > 5 ? Math.round((c.price ?? d.price) * 0.1) : d.silenceDrop)); for (const t of (d.tells || []).filter(t => t.after === 'silence')) c.paras.push(P('你注意到：' + t.text, 'tell')); }
  else if (k === 'i:haggle') { const h = d.haggle[c.haggled]; c.haggled++; c.paras.push(P('你殺了價。', 'me')); say(sub(h.a, d.npc)); if (h.price) c.price = h.price; }
  else if (k.startsWith('i:v')) { const i = +k.slice(3), v = d.verify[i]; c.asked['v' + i] = 1; if (v.cost) S.stones -= v.cost; c.paras.push(P(`你去問了${(NP[v.who] || {}).name || v.who}。`, 'me')); c.paras.push(P(`${(NP[v.who] || {}).name || ''}：${sub(v.a, v.who)}`, 'say')); }
  dealOpts(c, d);
}
function resolve(c, o) {
  const r = { text: '', notes: [], next: [] };
  const fx = (f, key) => { const x = applyFx(f, { key }); r.notes.push(...x.notes); if (x.saved) r.saved = x.saved; if (x.death && !r.death) r.death = x.death; };
  switch (c.kind) {
    case 'intro': S.flags._intro = true; startItems(); r.text = ''; break;
    case 'month': if (c.forceDeath) r.death = { id: c.forceDeath }; break;
    case 'deal': {
      const d = DEALS[c.id], op = d.opts[o.k];
      r.text = sub(op.text || '', d.npc);
      const qty = d.qty || 1, price = c.price ?? d.price;
      if (o.k === 'deal' && d.side === 'sell' && price) {
        const cost = Math.round(qty * price); S.stones -= cost; r.notes.push(`靈石 －${cost}`);
        const q = (d.lot && d.lot.q) ?? ({ genuine: 1, inferior: 0.55, fake: 0.03, flawed: 0.5, undervalued: 1.7 }[d.truth.goods] ?? 1);
        const base = (IT[d.item] || {}).base || price;
        const val = Math.round(qty * base * q * 1.3);
        give(d.item, qty, true); S.pending.push({ item: d.item, qty, val, label: (d.lot && d.lot.label) || d.itemName || nm(d.item) });
      }
      if (o.k === 'deal' && d.side === 'buy' && price) { const got = Math.round(qty * price); S.stones += got; take(d.item, qty); r.notes.push(`靈石 ＋${got}`); }
      fx(op.fx, c.key + ':' + o.k);
      const bad = d.truth && d.truth.intent && !['plain', 'innocent', 'test'].includes(d.truth.intent);
      if (!d.neutral && Array.isArray(d.verdict)) { if (d.verdict.includes(o.k) && o.k !== 'deal') S.stats.seen++; else if (o.k === 'deal' && bad) S.stats.fooled++; }
      S.done[d.id] = o.k;
      const hot = ['stolen', 'contraband', 'evidence'].includes(d.truth.origin) || ['sting', 'setup', 'proxy'].includes(d.truth.intent);
      if (o.k === 'deal' && hot && !d.neutral && !(op.fx && op.fx.death)) (S.later = S.later || []).push({ t: 'raid', id: d.id, at: S.stage + 1 });
      if (d.repeatable && (o.k.startsWith('special') || (op.fx && (op.fx.flag || op.fx.give)))) S.flags['_deal_closed_' + d.id] = true;
      break;
    }
    case 'ev': {
      const e = EV[c.id]; S.done[e.id] = true;
      if (o.k === 'ok') { fx(e.fx, c.key); }
      else { const ch = e.choices[+o.k.slice(1)]; r.text = sub(ch.text || ''); fx(e.fx, c.key); fx(ch.fx, c.key + ':' + o.k); }
      break;
    }
    case 'out':
      if (o.k === 'stay') { r.text = C.out.stayText; fx({ burden: -2, xp: 8 }); }
      else { r.next.push({ t: o.k }); r.silent = true; }
      break;
    case 'pick':
      if (o.k.startsWith('go:')) { const pid = o.k.slice(3); const far = FAR.includes(pid); S.trip = { pid, left: far ? steps() : 2, got: [], far }; S.flags['_v_' + pid] = true; if (far) S.stats.trips++; r.next.push({ t: 'place', id: pid, first: true }); r.silent = true; }
      else r.silent = true;
      break;
    case 'place': {
      const pid = c.id, far = FAR.includes(pid);
      if (o.k === 'leave') { r.silent = true; if (far) r.next.push({ t: 'ascent', id: pid }); S.trip = null; break; }
      const s = SPOTS[o.k.slice(5)];
      if (s.repeat) S.flags['_rep_' + s.id] = S.stage; else S.done[s.id] = true;
      S.done[s.id] = S.done[s.id] || 'r';
      if (s.cost) { S.stones -= s.cost; r.notes.push(`靈石 －${s.cost}`); }
      let text = s.text || '', f = s.fx || {};
      if (s.repeat && s.loot) { const l = s.loot[Math.floor(R('loot:' + s.id + ':' + S.stage + ':' + S.tries) * s.loot.length)]; text = l.text; f = l.fx || {}; }
      r.text = sub(text);
      if (s.deep && S.level >= (s.deep.level || 0)) r.text += '\n' + s.deep.text;
      if (far) { const b = s.burden != null ? s.burden : (PFX[pid] || {}).burden || 1; if (b) { S.burden += b; r.notes.push(`負擔 ＋${b}`); } if (s.strain) { S.burden += 1; r.notes.push('這一段很累，負擔再＋1'); } }
      const before = { ...S.items };
      fx(f, 'spot:' + s.id);
      if (s.note) addNote(s.note);
      if (S.trip) for (const k of Object.keys(S.items)) if ((S.items[k] || 0) > (before[k] || 0)) S.trip.got.push(k);
      if (r.death) break;
      if (S.trip) {
        S.trip.left -= 1;
        if (far) { if (s.strain || S.trip.left <= 0 || !availSpots(pid).length) { r.next.push({ t: 'ascent', id: pid }); } else r.next.push({ t: 'place', id: pid }); }
        else if (S.trip.left > 0 && availSpots(pid).length) r.next.push({ t: 'place', id: pid });
      }
      break;
    }
    case 'ascent': {
      const pid = c.id; S.trip = null;
      if (o.k === 'ok') { r.text = ''; r.silent = true; break; }
      if (o.k === 'drop') { take(o.item); S.burden = Math.ceil(S.burden / 2); r.text = C.ascent.dropText.replace('{item}', nm(o.item)); r.notes.push(`負擔減半，剩 ${S.burden}`); break; }
      if (o.k.startsWith('use:')) { const rid = o.k.slice(4), u = effOf(rid).use; take(rid); S.burden = Math.ceil(S.burden / 2); r.text = u.text; r.notes.push(`負擔減半，剩 ${S.burden}`); break; }
      const asc = (PFX[pid] || {}).ascent;
      if (RL('asc:' + pid) < c.risk) r.death = { id: asc };
      else { r.text = C.ascent.ok; const sv = c.risk < 0.3 + 0.2 * (S.burden - limit() - 1) ? relics().map(x => effOf(x)).find(e => e.carry && (e.carry.ascent || (e.carry.protect || {})[asc]) && e.saved) : null; if (sv) r.saved = sv.saved; }
      break;
    }
    case 'smith': if (o.k.startsWith('buy:')) { const g = o.k.slice(4), v = SH.gear[g]; S.stones -= v.cost; S.gear.push(g); r.text = `鐵師傅把${v.name}遞給你：「用不到最好。」`; r.notes.push(`靈石 －${v.cost}`); } else r.silent = true; break;
    case 'upgrade': if (o.k.startsWith('up:')) { const u = o.k.slice(3), v = SH.upgrades[u]; S.stones -= v.cost; S.upg.push(u); r.text = v.desc; r.notes.push(`靈石 －${v.cost}`, `每個月進帳大約 ${income()} 靈石`); } else r.silent = true; break;
    case 'dues':
      if (o.k === 'pay') { S.stones -= c.n; S.dueDebt = 0; r.text = '他把錢點了兩次，在單子上蓋了一個章。'; r.notes.push(`靈石 －${c.n}`); }
      else if (o.k === 'beg') { S.dueDebt = c.n; r.text = C.dues.begText; }
      else if (o.k === 'beg2') { S.flags._duesBeg2 = true; S.dueDebt = c.n * 2; r.text = '他看了你很久，在單子上又畫一個圈：「最後一次。下次，雙倍。」'; r.notes.push('規費欠著，下次收雙倍'); }
      else if (o.k === 'split') {
        const half = Math.ceil(c.n / 2);
        S.stones -= half; S.flags._duesSplit = true; S.dueDebt = c.n - half + Math.ceil(c.n / 2);
        r.text = '他在單子上拆成兩截：「一半今天，一半下個月。下個月我照這張加一半收，不再翻倍。就這一次。」';
        r.notes.push(`靈石 －${half}`, `下月還欠 ${S.dueDebt}`);
      }
      else if (o.k === 'sellbag') {
        const need = Math.max(0, c.n - S.stones);
        const { got, notes } = liquidateFor(need);
        S.stones += got; r.notes.push(...notes);
        if (S.stones >= c.n) {
          S.stones -= c.n; S.dueDebt = 0;
          r.text = '你把能賣的東西趕著出清，湊齊了規費。管理處的人點完錢，看了看空了一截的貨架，沒有多說。';
          r.notes.push(`靈石 －${c.n}`);
        } else {
          const still = c.n - S.stones;
          if (S.flags._duesSoldStage === S.stage) {
            r.text = `能賣的都賣了，還差 ${still}。管理處的人搖頭：「傍晚封店。」`;
            r.notes.push(`還差 ${still}`);
            r.death = { id: 'shop_sealed' };
          } else {
            S.flags._duesSoldStage = S.stage;
            r.text = `趕著賣掉一些，還差 ${still} 靈石。管理處的人把單子放回口袋：「我傍晚再來。到時候還湊不出來，就封了。」`;
            r.notes.push(`還差 ${still}`);
            r.next.push({ t: 'dues', n: c.n });
          }
        }
      }
      else if (o.k === 'pawnpay') {
        const months = o.months || 1, gain = o.gain || C.pawn.gain;
        S.lifespan -= months; S.stones += gain - c.n; S.dueDebt = 0;
        r.text = months > 1
          ? `長生當鋪的年輕人在帳本上連寫了 ${months} 格，把 ${gain} 靈石推給你。你回去把規費繳了。店裡比剛才冷了一點。`
          : C.dues.pawnpayText;
        r.notes.push(`壽命 －${months} 個月`, `靈石 ＋${gain}`, `靈石 －${c.n}`);
        if (S.lifespan < FROST0 - S.stage + 1) r.notes.push(`剩下 ${S.lifespan} 個月，到結霜要 ${FROST0 - S.stage} 個月`);
        if (S.lifespan <= 0) r.death = { id: 'pawn_due' };
      }
      else r.death = { id: 'shop_sealed' };
      break;
    case 'pawn': {
      const pw = C.pawn;
      if (o.k === 'redeem') { S.stones -= pw.cost; S.lifespan += 1; r.text = pw.redeemText; r.notes.push(`靈石 －${pw.cost}`, '壽命 ＋1 個月'); }
      else if (o.k === 'sell') { S.stones += pw.gain; S.lifespan -= 1; r.text = pw.sellText; r.notes.push(`靈石 ＋${pw.gain}`, '壽命 －1 個月'); if (S.lifespan <= 0) r.death = { id: 'pawn_due' }; }
      else r.text = pw.leaveText;
      break;
    }
    case 'raid': {
      if (o.k === 'give') { const f = C.raid.fine; S.stones -= f; take(c.item, c.qty); S.pending = S.pending.filter(p => p.item !== c.item); r.text = C.raid.giveText; r.notes.push(`靈石 －${f}`); if (S.stones < 0) { S.dueDebt += -S.stones; S.stones = 0; } }
      else fx({ death: { id: 'raid_' + o.k, chance: o.k === 'lie' ? 0.7 : 0.85, saved: o.k === 'lie' ? '周警員盯著你看了很久，最後把單子摺起來：「下次別讓我再來。」他走了。你知道他會再來。' : '周警員把靈石推回來：「收起來。我今天沒看到。」他走的時候，把門關得很輕。' } }, c.key + ':' + o.k);
      break;
    }
    case 'ending': break;
  }
  if (!r.death && slackOf(c, o)) {
    S.slack = (S.slack || 0) + 1; S.stats.slack = (S.stats.slack || 0) + 1; (S.slackLog = S.slackLog || []).push(c.title);
    r.slackLine = true;
    if (S.slack >= SLACK_MAX) r.death = { id: 'unmanaged' };
  }
  if (r.death) {
    S.dead = r.death.id; S.deathsThisRun++;
    (S._deathLog = S._deathLog || []).push(r.death.id);
    const b = BK.deaths[r.death.id] = BK.deaths[r.death.id] || { n: 0, first: Date.now() }; b.n++; store(BOOK, BK);
  }
  return r;
}

/* ---------------- 往下走 ---------------- */
function next() {
  if (S.dead) return;
  const c = S.card;
  if (c && c.kind === 'ending') { finish(); return; }
  if (c && c.res && c.res.next) S.queue.unshift(...c.res.next);
  S.card = null; UI.armed = null;
  for (let guard = 0; guard < 40; guard++) {
    if (!S.queue.length) {
      if (S.stage >= LAST) { S.card = endingCard(); break; }
      advance(); continue;
    }
    const spec = S.queue.shift();
    const card = makeCard(spec);
    if (card) { S.card = card; setClock(card); break; }
  }
  save(); render();
  if (PREF.voice && S.card) speak(cardSpeech(S.card));
}
function advance() {
  // 錯過的故事：窗口過了還沒處理
  for (const d of D.deals) if (!S.done[d.id] && d.missed && inWindow(d, S.stage) && windowEnd(d, S.stage) === S.stage) { applyFx(d.missed); S.done[d.id] = 'missed'; }
  S.stage += 1; S.tries = 0; S.rolls = 0; S.slack = 0; S.slackLog = [];
  S.queue = planStage(S.stage);
  pushCkpt();
}
function pushCkpt() { const ck = load(CKPT, []); const list = Array.isArray(ck) ? ck : []; list.push(snapshot()); store(CKPT, list.slice(-4)); }
function newRun() {
  S = fresh(); S.phase = 'play'; BK.runs = (BK.runs || 0) + 1; store(BOOK, BK);
  S.queue = planStage(1); store(CKPT, []); pushCkpt();
  next();
}
function restoreMonth(back) {
  let list = load(CKPT, []); if (!Array.isArray(list) || !list.length) { newRun(); return; }
  const n = Math.min(+back || 0, list.length - 1);
  if (n > 0) { list = list.slice(0, -n); store(CKPT, list); }
  const ck = JSON.parse(JSON.stringify(list[list.length - 1]));
  const tries = (S.tries || 0) + 1, dr = S.deathsThisRun, dlog = S._deathLog || [];
  const lastDead = dlog[dlog.length - 1];
  const moneyDead = lastDead === 'pawn_due' || lastDead === 'shop_sealed';
  S = ck; S.tries = tries; S.deathsThisRun = dr; S._deathLog = dlog; S.rolls = 0; S.phase = 'play'; S.dead = null; S.card = null;
  S.deja = true;
  // 錢／壽命連死後重來：清掉規費雪球，並給一點救急（每局一次）
  if (moneyDead) {
    S.dueDebt = 0;
    S.flags._duesBeg2 = false;
    if (!S.flags._mercyCash) {
      S.flags._mercyCash = true;
      S.stones += 60;
      S._mercyNote = '抽屜裡多出六十靈石，像有人趁你不在時塞進來的。單子上的欠費圈也被擦淡了。';
    }
  }
  next();
}
function finish() {
  const c = S.card; S.ended = c.id; S.phase = 'over';
  BK.endings[c.id] = (BK.endings[c.id] || 0) + 1; BK.best = Math.max(BK.best || 0, S.stage); store(BOOK, BK);
  save(); render();
}

/* ================================================================
   畫面
   ================================================================ */
function hud() {
  if (!S || S.phase === 'title') return '';
  const st = S.stage, m = MONTHS[st - 1];
  const chips = MONTHS.map((x, i) => `<span class="chip ${i + 1 < st ? 'past' : i + 1 === st ? 'now' : ''} ${x.frost ? 'frost' : ''}" ${i + 1 === st ? 'id="chipNow"' : ''}>${esc(x.chip)}</span>`).join('');
  const k = S.card && S.card.kind;
  const where = S.dead ? '出事了' : S.phase === 'over' ? '結局' : k === 'place' || k === 'ascent' ? '在外面' : k === 'pick' ? '出門' : k === 'ending' ? '結局' : '顧店中';
  const t = S.clock || 420, warnLife = S.lifespan <= FROST0 - st + 1, sl = S.slack || 0;
  return `<div class="hud-top">
    <div class="clock"><div class="day">第 ${st > 17 ? 18 : st} 個月・<span id="per">${period(t)}</span></div><div class="big" id="clk">${hhmm(t)}</div></div>
    <div class="slack ${sl >= SLACK_MAX - 1 ? 'warn' : ''}"><div class="lbl">這個月沒管的事</div><div class="num">${sl}<small>／${SLACK_MAX}</small></div></div>
    <button class="ghost pause" data-act="pause">${UI.paused ? '繼續' : '暫停'}</button>
  </div>
  <div class="chips" id="chips">${chips}</div>
  <div class="hud-row">
    <span class="state">${esc(m.frost ? '結霜' : m.name)}・${esc(where)}</span>
    <span class="tg"><button class="ghost sm" data-act="snd">聲音 ${PREF.sound ? '開' : '關'}</button><button class="ghost sm" data-act="vox">配音 ${PREF.voice ? '開' : '關'}</button></span>
  </div>
  <div class="hud-stats"><span><b class="g">${S.stones}</b> 靈石</span><span>${esc(lvName(S.level))}</span><span>負擔 <b class="${S.burden > limit() ? 'r' : ''}">${S.burden}</b>／${limit()}</span><span>壽命 <b class="${warnLife ? 'r' : ''}">${S.lifespan}</b> 個月</span></div>
  <div class="hud-tabs"><button class="ghost" data-act="sheet" data-v="bag">身上</button><button class="ghost" data-act="sheet" data-v="notes">筆記</button><button class="ghost" data-act="sheet" data-v="book">死法圖鑑</button><button class="ghost" data-act="menu">選單</button></div>`;
}
function optHtml(o, i, c) {
  const picked = c.res && c.pick === o.k, dim = c.res && !picked;
  const armed = UI.armed === o.k;
  let sub2 = '';
  if (o.desc) sub2 += `<span class="desc">${esc(o.desc)}</span>`;
  if (o.relic) sub2 += `<span class="tag relic">帶著：${esc(o.relic)}</span>`;
  if (o.danger) sub2 += `<span class="danger">${esc(o.danger)}</span>`;
  if (o.remember) sub2 += `<span class="tag mem">你記得：${esc(o.remember)}</span>`;
  if (o.risk != null) sub2 += `<span class="danger risk">${esc(o.warn || '')} ${esc(pct(o.risk))}會出事。</span>`;
  if (armed) sub2 += `<span class="danger risk strong">再按一次，就照這樣做。</span>`;
  else if (o.deadly && !o.danger && o.risk == null && !o.remember) sub2 += `<span class="danger">這一步，可能回不來。</span>`;
  const sk = !c.res && slackOf(c, o) && (S.slack || 0) >= SLACK_MAX - 1;
  if (sk) sub2 += `<span class="danger risk">再一件沒管，就出事。</span>`;
  if (o.disabled && o.why) sub2 += `<span class="desc">（${esc(o.why)}）</span>`;
  return `<button class="opt ${o.info ? 'info' : ''} ${picked ? 'picked' : ''} ${dim ? 'dim' : ''} ${armed ? 'armed' : ''} ${o.deadly || sk ? 'deadly' : ''}" data-act="opt" data-k="${esc(o.k)}" ${o.disabled || c.res ? 'disabled' : ''}>
    <span class="let">${o.info ? '？' : LETTERS[i] || '·'}</span><span class="txt"><span class="lab">${esc(o.label)}</span>${sub2}</span></button>`;
}
function paraHtml(p) {
  if (!p.t) return '';
  const cls = p.cls || '';
  return `<p class="${cls}">${esc(p.t).replace(/\n/g, '<br>')}</p>`;
}
function cardHtml(c) {
  const meta = [c.time != null && `${hhmm(c.time)}・${period(c.time)}`, c.where, c.who && `${c.who}${c.role ? `・${c.role}` : ''}`].filter(Boolean).join('・');
  let h = `<article class="card ${c.kind}"><div class="meta"><span>${esc(meta)}</span><button class="read" data-act="read">朗讀</button></div><h2>${esc(c.title)}</h2>`;
  if (S.deja && c.kind === 'month') { h += `<p class="deja">似曾相識。你記得這個月是怎麼開始的，也記得上一次是在哪裡出的事。</p>`; S.deja = false; if (S._mercyNote) { h += `<p class="deja">${esc(S._mercyNote)}</p>`; S._mercyNote = null; } }
  h += c.paras.map(paraHtml).join('');
  const realOpts = c.opts.filter(o => !(c.res && o.info));
  let li = 0;
  if (!(c.opts.length === 1 && c.opts[0].plain && !c.res)) h += `<div class="opts">${(c.res ? realOpts : c.opts).map(o => optHtml(o, o.info ? -1 : li++, c)).join('')}</div>`;
  if (c.res) {
    const r = c.res;
    if (r.text || r.notes.length || r.saved || r.death || r.slackLine) h += '<hr class="cut">';
    if (r.text) h += `<p class="res">${esc(r.text).replace(/\n/g, '<br>')}</p>`;
    if (r.saved) h += `<p class="saved">${esc(r.saved)}</p>`;
    if (r.slackLine) h += `<p class="slackline">${r.death ? '這個月，你什麼都沒管。' : (S.slack || 0) >= SLACK_MAX - 1 ? '你保住了自己。這件事，沒有人管了。再一件，就出事。' : '你保住了自己。這件事，沒有人管了。'}</p>`;
    if (r.notes.filter(Boolean).length) h += `<p class="notes">${r.notes.filter(Boolean).map(esc).join('　')}</p>`;
    if (r.death) { const d = DEATHS[r.death.id] || {}; h += `<div class="stamp">${esc(r.stamp || d.seal || '出事了')}</div><button class="go danger" data-act="die">${esc(d.title || '出事了')}</button>`; }
    else h += `<button class="go" data-act="next">繼續</button>`;
  } else if (c.opts.length === 1 && c.opts[0].plain) h += `<button class="go" data-act="opt" data-k="${c.opts[0].k}">繼續</button>`;
  return h + '</article>';
}
function deathHtml() {
  const id = S.dead, d = DEATHS[id] || { title: '出事了', text: '' }, b = BK.deaths[id] || { n: 1 };
  const seen = Object.keys(BK.deaths).length, total = Object.keys(DEATHS).length;
  const m = MONTHS[S.stage - 1], ckN = (load(CKPT, []) || []).length;
  const lst = id === 'unmanaged' && (S.slackLog || []).length ? `<p class="ledger">這個月你沒管的：${(S.slackLog || []).map(esc).join('、')}。</p>` : '';
  return `<article class="card death"><div class="meta"><span>${hhmm(S.clock || 420)}・${esc(d.cat || '')}・第 ${S.stage > 17 ? 18 : S.stage} 個月</span><button class="read" data-act="read">朗讀</button></div>
  <div class="stamp big">${esc(d.seal || '死')}</div><h2>${esc(d.title)}</h2>
  <p>${esc(sub(d.text)).replace(/\n/g, '<br>')}</p>${lst}
  <hr class="cut"><p class="hint">${b.n >= 2 ? '怎麼避開：' + esc(d.hint || '') : b.n === 1 ? '第一次這樣死。下一次，你會記得。' : ''}</p>
  ${b.n >= 2 ? '' : '<p class="small muted">同一種死法死第二次，這裡會告訴你怎麼避開。</p>'}
  <p class="small muted">死法圖鑑 ${seen}／${total}・這一局死了 ${S.deathsThisRun} 次</p>
  ${(() => {
    const nSame = (S._deathLog || []).filter(x => x === id).length;
    const money = id === 'pawn_due' || id === 'shop_sealed' || id === 'unmanaged';
    const same = nSame >= 2 && ckN > 1;
    const deep = money && nSame >= 2 && ckN > 3;
    const cur = `<button class="go ${same ? 'quiet' : ''}" data-act="restore">回到這個月開頭（${esc(m.chip)}）</button>`;
    const prev = ckN > 1 ? `<button class="go ${same && !deep ? '' : 'quiet'}" data-act="restore" data-v="1">回到上個月開頭（${esc((MONTHS[S.stage - 2] || m).chip)}）${same && !deep ? '・這個月這樣出過兩次了' : ''}</button>` : '';
    const far = ckN > 3 ? `<button class="go ${deep ? '' : 'quiet'}" data-act="restore" data-v="3">回到三個月前（${esc((MONTHS[S.stage - 4] || m).chip)}）${deep ? '・錢／壽命卡關，早點重來' : ''}</button>` : '';
    return (deep ? far + prev + cur : same ? prev + cur + far : cur + prev + far);
  })()}
  <button class="go quiet" data-act="restart">重新開張</button></article>`;
}
function overHtml() {
  const e = S.ended, all = (((D.endings || {}).m3 || {}).finale || []);
  return `<article class="card over"><div class="meta">這一局</div><h2>走到了結霜</h2>
  <p>看穿 ${S.stats.seen} 次、被騙 ${S.stats.fooled} 次、出門 ${S.stats.trips} 趟、死過 ${S.deathsThisRun} 次。<br>最後身上有 ${S.stones} 靈石、${esc(lvName(S.level))}，壽命還剩 ${S.lifespan} 個月。</p>
  <hr class="cut"><p class="small">結局收集：${all.map(f => BK.endings[f.id] ? `<b>${esc(f.title.replace('終局・', ''))}</b>` : '？？？').join('・')}</p>
  <p class="small">死法圖鑑：${Object.keys(BK.deaths).length}／${Object.keys(DEATHS).length}</p>
  <button class="go" data-act="restart">再開一間店</button><button class="go quiet" data-act="title">回到標題</button></article>`;
}
function titleHtml() {
  const s = load(SAVE, null), canCont = s && s.phase === 'play';
  const all = (((D.endings || {}).m3 || {}).finale || []);
  return `<div class="title"><div class="logo">${esc(C.start.title)}</div><div class="subt">${esc(C.start.sub)}</div>
  ${canCont ? `<button class="go" data-act="continue">繼續（第 ${s.stage > 17 ? 18 : s.stage} 個月）</button>` : ''}
  <button class="go ${canCont ? 'quiet' : ''}" data-act="restart">${canCont ? '重新開張' : '開張'}</button>
  <p class="small muted center">開過 ${BK.runs || 0} 次店・死法 ${Object.keys(BK.deaths).length}／${Object.keys(DEATHS).length}・結局 ${all.filter(f => BK.endings[f.id]).length}／${all.length}</p>
  <button class="ghost" data-act="sheet" data-v="book">死法圖鑑</button>
  <p class="small muted center">舊版（店務經營）：<a href="shop.html">shop.html</a></p></div>`;
}
function sheetHtml() {
  const v = UI.sheet; let h = '';
  if (v === 'bag') {
    const rs = Object.keys(S.items).filter(k => S.items[k] > 0);
    h = `<h3>身上・庫房</h3>` + (rs.length ? rs.map(k => { const it = IT[k] || { name: k }; const e = it.eff; return `<div class="item"><b>${esc(it.name)}</b>${S.items[k] > 1 ? ` × ${S.items[k]}` : ''}<div class="small">${esc(it.text || it.stat || '')}</div>${e && e.desc ? `<div class="small eff">效果：${esc(e.desc)}</div>` : ''}</div>`; }).join('') : '<p class="muted">什麼都沒有。</p>');
    if (S.gear.length) h += `<h3>裝備</h3>` + S.gear.map(g => `<div class="item"><b>${esc(SH.gear[g].name)}</b><div class="small">${esc(SH.gear[g].desc)}</div></div>`).join('');
    if (S.upg.length) h += `<h3>店面</h3><p class="small">${S.upg.map(u => esc(SH.upgrades[u].name)).join('、')}</p>`;
  } else if (v === 'notes') {
    h = `<h3>謎題簿</h3>` + THREADS.map(t => { const st = t.steps || []; const got = st.filter(s => s.flag ? flagOn(s.flag) : s.anyFlag ? arr(s.anyFlag).some(flagOn) : false); if (!got.length) return ''; const nx = st.find(s => !got.includes(s)); return `<div class="item"><b>${esc(t.title)}</b>${got.map(s => `<div class="small">・${esc(s.text)}</div>`).join('')}${nx ? `<div class="small hintline">下一步：${esc(nx.hint || '……')}</div>` : '<div class="small hintline">這條線走完了。</div>'}</div>`; }).join('');
    if (!/item/.test(h)) h += '<p class="muted">還沒有頭緒。</p>';
    h += `<h3>筆記</h3>` + (S.notes.length ? S.notes.map(n => `<p class="small">・${esc(n)}</p>`).join('') : '<p class="muted">還沒有記下什麼。</p>');
  } else if (v === 'book') {
    const cats = {}; for (const [id, d] of Object.entries(DEATHS)) (cats[d.cat] = cats[d.cat] || []).push([id, d]);
    h = `<h3>死法圖鑑 ${Object.keys(BK.deaths).length}／${Object.keys(DEATHS).length}</h3>` + Object.entries(cats).map(([cat, l]) => `<h4>${esc(cat)}</h4><div class="seals">${l.map(([id, d]) => BK.deaths[id] ? `<div class="seal on"><b>${esc(d.seal || '')}</b><span>${esc(d.title)}</span>${BK.deaths[id].n > 1 ? `<i>×${BK.deaths[id].n}</i>` : ''}</div>` : `<div class="seal"><b>？</b><span>？？？</span></div>`).join('')}</div>`).join('');
  } else if (v === 'menu') {
    h = `<h3>選單</h3><button class="go quiet" data-act="restore">回到這個月開頭</button><button class="go quiet" data-act="restart">重新開張</button><button class="go quiet" data-act="title">回到標題</button>`;
  }
  return `<div class="sheet-in">${h}<button class="go" data-act="closesheet">關上</button></div>`;
}
let lastScene = null;
function render(resolved) {
  const app = $('#app'), hd = $('#hud');
  if (!S || S.phase === 'title') { hd.hidden = true; $('#scene').hidden = true; app.innerHTML = titleHtml(); }
  else {
    hd.hidden = false; hd.innerHTML = hud(); $('#scene').hidden = false;
    const scene = S.dead ? 'dead' : S.phase === 'over' ? 'frost' : (S.card && S.card.scene) || 'shop';
    if (scene !== lastScene) { drawScene(scene); lastScene = scene; }
    app.innerHTML = (S.dead ? deathHtml() : S.phase === 'over' ? overHtml() : S.card ? cardHtml(S.card) : '') + (UI.paused ? `<div class="pausebox"><div class="pz">暫停中</div><p>時間停住了。店裡很安靜。</p><button class="go" data-act="pause">繼續</button></div>` : '');
    app.classList.toggle('paused', !!UI.paused);
    const ch = $('#chipNow'); if (ch) ch.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  const sh = $('#sheet'); if (UI.sheet) { sh.hidden = false; sh.innerHTML = sheetHtml(); } else sh.hidden = true;
  if (resolved) { const r = app.querySelector('.cut') || app.querySelector('.go'); if (r) r.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  else if (!UI.armed) window.scrollTo(0, 0);
  // 只有換卡才播進場，避免每點一下都抖、也少卡手
  const ck = S && (S.dead ? 'dead:' + S.dead : S.phase === 'over' ? 'over' : S.card ? (S.card.key + (S.card.res ? ':r' : '')) : 'none');
  if (ck !== UI._ck) { UI._ck = ck; app.classList.remove('in'); void app.offsetWidth; app.classList.add('in'); }
  else app.classList.add('in');
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (UI.paused && a !== 'pause') return;
  if (a === 'pause') { UI.paused = !UI.paused; if (UI.paused) hush(); render(); return; }
  if (a === 'snd') { PREF.sound = !PREF.sound; savePref(); snd('tap'); render(); return; }
  if (a === 'vox') { PREF.voice = !PREF.voice; savePref(); if (PREF.voice && S && S.card) speak(cardSpeech(S.card, !!S.card.res)); else hush(); render(); return; }
  if (a === 'read') { const c = S && (S.dead ? null : S.card); if (c) speak(cardSpeech(c) + (c.res ? '。' + cardSpeech(c, true) : '')); else if (S && S.dead) { const d = DEATHS[S.dead] || {}; speak([d.seal, d.title, d.text].join('。')); } return; }
  if (a === 'opt') choose(b.dataset.k);
  else if (a === 'next') { snd('turn'); next(); }
  else if (a === 'die') { S.card = null; save(); render(); }
  else if (a === 'restore') { UI.sheet = null; restoreMonth(b.dataset.v === 'prev' ? 1 : +(b.dataset.v || 0)); }
  else if (a === 'restart') { UI.sheet = null; newRun(); }
  else if (a === 'continue') { S = load(SAVE, null); if (S.dead) S.card = null; render(); }
  else if (a === 'title') { UI.sheet = null; if (S) S.phase = S.phase === 'over' ? 'over' : S.phase; S = null; render(); }
  else if (a === 'sheet') { UI.sheet = b.dataset.v; if (!S && UI.sheet !== 'book') UI.sheet = null; render(); }
  else if (a === 'menu') { UI.sheet = 'menu'; render(); }
  else if (a === 'closesheet') { UI.sheet = null; render(); }
});

/* ================================================================
   像素場景（不用圖檔，用方塊畫）
   ================================================================ */
const PAL = {
  sky: { 冬: ['#4a5560', '#6c7a82'], 春: ['#5d6f68', '#8ea294'], 雨: ['#3e4a50', '#5f6d72'], 夏: ['#5f7a80', '#9db6b0'], 秋: ['#5a5a4c', '#8e8a6a'], 霜: ['#6d7f8c', '#c9d6dc'] },
};
function drawScene(name) {
  const cv = $('#scene'), W = 130, H = 52; cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const rnd = (i) => hash('sc' + name + i);
  const season = S ? (MONTHS[S.stage - 1] || {}).season || '冬' : '冬';
  const [s0, s1] = PAL.sky[season];
  for (let y = 0; y < H; y++) r(0, y, W, 1, y < 18 ? s0 : s1);
  const ridge = (base, amp, col, k) => { for (let x = 0; x < W; x++) { const h = Math.round(base + amp * Math.sin(x / 9 + k) + amp * 0.5 * Math.sin(x / 4 + k * 2)); r(x, h, 1, H - h, col); } };
  const lamp = (x, y, on = '#f2c55c') => { r(x, y, 1, 10, '#2a2f2c'); r(x - 1, y - 2, 3, 2, on); };
  const house = (x, y, w, h, c, win) => { r(x, y, w, h, c); r(x - 1, y - 2, w + 2, 2, '#3a3330'); for (let i = 2; i < w - 2; i += 4) r(x + i, y + 3, 2, 2, win || '#e8c66a'); };
  switch (name) {
    case 'shop': case 'frost': {
      r(0, 0, W, H, '#3b3027'); for (let x = 0; x < W; x += 8) r(x, 0, 1, 30, '#33291f');
      r(0, 30, W, 22, '#6b5a43'); for (let x = 0; x < W; x += 6) r(x, 30, 1, 22, '#5e4e39');
      for (let s = 0; s < 3; s++) { r(6, 6 + s * 8, 40, 2, '#5a4632'); for (let i = 0; i < 9; i++) if (rnd(s * 9 + i) > 0.3) r(7 + i * 4, 2 + s * 8, 3, 4, ['#8a5a3c', '#5f7a6a', '#9b8b5a', '#6e6e8a', '#a05040'][Math.floor(rnd(i + s) * 5)]); }
      r(60, 22, 44, 10, '#4a3a2a'); r(60, 22, 44, 2, '#7a6248'); r(78, 18, 6, 4, '#c9a45a');
      r(110, 4, 16, 26, '#20262a'); r(112, 6, 12, 22, name === 'frost' ? '#cfe0ea' : '#9fb3b8'); r(117, 6, 1, 22, '#20262a');
      r(70, 4, 3, 3, '#f2c55c');
      if (name === 'frost') for (let i = 0; i < 160; i++) r(Math.floor(rnd(i) * W), Math.floor(rnd(i + 999) * H), 1, 1, 'rgba(230,240,248,.75)');
      break;
    }
    case 'town': case 'tea': case 'school': case 'homes': case 'office': {
      ridge(16, 3, '#56645e', 1); r(0, 38, W, 14, '#4b4a44'); r(0, 44, W, 1, '#6c6a60');
      house(6, 22, 22, 16, '#6d5d4b'); house(34, 26, 16, 12, '#5f6b63'); house(56, 20, 26, 18, name === 'tea' ? '#7a5a3a' : '#6a5f55'); house(90, 24, 18, 14, '#596258'); house(112, 27, 16, 11, '#6b5b4f');
      lamp(31, 28); lamp(86, 28); lamp(109, 28);
      if (name === 'school') { r(56, 14, 26, 6, '#8a8a7a'); r(66, 8, 6, 6, '#a04a3a'); }
      break;
    }
    case 'road': case 'ruin': {
      ridge(12, 4, '#4f5f58', 2); ridge(22, 3, '#3f4c46', 4);
      for (let x = 0; x < W; x++) { const y = 36 + Math.round(x * 0.08 - (x > 70 ? (x - 70) * 0.35 : 0)); r(x, y, 1, 3, '#55534c'); r(x, y + 3, 1, H, '#3a3a34'); }
      if (name === 'ruin') { r(24, 30, 24, 8, '#4e6e54'); for (let i = 0; i < 5; i++) r(27 + i * 4, 32, 2, 2, '#9fb3b8'); r(100, 30, 7, 6, '#9a3a2a'); r(101, 28, 5, 2, '#5a2a20'); }
      lamp(70, 26, '#555');
      break;
    }
    case 'tunnel': { r(0, 0, W, H, '#2d322f'); for (let y = 6; y < H; y++) { const w = Math.round(46 - Math.max(0, 18 - y) * 2.2); r(65 - w, y, w * 2, 1, y < 10 ? '#3a403c' : '#101312'); } for (let i = 0; i < 5; i++) { const x = 30 + i * 18; r(x, 14, 2, 2, '#f2d27a'); r(x - 1, 13, 4, 1, 'rgba(242,210,122,.35)'); } break; }
    case 'reservoir': { ridge(14, 3, '#55625d', 3); r(0, 30, W, 22, '#4b5f68'); for (let i = 0; i < 20; i++) r(Math.floor(rnd(i) * W), 32 + Math.floor(rnd(i + 50) * 18), 6, 1, '#6c838c'); for (let y = 18; y < 34; y += 3) r(0, y, W, 2, 'rgba(210,220,222,.25)'); lamp(40, 22, '#f2d27a'); lamp(78, 24, '#f2d27a'); lamp(104, 21, '#f2d27a'); break; }
    case 'cliff': { r(0, 30, W, 22, '#3f5a6a'); for (let x = 0; x < 60; x++) r(x, 26 + Math.round(Math.sin(x / 5)), 1, H, '#4a4a40'); for (let y = 28; y < H; y++) r(78 + Math.round(Math.sin(y / 3) * 2), y, 22, 1, y % 3 ? '#e2ecef' : '#bcd0d6'); r(92, 12, 18, 5, '#6b5a43'); r(98, 6, 2, 6, '#3a3330'); break; }
    case 'north': { ridge(10, 4, '#7e8e98', 5); r(0, 34, W, 18, '#c7d3da'); for (let x = 4; x < W; x += 8) { r(x, 22, 1, 14, '#3d4448'); } r(0, 24, W, 1, '#3d4448'); r(0, 29, W, 1, '#3d4448'); r(90, 36, 14, 8, '#2a2f33'); for (let i = 0; i < 90; i++) r(Math.floor(rnd(i) * W), Math.floor(rnd(i + 9) * H), 1, 1, 'rgba(240,248,252,.8)'); break; }
    case 'stair': { r(0, 0, W, H, '#16191a'); for (let y = 0; y < H; y += 4) { r(58, y, 14, 1, '#59615e'); } r(57, 0, 1, H, '#59615e'); r(72, 0, 1, H, '#59615e'); for (let i = 0; i < 6; i++) r(20 + i * 17, 10 + (i * 7) % 30, 1, 1, '#f2d27a'); break; }
    case 'lampst': { r(0, 0, W, H, '#1c1a24'); r(0, 38, W, 14, '#2b2a33'); for (let i = 0; i < 6; i++) { const x = 4 + i * 21; r(x, 16, 18, 22, '#3a3442'); r(x + 3, 20, 5, 5, '#f2c55c'); r(x + 10, 20, 5, 5, rnd(i) > 0.4 ? '#f2c55c' : '#2b2a33'); r(x + 6, 30, 5, 8, '#221f28'); } lamp(64, 26); r(60, 6, 8, 8, '#e6e0cc'); r(63, 8, 1, 4, '#222'); r(64, 10, 3, 1, '#222'); break; }
    case 'platform': { r(0, 0, W, H, '#121416'); r(0, 30, W, 6, '#555a5c'); r(0, 30, W, 1, '#e3c34a'); r(0, 36, W, 16, '#060707'); for (let x = 0; x < W; x += 10) r(x, 44, 6, 1, '#2a2d2f'); r(20, 10, 30, 6, '#2b3a40'); r(24, 12, 22, 2, '#7fb0bd'); lamp(100, 18, '#aab'); break; }
    case 'pawn': { r(0, 0, W, H, '#262322'); r(0, 38, W, 14, '#3a3634'); r(48, 6, 34, 32, '#0d0c0c'); r(50, 8, 30, 30, '#151313'); r(64, 22, 2, 2, '#b08a3a'); r(40, 2, 50, 4, '#3d2b26'); lamp(30, 26, '#9a3a2a'); lamp(100, 26, '#9a3a2a'); break; }
    case 'dead': { r(0, 0, W, H, '#1a1514'); for (let i = 0; i < 70; i++) r(Math.floor(rnd(i) * W), Math.floor(rnd(i + 3) * H), 1, 1, 'rgba(160,60,50,.5)'); break; }
    default: ridge(18, 4, '#4f5f58', 1); r(0, 40, W, 12, '#3a3a34');
  }
}

// 測試用
window.__fc = { get S() { return S; }, set S(v) { S = v; }, D, BK: () => BK, choose, next, newRun, restoreMonth, render, planStage, makeCard, needOk, limit, income };
setInterval(() => {
  if (!S || S.phase !== 'play' || S.dead || UI.paused || UI.sheet || !S.card || S.card.res || document.hidden) return;
  if (S.clock >= 23 * 60 + 58) return;
  S.clock += 1;
  const el = $('#clk'); if (el) el.textContent = hhmm(S.clock);
  const pe = $('#per'); if (pe) pe.textContent = period(S.clock);
}, 2500);
S = null; render();
})();
