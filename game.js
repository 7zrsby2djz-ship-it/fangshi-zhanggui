(() => {
'use strict';
/* ================= data ================= */
const D = __GAME_DATA__;
const M = D.meta, IT = D.items, NP = D.npcs, PL = D.places, NEWS = D.news.news;
const DEALS = {}; D.deals.forEach(d => { DEALS[d.id] = d; });
const COUNTED = D.deals.filter(d => !d.extra).map(d => d.id);
const SAVE_KEY = 'fangshi-p1-v1';
const SLOT = ['辰時', '午時', '申時'];
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const lvName = n => n <= 9 ? `煉氣${CN[n]}層` : (['築基初期', '築基中期', '築基後期'][n - 10] || '深不可測');
const PUBLIC_VERIFY = ['bai', 'tie', 'ge'];
const TEA = { 1: 3, 2: 4, 3: 6 };

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
  const s = {
    v: 1, seed, day: 1, slot: 0, phase: 'morning',
    stones: M.startStones, level: M.startLevel, xp: M.startXp, spirit: 0,
    stance: '收斂', stanceDays: { 收斂: 0, 外放: 0 }, wind: 0,
    lots: [], lotSeq: 0, flags: {}, rel: {}, met: {}, mem: {}, tags: {}, notes: {}, homes: {},
    rep: { loose: 0, sect: 0, ghost: 0 }, repTag: {}, done: {}, events: [], cards: [], todayNews: [],
    codex: {}, teaBought: {}, overheard: {}, herbBought: {}, commission: null, pillYesterday: false,
    enc: null, place: null, night: null, dues: null, debt: 0, lifespan: M.lifespan,
    stats: { saw: 0, fooled: 0, wronged: 0 }, complaints: [], log: [], sold: [], dayStartStones: M.startStones, lifespanLeft: M.lifespan
  };
  S = s;
  M.startLots.forEach(l => addLot({ item: l.item, qty: l.qty, cost: l.cost, label: l.label, known: true }));
  beginDay();
  return s;
}

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
const lotValue = (l, day = S.day, trueQ = false) => price(l.item, day) * ((trueQ || l.known) ? l.q : 1) * l.qty;

/* ----- relations ----- */
const rel = n => S.rel[n] || 0;
function addRel(n, d) { S.rel[n] = rel(n) + d; S.met[n] = true; }
function addMem(n, t) { (S.mem[n] = S.mem[n] || []).push({ day: S.day, t }); S.met[n] = true; }
function attitude(n) { const r = rel(n); return r <= -4 ? '結仇' : r <= -2 ? '有隙' : r >= 4 ? '交心' : r >= 2 ? '熟客' : '生客'; }
function bucketOf(npc) { const n = NP[npc]; if (!n) return 'eq'; if (n.level >= 10 && S.level < 10) return 'far'; const d = S.level - n.level; return d >= 3 ? 'up' : d <= -3 ? 'down' : 'eq'; }
function callYou(npc) { const c = (NP[npc] || {}).call || {}; const b = bucketOf(npc); return (b === 'far' || b === 'down' ? c.down : b === 'up' ? c.up : c.eq) || '掌櫃'; }
const sub = (t, npc) => String(t ?? '').replace(/〈你〉/g, callYou(npc));
const quote = t => /^[「（…]/.test(t) ? t : '「' + t + '」';
const npcLv = n => NP[n].conceal ? '修為看不透' : lvName(NP[n].level);

/* ================= prices ================= */
function newsMult(item, day) { let m = 1; for (const n of NEWS) for (const e of (n.effects || [])) if (e.item === item && day >= e.from && day <= e.to) m *= e.mult; return m; }
function price(item, day = S.day) { const b = IT[item] && IT[item].base; if (!b) return 0; return rp(b * newsMult(item, day) * (1 + (hash(S.seed + item + day) - 0.5) * 0.08)); }

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
  if (fx.sellHot) {
    let got = 0;
    for (const [item, unit] of Object.entries(fx.sellHot)) for (const l of S.lots.filter(x => x.item === item && x.flags.includes('stolen') || x.item === item && x.flags.includes('sting'))) { got += unit * l.qty; l.qty = 0; if (l.flags.includes('entrusted')) { addRel('aheng', -5); addMem('aheng', '託你交給執事堂的雪蟾酥，你賣去了鬼市。'); S.flags.betrayed_aheng = true; } }
    S.lots = S.lots.filter(l => l.qty > 0); S.stones += got; notes.push('＋' + fmt(got) + ' 靈石');
  }
  return notes;
}

/* ================= day flow ================= */
function beginDay() {
  S.phase = 'morning'; S.slot = 0; S.place = null; S.enc = null; S.night = null;
  S.spirit = M.spirit[S.level] || 2; S.dayStartStones = S.stones; S.cards = [];
  if (S.day === 1) S.cards.push({ title: D.events.e_intro.title, text: D.events.e_intro.text });
  // perish
  for (const l of [...S.lots]) if (l.perishDay && S.day >= l.perishDay) {
    S.lots = S.lots.filter(x => x !== l);
    S.cards.push({ title: '東西壞了', text: (D.events.melt[l.item] || D.events.melt.default.replace('{name}', l.label)) });
    if (l.flags.includes('entrusted')) { addRel('aheng', -3); addMem('aheng', '託你交的雪蟾酥，在你手上化了。'); }
  }
  // scheduled events
  for (const ev of S.events.filter(e => e.day === S.day)) runEvent(ev);
  S.events = S.events.filter(e => e.day !== S.day);
  if (S.day === 4 && S.flags.aheng_entrust) S.cards.push({ title: D.events.e_aheng_warn.title, text: D.events.e_aheng_warn.text });
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
  S.todayNews = NEWS.filter(n => n.day === S.day && (!n.cond || S.flags[n.cond])).map(n => n.id);
  if (S.todayNews.includes('n_bounty')) S.flags.bounty_seen = true;
}
function runEvent(evo) {
  const id = typeof evo === 'string' ? evo : evo.id;
  const ev = D.events[id]; if (!ev) return;
  if (evo.refund) { S.stones -= evo.refund; if (evo.back) addLot({ ...evo.back, known: true }); }
  if (!ev.cases) { S.cards.push({ title: ev.title, text: ev.text }); return; }
  const c = ev.cases.find(x => needOk(x.if || {}, evo));
  if (!c) return;
  const notes = applyFx(c.fx);
  if (evo.refund) notes.unshift('退錢 ' + fmt(evo.refund) + ' 靈石');
  S.cards.push({ title: ev.title, text: c.text, notes });
}
function openShop() { S.phase = 'day'; UI.tab = 'main'; }
function advanceSlot() {
  S.slot++; S.place = null; S.enc = null;
  if (S.slot >= 3) {
    if (S.day === M.days && !S.dues) startDues();
    else S.phase = 'night';
  }
}
function endDay() {
  S.stanceDays[S.stance] = (S.stanceDays[S.stance] || 0) + 1;
  for (const d of D.deals) {
    if (S.done[d.id] || d.extra || d.days[1] !== S.day) continue;
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
  S.phase = 'end'; S.lifespanLeft = M.lifespan - 1;
}

/* ================= encounters ================= */
function dealAvail(d) { return !S.done[d.id] && S.day >= d.days[0] && S.day <= d.days[1] && needOk(d.need); }
function nextShopDeal() { return D.deals.filter(d => d.where === 'shop' && dealAvail(d)).sort((a, b) => (b.prio || 0) - (a.prio || 0))[0] || null; }

function startDeal(id, from) {
  const d = DEALS[id]; const npc = d.npc;
  S.met[npc] = true;
  if (S.stance === '外放') S.wind++;
  const enc = { deal: id, npc, side: d.side, item: d.item, qty: d.qty || 1, price: d.price, tea: TEA[NP[npc].traits.patience] || 4, th: [], press: 0, haggle: 0, asked: false, silent: false, appraised: false, verified: [], cold: false, done: null, from, lot: null };
  enc.teaMax = enc.tea;
  if (d.side === 'buy') {
    const lots = S.lots.filter(l => l.item === d.item);
    lots.sort((a, b) => (b.known ? b.q : 1) - (a.known ? a.q : 1));
    enc.lot = lots[0] ? lots[0].id : null;
    enc.qty = Math.min(d.qty || 1, held(d.item));
  }
  if (IT[d.item]) S.codex[d.item] = true;
  if (d.intro) enc.th.push({ k: 'narr', t: sub(d.intro, npc) });
  if (id === 'd18') {
    const high = S.wind >= M.windHigh || S.stones >= M.richHigh;
    enc.due = high ? M.duesHigh : M.dues; enc.high = high;
    enc.th.push({ k: 'npc', t: high ? d.openHigh : d.open });
  } else enc.th.push({ k: 'npc', t: sub(d.open, npc) });
  // realm & stance layer: adjust the opening price and say so
  if ((d.side === 'sell' || d.side === 'buy') && !d.extra) {
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
  pushTells(enc, 'open');
  S.enc = enc; S.phase = 'enc';
  return enc;
}
function pushTells(enc, after) {
  const d = DEALS[enc.deal]; if (!d || !d.tells) return;
  const bonus = S.flags.lamp && enc.from === 'shop' ? 2 : 0;
  const diff = S.level - NP[enc.npc].level + bonus;
  for (const t of d.tells) if (t.after === after && diff >= t.need && !enc.th.some(x => x.t === t.text)) enc.th.push({ k: 'tell', t: t.text });
}
function spend(enc, n) {
  enc.tea -= n;
  if (enc.tea <= 0 && !enc.cold) { enc.tea = 0; enc.cold = true; enc.th.push({ k: 'npc', t: quote(sub(NP[enc.npc].cold, enc.npc)) }); }
}
const pride3 = enc => NP[enc.npc].traits.pride >= 3;

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
  e.asked = true; e.th.push({ k: 'me', t: d.ask.q || '這東西，怎麼來的？' }); e.th.push({ k: 'npc', t: sub(d.ask.a, e.npc) });
  pushTells(e, 'ask'); spend(e, 1);
}
function actPress() {
  const e = S.enc, d = DEALS[e.deal], p = d.press[e.press++];
  e.th.push({ k: 'me', t: p.q }); e.th.push({ k: 'npc', t: sub(p.a, e.npc) });
  pushTells(e, 'press');
  spend(e, 2 + (pride3(e) && ['down', 'far'].includes(bucketOf(e.npc)) ? 1 : 0));
}
function actSilence() {
  const e = S.enc, d = DEALS[e.deal];
  e.silent = true; e.th.push({ k: 'me', t: '（你沒有說話，只是看著對方。）' });
  if (typeof d.silence === 'object') e.th.push({ k: 'narr', t: sub(d.silence.narr, e.npc) }); else e.th.push({ k: 'npc', t: sub(d.silence, e.npc) });
  if (d.silenceRaise && d.silenceRaise > e.price) e.price = d.silenceRaise;
  if (d.silenceDrop && d.silenceDrop < e.price) e.price = d.silenceDrop;
  pushTells(e, 'silence');
  spend(e, 1 + (pride3(e) ? 1 : 0));
}
function actHaggle() {
  const e = S.enc, d = DEALS[e.deal];
  e.th.push({ k: 'me', t: d.side === 'buy' ? '再加一點。' : d.side === 'task' ? '辛苦費，再加一點。' : '便宜點。' });
  if (bucketOf(e.npc) === 'far' || (bucketOf(e.npc) === 'down' && pride3(e))) {
    e.haggle = d.haggle.length; e.th.push({ k: 'npc', t: quote(sub(NP[e.npc].refuse, e.npc)) }); spend(e, 2); return;
  }
  let step = null;
  while (e.haggle < d.haggle.length) {
    const s = d.haggle[e.haggle++];
    const better = d.side === 'sell' ? s.price < e.price : s.price > e.price;
    if (better) { step = s; break; }
  }
  if (step) { e.price = step.price; e.th.push({ k: 'npc', t: sub(step.a, e.npc) }); }
  else e.th.push({ k: 'npc', t: quote(sub(NP[e.npc].refuse, e.npc)) });
  pushTells(e, 'haggle'); spend(e, 2);
}
function actAppraise() {
  const e = S.enc, d = DEALS[e.deal];
  S.spirit--; e.appraised = true;
  e.th.push({ k: 'me', t: `（你以靈識探向${d.itemName || (IT[d.item] && IT[d.item].name) || '那件東西'}。）` });
  for (const a of d.appraise) if (S.level >= a.realm) e.th.push({ k: 'sys', t: a.text });
  e.th.push({ k: 'narr', t: '以你的靈識，只看得到這麼多。' });
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
  e.th.push({ k: 'npc', who, t: sub(v.a, who) });
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
  for (const key of OPT_ORDER) {
    const o = d.opts[key]; if (!o) continue;
    if (key === 'pay') {
      if (S.stones < e.due && pawnable().length) { const v = pawnable().reduce((a, l) => a + pawnValue(l), 0); out.push({ key: 'goods', label: '拿貨抵', desc: `周執事照市價七成收貨抵規費（你的貨約值 ${fmt(v)}）`, primary: true }); }
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
    else if (key === 'report') { label = label || '報執事堂'; desc = '交給官家處理。散修圈會記得'; }
    else if (key === 'refer') { label = label || '轉介給錢記'; desc = '把這筆生意送去對門'; }
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
      if (d.honestyTest) {
        if (l.q < 0.8) S.events.push({ id: 'e_xiaoman_back', day: S.day + 1, refund: unit * q, back: { ...l, qty: q } });
        else { addRel('zhang', 1); addRel('xiaoman', 1); }
      }
      if (l.q < 0.7 && !d.honestyTest) scheduleComplaint(l, q, unit);
    } else if (d.side === 'task' && key === 'deal' && d.price) { S.stones += unit; notes.push('＋' + fmt(unit) + ' 靈石'); }
  }
  notes = notes.concat(applyFx(res.fx, { price: unit, enc: e }));
  if (!(d.repeatable && key === 'decline')) S.done[e.deal] = key;
  e.done = { key, label: ok ? label0 : '沒談成', notes };
  e.th.push({ k: 'res', t: sub(res.text, e.npc), notes });
  // judgement stats
  if (!d.neutral && !d.extra) {
    if (key === 'expose') { if (o.right) S.stats.saw++; else S.stats.wronged++; }
    else if ((d.verdict || []).includes(key) && ok) S.stats.saw++;
    else if (key === 'deal') S.stats.fooled++;
  }
  S.log.push({ day: S.day, t: `${NP[e.npc].name}：${d.title}（${e.done.label}）` });
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
    e.th.push({ k: 'npc', t: `周執事讓人把${took.join('、')}搬走：「照市價七成，算你抵了。」` });
    if (S.stones >= e.due) { S.stones -= e.due; e.th.push({ k: 'res', t: d.opts.pay.text, notes: ['－' + e.due + ' 靈石', '貨抵：' + took.join('、')] }); e.done = { key: 'pay', label: '貨抵' }; S.dues = { paid: true, amount: e.due }; }
    return;
  }
  if (key === 'poor') {
    e.poorTried = true;
    if ((S.stanceDays['收斂'] || 0) >= 4 && S.wind < M.windHigh) { e.due = M.dues; e.th.push({ k: 'npc', t: d.opts.poor.text }); }
    else { e.th.push({ k: 'npc', t: d.opts.poor.fail.text }); applyFx(d.opts.poor.fail.fx); }
    return;
  }
  if (key === 'pay') {
    if (S.stones >= e.due) { S.stones -= e.due; e.th.push({ k: 'res', t: d.opts.pay.text, notes: ['－' + e.due + ' 靈石'] }); e.done = { key, label: '照付' }; }
    else {
      const owe = e.due - S.stones; S.debt = owe; S.stones = 0; S.flags.debt = true; addMem('qian', `月底替你墊了 ${fmt(owe)} 靈石的規費。`);
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
  const dem = W.demand[S.day] || {};
  const sellable = S.lots.filter(l => (IT[l.item].sell || []).includes('walk') && !l.flags.includes('sect') && !l.flags.includes('sting'));
  if (S.stance === '外放') S.wind++;
  const enc = { generic: true, who, npc: null, tea: 3, teaMax: 3, th: [], done: null, from: 'shop', chatted: false, haggled: false, lot: null };
  if (sellable.length && rnd(k + 'want') < 0.8) {
    const weights = sellable.map(l => dem[IT[l.item].cat] ?? 1);
    let r = rnd(k + 'pick') * weights.reduce((a, b) => a + b, 0), lot = sellable[0];
    for (let i = 0; i < sellable.length; i++) { r -= weights[i]; if (r <= 0) { lot = sellable[i]; break; } }
    const it = IT[lot.item];
    enc.lot = lot.id; enc.item = lot.item;
    enc.qty = Math.min(lot.qty, 1 + Math.floor(rnd(k + 'q') * (it.base >= 30 ? 1 : 3)));
    let p = price(lot.item) * (0.95 + rnd(k + 'p') * 0.14) * (S.stance === '外放' ? 1.03 : 1);
    enc.price = rp(p);
    enc.th.push({ k: 'narr', t: `${who}進了門。` });
    enc.th.push({ k: 'npc', t: `「掌櫃的，${it.name}有嗎？${cnNum(enc.qty)}${it.unit}，${cnPrice(enc.price)}一${it.unit}。」` });
    S.codex[lot.item] = true;
  } else {
    enc.th.push({ k: 'narr', t: `${who}進了門，看了一圈，什麼都沒買。` });
  }
  S.enc = enc; S.phase = 'enc';
}
function actChat() {
  const e = S.enc; e.chatted = true; e.tea -= 1;
  e.th.push({ k: 'me', t: '最近坊市裡有什麼新鮮事？' });
  const pool = D.news.gossip[S.day] || [];
  const give = S.stance === '收斂' || rnd('g' + S.day + S.slot) < 0.3;
  S.gossipSeen = S.gossipSeen || {};
  const line = pool.find(g => !S.gossipSeen[g]);
  if (give && line) { S.gossipSeen[line] = true; e.th.push({ k: 'npc', t: `「${line}」` }); }
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
    if (!l) return;
    const unit = key === 'honest' ? rp(e.price * l.q) : e.price;
    const q = Math.min(e.qty, l.qty);
    takeQty(l.item, q, l.id); S.stones += unit * q;
    if (key === 'honest') { S.rep.loose += 1; S.repTag.loose = '實在'; e.th.push({ k: 'res', t: `你把成色說清楚了。他想了想，照成色付了錢：「許掌櫃實在。」`, notes: ['＋' + fmt(unit * q) + ' 靈石'] }); }
    else { e.th.push({ k: 'res', t: '他付了錢，把東西收好走了。', notes: ['＋' + fmt(unit * q) + ' 靈石'] }); if (l.q < 0.7) scheduleComplaint(l, q, unit); }
    e.done = { key, label: key === 'honest' ? '照實' : '賣出' };
    S.log.push({ day: S.day, t: `散客買走${IT[l.item].name}×${q}` });
  } else { e.done = { key, label: '送客' }; e.th.push({ k: 'res', t: '他走了。' }); }
}
function closeEnc() {
  const e = S.enc; if (!e) return;
  const from = e.from;
  S.enc = null;
  if (from === 'shop') { S.phase = 'day'; advanceSlot(); }
  else if (from === 'dues') { S.phase = 'night'; }
  else { S.phase = 'place'; }
}
function startDues() { S.dues = { paid: false }; startDeal('d18', 'dues'); }

/* ================= places ================= */
function placeOpen(id) {
  const p = PL[id]; if (!p) return false;
  if (p.days && !p.days.includes(S.day)) return false;
  if (p.closed && p.closed.includes(S.day)) return 'closed';
  return p.hours.includes(S.slot);
}
function enterPlace(id) {
  S.place = { id, acted: false, homeSeen: null }; S.phase = 'place';
  const p = PL[id]; if (p.npc) S.met[p.npc] = true;
  if (id === 'huichun') { (p.sells || []).forEach(s => { S.codex[s.item] = true; }); (p.display || []).forEach(x => { S.codex[x] = true; }); }
  if (id === 'pawn') S.codex.dangpiao = true;
}
function leavePlace() { advanceSlot(); }
function stallsToday() { return PL.market.stalls.filter(s => S.day >= s.days[0] && S.day <= s.days[1]); }
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
  S.place.say = PL.smith.buys[l.item].say; S.place.sayWho = 'tie'; toast(`賣給鐵老蔫，＋${fmt(total)} 靈石`);
}
function commission() {
  const c = PL.smith.commission;
  if (held(c.needItem) < c.needQty || S.stones < c.fee || S.commission) return;
  takeQty(c.needItem, c.needQty); S.stones -= c.fee; S.commission = { ready: S.day + c.days, done: false, cost: c.fee + 8 * c.needQty };
  S.homes.tie = true; addRel('tie', 1); S.place.say = c.say; S.place.sayWho = 'tie'; toast('鐵老蔫接了活。三天。');
}
function huichunOffer(l) {
  const it = IT[l.item]; if (!(it.sell || []).includes('huichun')) return null;
  if (l.flags.some(f => ['sect', 'sting', 'stolen'].includes(f))) return 'refuse-sect';
  if (l.flags.includes('painted')) return 'refuse-paint';
  return rp(price(l.item) * PL.huichun.buyMult * l.q);
}
function sellToHuichun(id) {
  const l = lotById(id), o = huichunOffer(l); if (!l || o == null) return;
  if (o === 'refuse-sect') { S.place.say = '「寒潭宗的東西，回春堂不收。許掌櫃，這東西你最好別留。」'; l.known = true; return; }
  if (o === 'refuse-paint') { S.place.say = '張掌事把葉子翻過來，對著光看了一眼：「金線是畫的。許掌櫃，回春堂不收這種東西。」'; l.known = true; addRel('zhang', -1); S.flags.zhang_saw_fake = true; return; }
  const total = o * l.qty; S.stones += total; l.known = true; S.lots = S.lots.filter(x => x !== l);
  S.place.say = l.q < 0.9 ? `「成色差了些，${cnPrice(o)}一${IT[l.item].unit}。」張掌事慢慢點了靈石。` : '張掌事點了點頭，慢慢點了靈石。';
  toast(`賣給回春堂，＋${fmt(total)} 靈石`);
}
function buyFromHuichun(item) {
  const s = PL.huichun.sells.find(x => x.item === item), p = rp(price(item) * s.mult);
  if (S.stones < p) { toast('靈石不夠'); return; }
  S.stones -= p; addLot({ item, qty: 1, cost: p, known: true }); toast(`買了一${IT[item].unit}${IT[item].name}`);
}
function herbStock() { return PL.herbStock.find(h => S.day >= h.days[0] && S.day <= h.days[1]); }
function buyHerb() {
  const h = herbStock(); const n = S.herbBought[S.day] || 0;
  if (!h || n >= h.max || S.stones < h.price) return;
  S.stones -= h.price; S.herbBought[S.day] = n + 1; S.met.ge = true;
  const ex = S.lots.find(l => l.from === 'ge' + S.day);
  if (ex) ex.qty++; else addLot({ item: h.item, qty: 1, cost: h.price, q: h.q, label: h.q < 0.7 ? '老葛的赤炎草（早熟）' : '老葛的赤炎草', known: true, from: 'ge' + S.day });
}
function buyTea(i) {
  const t = D.news.teahouse.filter(x => x.day === S.day)[i]; if (!t) return;
  const b = S.teaBought[S.day] = S.teaBought[S.day] || [];
  if (b.includes(i) || S.stones < t.price) return;
  S.stones -= t.price; b.push(i); S.log.push({ day: S.day, t: '聽雨樓：' + t.text, rumor: true });
}
function overhear() { if (S.overheard[S.day]) return; S.overheard[S.day] = true; }
function askBai(who) {
  const c = PL.tea.askCost; if (S.stones < c) { toast('靈石不夠'); return; }
  S.stones -= c; S.place.say = '「' + (PL.tea.about[who] || '這個人，我不熟。') + '」'; S.place.sayWho = 'bai'; UI.sheet = null;
  addMem(who, '白七娘說：' + (PL.tea.about[who] || ''));
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
      text = `周執事收下玉匣，記了一筆，給了你 ${reward} 塊。你把一半包好，託人送去給阿蘅。`;
      addMem('aheng', '你把賞錢分了她一半。');
    } else if (answer === 'aheng') {
      S.stones += reward; addRel(z, 2); addRel('aheng', -5); S.flags.aheng_taken = true; S.rep.loose -= 2; S.repTag.loose = '會報官'; S.rep.sect += 1;
      text = `「採藥的阿蘅？」周執事記下了名字，給了你 ${reward} 塊：「許掌櫃明事理。」`;
      addMem('aheng', '你把她的名字報給了執事堂。');
    } else {
      S.stones += reward; addRel(z, -1);
      text = `「路過的散修？」周執事看了你很久，還是給了你 ${reward} 塊：「下回記清楚些。」`;
    }
    S.flags.xuechan_turned = true; S.place.say = text; addMem(z, '你交出了寒潭宗的雪蟾酥。');
  }
  if (kind === 'duanshui') {
    const lot = S.lots.find(l => l.item === 'duanshui'); if (!lot) return;
    S.lots = S.lots.filter(l => l !== lot); S.stones += 20; addRel(z, 1); S.flags.knife_turned = true;
    S.place.say = '周執事接過刀，翻過來看了看刀柄：「余小六的刀。」他給了你二十塊。';
  }
  if (kind === 'sting') {
    S.lots = S.lots.filter(l => !l.flags.includes('sting')); S.events = S.events.filter(e => e.id !== 'e_sting'); addRel(z, 1); S.flags.passed_sting = true;
    S.place.say = '周執事看著那三枚療傷丹，笑了：「你倒是機靈。」他把丹藥收了，沒罰你。';
  }
  UI.sheet = null;
}
function redeem() { if (S.stones < M.redeemCost) return; S.stones -= M.redeemCost; S.lifespan++; S.place.say = '「許公子贖回一個月。」典主在當票上添了一筆。'; }
function visitHome(npc) { S.place.homeSeen = npc; S.place.acted = true; S.met[npc] = true;
  if (npc === 'yao') { S.flags.knows_yao_paints = true; addMem('yao', '家裡桌上有一碟金粉和一支極細的狼毫筆，筆尖是濕的。'); }
  if (npc === 'aheng') { S.flags.saw_aheng_home = true; addMem('aheng', '門口有一雙男人的鞋，鞋底是鬼市巷子的黑泥。'); }
  if (npc === 'tie') addMem('tie', '屋裡有一張給孩子坐的小板凳。');
}
function homesKnown() { return Object.keys(NP).filter(n => NP[n].home && (S.homes[n] || (n === 'aheng' && (rel('aheng') >= 2 || S.flags.aheng_entrust)))); }

/* ================= night ================= */
function meditate(invest, burn, pill) {
  invest = Math.max(0, Math.min(invest, S.stones, M.nightCap));
  let gain = invest * (burn ? 1.4 : 1);
  if (burn) takeQty('dingshen', 1);
  if (pill) { takeQty('yangqi', 1); gain += S.pillYesterday ? 9 : 18; }
  S.stones -= invest; S.xp += Math.round(gain); S.pillYesterday = !!pill;
  const before = S.level; let need = M.xpNeed[S.level];
  while (S.level < 9 && S.xp >= need) { S.xp -= need; S.level++; need = M.xpNeed[S.level]; }
  S.night = { invest, gain: Math.round(gain), up: S.level > before };
}
function netWorth(trueQ = true) { return S.stones + S.lots.reduce((a, l) => a + lotValue(l, Math.min(S.day, M.days), trueQ), 0) - S.debt; }

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
  const dn = M.dayNames[Math.min(S.day, M.days) - 1] || '月底';
  const tag = S.day === M.marketDay ? '市集日' : S.day === M.days ? '月底' : '';
  const slots = ['辰', '午', '申', '戌'].map((s, i) => {
    const cur = S.phase === 'end' ? 4 : S.phase === 'morning' ? -1 : (S.phase === 'night' || S.phase === 'dues' || S.slot >= 3) ? 3 : S.slot;
    return `<span class="${i < cur ? 'past' : i === cur ? 'now' : ''}">${s}</span>`;
  }).join('');
  const need = M.xpNeed[S.level];
  const sp = M.spirit[S.level] || 2;
  $hud.innerHTML = `<div class="hud-top"><div class="hud-day">${dn}${tag ? `<span class="tagline">${tag}</span>` : ''}</div><div class="track" aria-label="時辰">${slots}</div></div>
  <div class="hud-stats"><span class="stone">靈石 <b>${fmt(S.stones)}</b></span><span>${lvName(S.level)}<span class="xpbar" title="修為 ${S.xp}/${need}"><i style="width:${Math.min(100, S.xp / need * 100)}%"></i></span></span><span>靈識 <span class="dots">${'●'.repeat(S.spirit)}<s>${'●'.repeat(Math.max(0, sp - S.spirit))}</s></span></span>
  <span class="stance" role="group" aria-label="氣息"><button data-act="stance" data-v="收斂" class="${S.stance === '收斂' ? 'on' : ''}">收斂</button><button data-act="stance" data-v="外放" class="${S.stance === '外放' ? 'on' : ''}">外放</button></span></div>`;
}

function renderTitle() {
  const saved = S && S.phase !== 'end';
  return `<section class="title">
    <div class="stack">
      <div class="ticket"><span class="label">長生典 · 當票</span><p class="q">${esc(D.intro.ticket)}</p><div class="left">尚餘${monthsText(M.lifespan)}</div>
      <svg class="seal" viewBox="0 0 60 60" aria-hidden="true"><rect x="4" y="4" width="52" height="52" rx="4" fill="none" stroke="var(--cinnabar)" stroke-width="3"/><text x="30" y="27" text-anchor="middle" font-family="var(--serif)" font-weight="900" font-size="17" fill="var(--cinnabar)">長生</text><text x="30" y="47" text-anchor="middle" font-family="var(--serif)" font-weight="900" font-size="17" fill="var(--cinnabar)">典押</text></svg></div>
      <p class="lede">${esc(D.intro.lede)}</p>
    </div>
    <h1 class="title-v">坊市掌櫃<small>許記 · 第一個月</small></h1>
  </section>
  <section class="card stack"><p class="lede">${esc(D.intro.how)}</p><p class="lede small muted">${esc(D.intro.stance)}</p><p class="lede"><b>${esc(D.intro.goal)}</b></p></section>
  <div class="title-actions">${saved ? `<button class="btn primary wide" data-act="continue">繼續：${M.dayNames[Math.min(S.day, M.days) - 1]}</button><button class="btn quiet wide" data-act="askrestart">重新開始</button>` : `<button class="btn primary wide" data-act="new">開張</button>`}</div>`;
}

function newsHTML(id, short) {
  const n = NEWS.find(x => x.id === id);
  const goods = (n.goods || []).map(g => IT[g] ? IT[g].name : g).join('、');
  return `<div class="newscard"><div class="src">${esc(n.source)}</div><div class="txt">${esc(n.text)}</div>${!short && (goods || (n.ask || []).length) ? `<div class="meta">${goods ? '牽動：' + esc(goods) : ''}${goods && n.ask.length ? '　·　' : ''}${n.ask && n.ask.length ? '打聽：' + esc(n.ask.join('、')) : ''}</div>` : ''}</div>`;
}
function renderMorning() {
  const cards = S.cards.map(c => `<div class="event"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>${c.notes && c.notes.length ? `<div class="fxline">${esc(c.notes.join('　'))}</div>` : ''}</div>`).join('');
  return `<h2 class="sec-h">晨報</h2>${cards ? `<div class="stack">${cards}</div>` : ''}
  <div class="card" style="margin-top:12px">${S.todayNews.map(id => newsHTML(id)).join('') || '<p class="muted">今天坊市很安靜。</p>'}</div>
  <p class="small muted" style="margin-top:10px">消息不保證是真的。放消息的人，通常最想讓它成真。</p>`;
}

function renderHub() {
  let h = `<div class="ticket" style="margin-top:14px;padding:8px 12px"><span class="label">長生典</span>　<b class="cin">尚餘${monthsText(S.lifespan)}</b>${S.debt ? `　<span class="pill cin">欠錢記 ${fmt(S.debt)}</span>` : ''}</div>`;
  if (S.todayNews.length) h += `<details class="card" style="margin-top:10px"><summary class="small muted">今天的消息（${S.todayNews.length}）</summary>${S.todayNews.map(id => newsHTML(id, true)).join('')}</details>`;
  if (S.slot < 3) {
    h += `<h2 class="sec-h">${SLOT[S.slot]}</h2><div class="choice">
      <button class="go" data-act="shop"><div><div class="gt">顧店</div><div class="gd">坐在櫃檯後面，等客人上門。${S.flags.lamp ? '狐尾燈亮著。' : ''}</div></div><span class="arrow">›</span></button></div>
      <h2 class="sec-h">出門</h2><div class="places">`;
    for (const id of ['market', 'huichun', 'tea', 'office', 'herb', 'homes', 'pawn']) {
      const p = PL[id]; const o = placeOpen(id);
      if (p.days && !p.days.includes(S.day)) continue;
      let note = '';
      if (o === 'closed') note = '今天封路';
      else if (!o) note = '這個時辰沒開（' + p.hours.map(x => SLOT[x][0]).join('、') + '）';
      else if (id === 'market') note = S.day === M.marketDay ? '市集日，攤子加倍' : stallsToday().map(s => NP[s.npc].name).join('、');
      else if (id === 'homes') note = homesKnown().length ? '知道 ' + homesKnown().length + ' 處住址' : '還不知道誰住哪';
      else if (p.npc) note = NP[p.npc].name + (id === 'tea' ? '　消息、偷聽' : id === 'office' ? (S.flags.bounty_seen ? '　懸賞' : '') : '');
      h += `<button class="place" data-act="enter" data-id="${id}" ${o === true ? '' : 'disabled'}><b>${esc(p.name)}</b><span>${esc(note)}</span></button>`;
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
    return `<div class="goods${e.done ? ' done' : ''}"><div class="g-grade">${esc(it.grade)}　·　你的貨：${esc(l ? l.label : it.name)}</div><div class="g-name">${esc(it.name)} × ${e.qty}</div>
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
  return `<div class="goods${e.done ? ' done' : ''}">${it ? `<div class="g-grade">${esc(it.grade)}</div>` : ''}<div class="g-name">${esc(name)}${e.qty > 1 ? ' × ' + e.qty : ''}</div>
    <div class="g-price">${price_}</div>${lots}${it && it.text ? `<button class="g-link" data-act="lore" data-id="${d.item}">物品文本</button>` : ''}${e.done ? sealSVG(e.done.label) : ''}</div>`;
}
function renderEnc() {
  const e = S.enc;
  let head;
  if (e.generic) head = `<div class="who"><div><div class="nm">散客</div><div class="rl">${esc(e.who)}</div></div><div class="tea">${teaSVG(e.tea / e.teaMax)}<span>${teaWord(e.tea / e.teaMax)}</span></div></div>`;
  else { const n = NP[e.npc]; head = `<div class="who"><div><div class="nm">${esc(n.name)}</div><div class="rl">${esc(n.role)}</div><div class="lv muted">${esc(npcLv(e.npc))}${S.rel[e.npc] ? '　·　' + attitude(e.npc) : ''}</div></div><div class="tea" title="對方的耐心">${teaSVG(e.tea / e.teaMax)}<span>${teaWord(e.tea / e.teaMax)}</span></div></div>`; }
  const th = e.th.map(x => {
    if (x.k === 'npc') return `<div class="ln"><span class="sp">${esc(x.who ? NP[x.who].name : e.generic ? '散客' : NP[e.npc].name)}</span><span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'me') return `<div class="ln me"><span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'sys') return `<div class="ln sys"><span class="label">靈識</span><span class="tx">${esc(x.t)}</span></div>`;
    if (x.k === 'res') return `<div class="ln res"><span class="tx">${esc(x.t)}</span>${x.notes && x.notes.length ? `<span class="small muted">${esc(x.notes.join('　'))}</span>` : ''}</div>`;
    return `<div class="ln ${x.k}"><span class="tx">${esc(x.t)}</span></div>`;
  }).join('');
  return `${head}${goodsCard(e)}<div class="thread" id="thread">${th}</div>`;
}

function renderPlace() {
  const id = S.place.id, p = PL[id];
  let h = `<div class="who"><div><div class="nm">${esc(p.name)}</div><div class="rl">${esc(SLOT[S.slot] || '')}</div></div></div><p class="serif" style="margin-top:8px;line-height:1.85">${esc(p.blurb)}${id === 'market' && S.day === M.marketDay ? ' ' + esc(p.blurbMarketDay) : ''}</p>`;
  if (S.place.say) h += `<div class="ln" style="margin-top:12px">${S.place.sayWho || p.npc ? `<span class="sp">${esc(NP[S.place.sayWho || p.npc].name)}</span>` : ''}<span class="tx">${esc(S.place.say)}</span></div>`;
  if (id === 'market') {
    h += `<h2 class="sec-h">攤子</h2><div class="stack">`;
    for (const s of stallsToday()) {
      const n = NP[s.npc];
      if (s.special === 'smith') { h += smithHTML(s); continue; }
      const d = DEALS[s.deal], done = S.done[s.deal];
      const avail = d && dealAvail(d);
      h += `<div class="person"><div class="ph"><b>${esc(n.name)}</b><span class="small muted">${esc(n.role)}</span></div><p class="serif small">${esc(s.goods)}</p>
        ${avail ? `<button class="btn quiet" data-act="deal" data-id="${s.deal}">上前看看</button>` : `<span class="small muted">${done ? '已經談過了。' : '今天沒有你的事。'}</span>`}${s.npc === 'mang' && done !== 'special' && S.flags.mang_saw_jiansui && held('yupai') && !S.flags.mang_saw_yupai ? `<button class="btn quiet" data-act="mangyupai">給她看霜紋玉牌</button>` : ''}</div>`;
    }
    h += `</div>`;
    if (S.day === M.marketDay) h += `<h2 class="sec-h">擺攤</h2><p class="small muted">市集日可以自己擺個攤，客人多是逛街的散修，賣得快、利薄。照市價九五折，最多擺三批貨。</p><button class="btn quiet wide" data-act="stall" ${S.place.stalled ? 'disabled' : ''}>${S.place.stalled ? '今天擺過了' : '擺攤'}</button>`;
  }
  if (id === 'huichun') {
    h += `<h2 class="sec-h">藥櫃</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>貨</th><th class="r">價</th><th></th></tr></thead><tbody>`;
    for (const s of p.sells) { const pr = rp(price(s.item) * s.mult); h += `<tr><td><button class="g-link" style="margin:0" data-act="lore" data-id="${s.item}">${esc(IT[s.item].name)}</button><div class="small muted">${esc(IT[s.item].grade)}</div></td><td class="r">${fmt(pr)}</td><td class="r"><button class="btn quiet" style="min-height:34px" data-act="hbuy" data-id="${s.item}" ${S.stones < pr ? 'disabled' : ''}>買一${esc(IT[s.item].unit)}</button></td></tr>`; }
    for (const x of p.display) h += `<tr><td><button class="g-link" style="margin:0" data-act="lore" data-id="${x}">${esc(IT[x].name)}</button><div class="small muted">${esc(IT[x].stat)}</div></td><td class="r muted">—</td><td></td></tr>`;
    h += `</tbody></table></div><h2 class="sec-h">賣給回春堂</h2>`;
    const mine = S.lots.filter(l => (IT[l.item].sell || []).includes('huichun'));
    h += mine.length ? `<div class="stack">${mine.map(l => { const o = huichunOffer(l); return `<div class="row"><span class="serif" style="flex:1;min-width:0">${esc(l.label)} × ${l.qty}</span><button class="btn quiet" data-act="hsell" data-id="${l.id}">${typeof o === 'number' ? '賣 ' + fmt(o * l.qty) : '問問看'}</button></div>`; }).join('')}</div><p class="small muted" style="margin-top:6px">回春堂照市價八折收，成色照實算。張掌事看得出金線真假。</p>` : `<p class="small muted">你手上沒有回春堂收的貨。</p>`;
  }
  if (id === 'tea') {
    if (DEALS.d20 && dealAvail(DEALS.d20)) h += `<button class="go" style="margin-top:12px" data-act="deal" data-id="d20"><div><div class="gt">窗邊的人</div><div class="gd">窗邊有個戴鬼面的人，朝你招了招手。</div></div><span class="arrow">›</span></button>`;
    const list = D.news.teahouse.filter(x => x.day === S.day), bought = S.teaBought[S.day] || [];
    h += `<h2 class="sec-h">消息單</h2><div class="stack">${list.map((t, i) => bought.includes(i) ? `<div class="newscard"><div class="src">買到的消息</div><div class="txt">${esc(t.text)}</div></div>` : `<div class="row"><span class="small muted" style="flex:1">一則消息</span><button class="btn quiet" data-act="tbuy" data-i="${i}" ${S.stones < t.price ? 'disabled' : ''}>${t.price} 靈石</button></div>`).join('') || '<p class="small muted">今天沒有新消息。</p>'}</div>`;
    const oh = D.news.overhear.find(o => o.day === S.day);
    h += `<h2 class="sec-h">偷聽</h2>${S.overheard[S.day] ? `<div class="ln"><span class="sp">隔壁桌</span><span class="tx">${esc(oh.text)}</span></div>` : `<button class="btn quiet wide" data-act="overhear">挑張桌子坐下</button>`}`;
    h += `<h2 class="sec-h">問白七娘一個人</h2><p class="small muted">每問一個人 ${PL.tea.askCost} 塊靈石。她只說她願意說的。</p><button class="btn quiet wide" data-act="askbai">問……</button>`;
  }
  if (id === 'office') {
    const n = NP.zhou;
    h += `<div class="ln" style="margin-top:12px"><span class="sp">${esc(n.name)}</span><span class="tx">${esc(rel('zhou') >= 2 ? '「許掌櫃，有事？」' : rel('zhou') <= -2 ? '「又是你。」' : '「什麼事？」')}</span></div>`;
    if (S.flags.bounty_seen) h += `<h2 class="sec-h">懸賞</h2>${newsHTML('n_bounty', true)}`;
    const acts = [];
    if (held('xuechan')) acts.push(`<button class="opt" data-act="turnxc"><b>交出雪蟾酥</b><span>懸賞${S.flags.bounty_seen ? '六十' : '還沒貼出來，先給四十'}</span></button>`);
    if (held('duanshui') && S.flags.bounty_seen) acts.push(`<button class="opt" data-act="turn" data-k="duanshui"><b>交出斷水刀</b><span>余小六的佩刀，賞二十</span></button>`);
    if (holdFlag('sting')) acts.push(`<button class="opt" data-act="turn" data-k="sting"><b>交出柳郎中的療傷丹</b><span>瓶底有執事堂的印</span></button>`);
    h += acts.length ? `<h2 class="sec-h">交東西</h2>${acts.join('')}` : '';
  }
  if (id === 'herb') {
    if (placeOpen('herb') === 'closed') h += `<p class="serif" style="margin-top:12px">${esc(p.closedText)}</p>`;
    else {
      const hs = herbStock(), n = S.herbBought[S.day] || 0;
      if (DEALS.d05 && dealAvail(DEALS.d05)) h += `<button class="go" style="margin-top:12px" data-act="deal" data-id="d05"><div><div class="gt">背藥簍的姑娘</div><div class="gd">田埂盡頭站著一個背藥簍的姑娘，簍裡的赤炎草還帶著土。</div></div><span class="arrow">›</span></button>`;
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
    h += `<div class="ln" style="margin-top:12px"><span class="sp">${esc(NP.dianzhu.name)}</span><span class="tx">「許公子，尚餘${monthsText(S.lifespan)}。」</span></div>
      <div class="card" style="margin-top:12px"><div class="lore">${esc(IT.dangpiao.text)}</div></div>
      <button class="opt" data-act="redeem" ${S.stones < M.redeemCost ? 'disabled' : ''}><b>贖回一個月壽元</b><span>${M.redeemCost} 靈石。越贖越貴。</span></button>`;
  }
  return h;
}
function smithHTML(s) {
  const n = NP.tie, c = PL.smith.commission;
  const mine = S.lots.filter(l => PL.smith.buys[l.item]);
  let h = `<div class="person"><div class="ph"><b>${esc(n.name)}</b><span class="small muted">${esc(n.role)}</span></div><p class="serif small">${esc(s.goods)}</p>`;
  h += mine.length ? mine.map(l => { const o = smithOffer(l); const tot = PL.smith.buys[l.item].fixed ? o : o * l.qty; return `<div class="row"><span class="small" style="flex:1;min-width:0">${esc(l.label)} × ${l.qty}</span><button class="btn quiet" style="min-height:34px" data-act="ssell" data-id="${l.id}">賣 ${fmt(tot)}</button></div>`; }).join('') : `<span class="small muted">他收寒鐵、狼牙、刀，和會發燙的石頭。</span>`;
  if (S.commission && !S.commission.done) h += `<span class="small muted">訂的刀，${M.dayNames[S.commission.ready - 1]}好。</span>`;
  else if (!S.commission) h += `<button class="btn quiet" data-act="commission" ${held(c.needItem) < c.needQty || S.stones < c.fee ? 'disabled' : ''}>訂一把寒鐵短刀（${c.needQty}斤寒鐵＋${c.fee}靈石，三天）</button>`;
  return h + `</div>`;
}

function renderNight() {
  if (S.phase === 'dues') return '';
  const n = S.night;
  const need = M.xpNeed[S.level];
  if (n) {
    const dayDelta = S.stones - S.dayStartStones;
    return `<section class="night stack"><h2>夜</h2><p class="serif">${n.invest || n.gain ? `你點了燈，打坐到三更。修為增加 ${n.gain}。` : '你沒有打坐，早早睡了。'}${n.up ? `<br><b class="jade">突破了。你現在是${lvName(S.level)}。靈識也寬了一些。</b>` : ''}</p>
      <div class="card"><div class="row"><span class="label" style="flex:1">今天的靈石</span><b class="num ${dayDelta >= 0 ? 'down' : 'up'}">${dayDelta >= 0 ? '＋' : '－'}${fmt(Math.abs(dayDelta))}</b></div><div class="row"><span class="label" style="flex:1">修為</span><b class="num">${S.xp} / ${need}</b></div></div></section>`;
  }
  const max = Math.min(M.nightCap, Math.floor(S.stones));
  const inv = Math.min(UI.night.invest, max);
  const burnable = held('dingshen') > 0, pillable = held('yangqi') > 0;
  const burn = UI.night.burn && burnable, pill = UI.night.pill && pillable;
  const gain = nightGain(inv, burn, pill);
  return `<section class="night stack"><h2>夜．打坐</h2><p class="serif muted">鋪子關了門。靈石可以拿去做明天的生意，也可以今晚吃成修為。</p>
    <div class="card stack"><div class="row"><span class="label" style="flex:1">投入靈石</span><b class="num gold" id="inv-val">${inv}</b></div>
    <input type="range" id="invest" min="0" max="${max}" step="1" value="${inv}" aria-label="投入靈石">
    <label class="check"><input type="checkbox" id="burn" ${burn ? 'checked' : ''} ${burnable ? '' : 'disabled'}><span>點一束定神香（修為加四成）<br><span class="small muted">你有 ${held('dingshen')} 束　·　今日市價 ${fmt(price('dingshen'))}</span></span></label>
    <label class="check"><input type="checkbox" id="pill" ${pill ? 'checked' : ''} ${pillable ? '' : 'disabled'}><span>服一枚養氣丹（修為＋${S.pillYesterday ? 9 : 18}${S.pillYesterday ? '，昨晚吃過，藥力減半' : ''}）<br><span class="small muted">你有 ${held('yangqi')} 枚</span></span></label>
    <div class="row"><span class="label" style="flex:1">今晚修為</span><b class="num jade" id="gain-val">＋${gain}</b><span class="small muted" id="xp-to">${S.xp} → ${S.xp + gain} / ${need}</span></div></div></section>`;
}
function nightGain(inv, burn, pill) { return Math.round(inv * (burn ? 1.4 : 1) + (pill ? (S.pillYesterday ? 9 : 18) : 0)); }
function updateNight() {
  const max = Math.min(M.nightCap, Math.floor(S.stones)), inv = Math.min(UI.night.invest, max);
  const burn = UI.night.burn && held('dingshen') > 0, pill = UI.night.pill && held('yangqi') > 0;
  const g = nightGain(inv, burn, pill), need = M.xpNeed[S.level];
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('inv-val', inv); set('gain-val', '＋' + g); set('xp-to', `${S.xp} → ${S.xp + g} / ${need}`);
  const b = document.querySelector('[data-act="meditate"]'); if (b) b.textContent = inv || pill ? '打坐' : '不打坐，睡覺';
}

function renderEnd() {
  const counted = COUNTED.filter(id => S.done[id] && S.done[id] !== 'missed' && S.done[id] !== 'na');
  const missed = COUNTED.length - counted.length;
  const nw = netWorth(true);
  const mistakes = S.stats.fooled + S.stats.wronged;
  const grade = S.flags.debt || mistakes >= 4 ? '下' : (S.level >= 5 && mistakes <= 1) ? '上' : '中';
  const T = M.truthLabels;
  const truths = counted.map(id => { const d = DEALS[id]; const t = d.truth; return `<div class="truth"><b>${esc(d.title.includes(NP[d.npc].name) ? d.title : NP[d.npc].name + '：' + d.title)}</b><div class="t3"><span class="pill">${esc(T.goods[t.goods])}</span><span class="pill">${esc(T.origin[t.origin])}</span><span class="pill ${t.intent === 'plain' ? '' : 'cin'}">${esc(T.intent[t.intent])}</span></div><span class="small muted">你的處置：${esc(labelOf(id, S.done[id]))}</span></div>`; }).join('');
  return `<section class="stack" style="padding-top:18px">
    <div class="row"><div><span class="label">第一個月</span><div class="grade">${grade}等</div></div><div style="margin-left:auto;text-align:right"><span class="label">長生典</span><div class="serif cin" style="font-size:20px;font-weight:700">尚餘${monthsText(S.lifespan - 1)}</div></div></div>
    ${S.cards.length ? `<div class="stack">${S.cards.map(c => `<div class="event"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>`).join('')}</div>` : ''}
    <p class="serif" style="line-height:1.95">${esc(grade === '上' ? D.endings.top : grade === '中' ? D.endings.mid : S.flags.debt ? D.endings.low : D.endings.lowFooled)}</p>
    <div class="card"><table class="tbl"><tbody>
      <tr><td>靈石</td><td class="r">${fmt(S.stones)}</td></tr>
      <tr><td>庫房（照真實成色）</td><td class="r">${fmt(S.lots.reduce((a, l) => a + lotValue(l, M.days, true), 0))}</td></tr>
      ${S.debt ? `<tr><td>欠錢不語</td><td class="r cin">－${fmt(S.debt)}</td></tr>` : ''}
      <tr><td><b>身家</b></td><td class="r"><b>${fmt(nw)}</b></td></tr>
      <tr><td>修為</td><td class="r">${lvName(S.level)}　${S.xp}/${M.xpNeed[S.level]}</td></tr>
      <tr><td>看穿</td><td class="r">${S.stats.saw}</td></tr><tr><td>吃虧</td><td class="r">${S.stats.fooled}</td></tr><tr><td>錯怪好人</td><td class="r">${S.stats.wronged}</td></tr>
      <tr><td>這個月錯過的生意</td><td class="r">${missed} 筆</td></tr>
    </tbody></table></div>
    <h2 class="sec-h">這個月的真相</h2><div>${truths || '<p class="muted">這個月你沒談成什麼生意。</p>'}</div>
    <p class="serif muted" style="margin-top:6px">${esc(D.endings.next)}</p>
    <button class="btn primary wide" data-act="new">再開一次張</button></section>`;
}
function labelOf(id, key) {
  const d = DEALS[id], o = d.opts[key];
  if (!o) return key;
  if (o.label) return o.label;
  return ({ deal: d.side === 'sell' ? '買下' : d.side === 'buy' ? '賣給他' : '答應', decline: '婉拒', expose: '拆穿', report: '報執事堂', refer: '轉介給錢記' })[key] || key;
}

function renderStore() {
  const lots = S.lots.map(l => { const it = IT[l.item]; const v = it.base ? lotValue(l) : 0; const flags = l.known ? l.flags.map(f => ({ painted: '金線是畫的', damp: '受潮', stolen: '燙手', sting: '瓶底有印', sect: '寒潭宗的東西', alive: '活取', entrusted: '阿蘅託付' })[f]).filter(Boolean) : [];
    return `<tr><td><button class="g-link" style="margin:0" data-act="lore" data-id="${l.item}">${esc(l.label)}</button>${flags.length ? `<div class="small cin">${esc(flags.join('、'))}${l.known && l.q < 0.9 ? '，成色' + Math.round(l.q * 10) + '成' : ''}</div>` : ''}${l.perishDay ? `<div class="small cin">${M.dayNames[l.perishDay - 1] || ''}化</div>` : ''}</td><td class="r">${l.qty}</td><td class="r">${fmt(l.cost)}</td><td class="r">${it.base ? fmt(v) : '—'}</td><td class="r">${!l.known && S.spirit > 0 ? `<button class="btn quiet" style="min-height:32px;font-size:13px" data-act="lotapp" data-id="${l.id}">鑑定</button>` : ''}</td></tr>`; }).join('');
  const items = Object.keys(IT).filter(k => IT[k].base && IT[k].base < 100 && S.codex[k]);
  const board = items.map(k => { const p = price(k), y = S.day > 1 ? price(k, S.day - 1) : p; const ch = p > y ? `<span class="up">▲</span>` : p < y ? `<span class="down">▼</span>` : ''; return `<tr><td class="nm">${esc(IT[k].name)}</td><td class="r">${fmt(p)} ${ch}</td><td class="r muted">${esc(IT[k].unit)}</td></tr>`; }).join('');
  return `<h2 class="sec-h">庫房</h2>${S.lots.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>貨</th><th class="r">數</th><th class="r">成本</th><th class="r">估值</th><th></th></tr></thead><tbody>${lots}</tbody></table></div><p class="small muted" style="margin-top:6px">估值照今日市價。成色你沒看過的，照賣家的說法算。鑑定一批貨，花一點靈識。</p>` : '<p class="muted">庫房空了。</p>'}
    <h2 class="sec-h">今日市價</h2><div class="tbl-wrap"><table class="tbl"><tbody>${board}</tbody></table></div><p class="small muted" style="margin-top:6px">只列你見過的貨。紅漲綠跌。</p>`;
}
function renderPeople() {
  const T = { loose: '散修圈', sect: '宗門圈', ghost: '鬼市' };
  const rep = Object.keys(T).filter(k => S.repTag[k] || S.rep[k]).map(k => `<div class="row"><span class="label" style="flex:1">${T[k]}說你</span><b class="serif">${esc(S.repTag[k] || (S.rep[k] > 0 ? '還行' : '不怎麼樣'))}</b></div>`).join('');
  const people = Object.keys(S.met).filter(n => NP[n] && n !== 'dianzhu').sort((a, b) => (NP[a].oneoff ? 1 : 0) - (NP[b].oneoff ? 1 : 0));
  const tagset = ['未定', '可信', '存疑', '不可信'];
  const cards = people.map(n => { const p = NP[n], m = S.mem[n] || [];
    return `<div class="person"><div class="ph"><b>${esc(p.name)}</b><span class="small muted">${esc(p.role)}　·　${esc(npcLv(n))}</span><span class="pill" style="margin-left:auto">${attitude(n)}</span></div>
      <p class="small">${esc(p.surface)}</p>${S.homes[n] ? '<span class="small jade">知道住處</span>' : ''}
      ${m.length ? `<ul>${m.map(x => `<li>${esc(M.dayNames[x.day - 1])}　${esc(x.t)}</li>`).join('')}</ul>` : ''}
      <div class="tags" role="group" aria-label="你的標籤">${tagset.map(t => `<button data-act="tag" data-id="${n}" data-v="${t}" class="${(S.tags[n] || '未定') === t ? 'on' : ''}">${t}</button>`).join('')}</div>
      <textarea id="note-${n}" data-note="${n}" placeholder="你的備註">${esc(S.notes[n] || '')}</textarea></div>`; }).join('');
  return `<h2 class="sec-h">名聲</h2><div class="card stack">${rep || '<p class="small muted">還沒有人說你什麼。</p>'}</div><h2 class="sec-h">人脈簿</h2><p class="small muted" style="margin-bottom:8px">遊戲不替你下結論。標籤是你自己貼的，貼錯了也是你的事。</p><div class="stack">${cards || '<p class="muted">還沒見過什麼人。</p>'}</div>`;
}
function renderCodex() {
  const keys = Object.keys(IT);
  const seen = keys.filter(k => S.codex[k]);
  const grid = keys.map(k => S.codex[k] ? `<button data-act="lore" data-id="${k}"><b>${esc(IT[k].name)}</b><span>${esc(IT[k].grade)}${unlockedHidden(k).length ? '　·　隱藏句 ' + unlockedHidden(k).length : ''}</span></button>` : `<button class="lock" disabled><b>？？？</b><span>未見過</span></button>`).join('');
  const kz = Object.entries(D.kaozheng).filter(([, v]) => needOk(v.need)).map(([, v]) => `<div class="card" style="margin-top:8px"><b class="serif">${esc(v.title)}</b><p class="lore" style="margin-top:6px">${esc(v.text)}</p></div>`).join('');
  return `<h2 class="sec-h">圖鑑　${seen.length}／${keys.length}</h2><div class="codex">${grid}</div>${kz ? `<h2 class="sec-h">考據</h2>${kz}` : ''}`;
}
function unlockedHidden(k) { return (IT[k].hidden || []).filter(h => (h.need.realm && S.level >= h.need.realm) || (h.need.flag && S.flags[h.need.flag])); }

function renderSheet() {
  const sh = UI.sheet; if (!sh) { $sheet.hidden = true; $sheet.innerHTML = ''; return; }
  let h = '';
  if (sh.type === 'lore') {
    const it = IT[sh.id]; S.codex[sh.id] = true;
    h = `<span class="label">${esc(it.grade)}</span><h2>${esc(it.name)}</h2><div class="lore-stat">${esc(it.stat)}${it.base && it.base < 100 ? `　·　今日市價 ${fmt(price(sh.id))}` : ''}</div><div class="lore">${esc(it.text)}</div>${unlockedHidden(sh.id).map(x => `<div class="hidden-line"><span class="label">${esc(x.label)}</span>${esc(x.text)}</div>`).join('')}`;
  } else if (sh.type === 'verify') {
    h = `<h2>查證</h2><p class="small muted">去找人問一問，會花掉一個時辰。對方會等你，但第三方也有自己的立場。</p>` + verifyList().map(v => `<button class="opt" data-act="verifyw" data-id="${v.who}" ${v.used || (v.cost && S.stones < v.cost) ? 'disabled' : ''}><b>${esc(NP[v.who].name)}</b><span>${esc(NP[v.who].role)}${v.cost ? `　·　${v.cost} 靈石` : '　·　不收錢'}${v.used ? '　·　問過了' : ''}</span></button>`).join('');
  } else if (sh.type === 'decide') {
    h = `<h2>處置</h2>` + encOptions().map(o => `<button class="opt ${o.key === 'expose' || o.key === 'report' ? 'danger' : ''}" data-act="decide" data-k="${o.key}" ${o.disabled ? 'disabled' : ''}><b>${esc(o.label)}</b><span>${esc(o.desc || '')}</span></button>`).join('');
  } else if (sh.type === 'askbai') {
    const ps = Object.keys(S.met).filter(n => NP[n] && !NP[n].oneoff && n !== 'bai').concat(['bai']);
    h = `<h2>問白七娘</h2><p class="small muted">每問一個人 ${PL.tea.askCost} 塊靈石。</p>` + ps.map(n => `<button class="opt" data-act="baiwho" data-id="${n}"><b>${esc(NP[n].name)}</b><span>${esc(NP[n].role)}</span></button>`).join('');
  } else if (sh.type === 'turnxc') {
    const lot = S.lots.find(l => l.item === 'xuechan');
    h = `<h2>周執事問：「從哪收的？」</h2>` + (lot && lot.flags.includes('entrusted') ? `<button class="opt" data-act="turnxcw" data-v="entrust"><b>「阿蘅託我交的。」</b><span>賞錢分她一半</span></button>` : `<button class="opt danger" data-act="turnxcw" data-v="aheng"><b>「採藥的阿蘅。」</b><span>說實話</span></button><button class="opt" data-act="turnxcw" data-v="other"><b>「一個路過的散修。」</b><span>他不一定信</span></button>`);
  } else if (sh.type === 'stall') {
    const ls = S.lots.filter(l => IT[l.item].base && (IT[l.item].sell || []).includes('walk') && !l.flags.includes('sect') && !l.flags.includes('sting'));
    const pick = UI.stallPick || [];
    h = `<h2>擺攤</h2><p class="small muted">最多三批。照今日市價九五折賣出，成色差的貨，第二天可能有人回來退。</p>` + (ls.length ? ls.map(l => `<label class="check" style="margin-top:8px"><input type="checkbox" data-stall="${l.id}" ${pick.includes(l.id) ? 'checked' : ''} ${!pick.includes(l.id) && pick.length >= 3 ? 'disabled' : ''}><span>${esc(l.label)} × ${l.qty}<br><span class="small muted">約 ${fmt(rp(price(l.item) * 0.95) * l.qty)} 靈石</span></span></label>`).join('') + `<button class="btn primary wide" style="margin-top:12px" data-act="stallgo" ${pick.length ? '' : 'disabled'}>擺出去</button>` : '<p class="muted">沒有可以擺的貨。</p>');
  } else if (sh.type === 'menu') {
    h = `<h2>選單</h2>${sh.confirm ? `<p class="small">重新開始會清掉這一局。確定嗎？</p><button class="opt danger" data-act="new"><b>確定，重新開始</b><span>這一局會消失</span></button>` : `<button class="opt" data-act="home"><b>回到封面</b><span>進度會保留</span></button><button class="opt" data-act="askrestart"><b>重新開始</b><span>清掉這一局</span></button>`}`;
  }
  $sheet.hidden = false;
  $sheet.innerHTML = `<div class="veil" data-act="closesheet"><div class="sheet" role="dialog" aria-modal="true" data-stop="1">${h}<button class="btn ghost wide" style="margin-top:10px" data-act="closesheet">關上</button></div></div>`;
}

function renderBar() {
  let h = '';
  const nav = () => `<nav class="nav">${[['main', '鋪面', '今天'], ['store', '庫房', '貨與價'], ['people', '人脈', '名聲'], ['codex', '圖鑑', '物品']].map(([k, a, b]) => `<button data-act="tab" data-v="${k}" class="${UI.tab === k ? 'on' : ''}">${a}<em>${b}</em></button>`).join('')}</nav>`;
  if (UI.view === 'title') { $bar.hidden = true; return; }
  if (UI.tab !== 'main') h = nav();
  else if (S.phase === 'morning') h = `<button class="btn primary wide" data-act="open">開門</button>` + nav();
  else if (S.phase === 'enc') {
    const e = S.enc;
    if (e.done) h = `<button class="btn primary wide" data-act="close">繼續</button>`;
    else if (e.generic) {
      const opts = encOptions();
      h = `<div class="acts"><button class="btn quiet col" data-act="chat" ${canAct('chat') ? '' : 'disabled'}>閒聊</button><button class="btn quiet col" data-act="haggle" ${canAct('haggle') ? '' : 'disabled'}>加價</button><button class="btn quiet col" data-act="decidesheet">處置…</button></div>`;
      const p = opts.find(o => o.primary);
      h += `<div class="decide">${p ? `<button class="btn jade col" data-act="decide" data-k="${p.key}">${esc(p.label)}<span class="sub">${esc(p.desc)}</span></button>` : ''}<button class="btn quiet" data-act="decide" data-k="decline" ${p ? '' : 'style="grid-column:1/-1"'}>${p ? '不賣' : '送客'}</button></div>`;
    } else {
      const d = DEALS[e.deal];
      const hag = d.side === 'buy' ? '加價' : d.side === 'task' ? '加錢' : '殺價';
      const b = (a, t, sub) => `<button class="btn quiet col" data-act="${a}" ${canAct(a) ? '' : 'disabled'}>${t}${sub ? `<span class="sub">${sub}</span>` : ''}</button>`;
      h = `<div class="acts">${b('ask', '問來歷')}${b('press', '追問', d.press ? `${d.press.length - e.press}` : '')}${b('haggle', hag)}${b('silence', '沉默')}${b('appraise', '鑑定', '靈識')}${b('verify', '查證', S.slot >= 2 ? '來不及' : '一個時辰')}</div>`;
      const opts = encOptions(); const p = opts.find(o => o.primary && !o.disabled);
      h += `<div class="decide">${p ? `<button class="btn jade col" data-act="decide" data-k="${p.key}">${esc(p.label)}<span class="sub">${esc(p.desc)}</span></button>` : ''}<button class="btn primary" data-act="decidesheet" ${p ? '' : 'style="grid-column:1/-1"'}>${p ? '其他處置…' : '處置…'}</button></div>`;
    }
  } else if (S.phase === 'place') h = `<button class="btn primary wide" data-act="leave">離開${esc(PL[S.place.id].name)}</button>` + nav();
  else if (S.phase === 'night') h = S.night ? `<button class="btn primary wide" data-act="sleep">${S.day >= M.days ? '這個月過去了' : '就寢'}</button>` : `<button class="btn primary wide" data-act="meditate">${UI.night.invest || UI.night.pill ? '打坐' : '不打坐，睡覺'}</button>` + nav();
  else if (S.phase === 'day') h = (S.slot >= 3 ? `<button class="btn primary wide" data-act="evening">收鋪</button>` : '') + nav();
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
  else if (UI.tab === 'codex') h = renderCodex();
  else if (S.phase === 'morning') h = renderMorning();
  else if (S.phase === 'day') h = renderHub();
  else if (S.phase === 'enc') h = renderEnc();
  else if (S.phase === 'place') h = renderPlace();
  else if (S.phase === 'night') h = renderNight();
  else if (S.phase === 'end') h = renderEnd();
  $app.innerHTML = h;
  renderBar(); renderSheet();
  if (UI.toast) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = UI.toast; document.body.appendChild(t); UI.toast = null; setTimeout(() => t.remove(), 1800); }
}
function toast(t) { UI.toast = t; }
function save() { if (S) store.set(SAVE_KEY, S); }
function commit(scroll) {
  save(); render();
  if (scroll === 'top') window.scrollTo(0, 0);
  if (scroll === 'thread') { const th = document.getElementById('thread'); if (th && th.lastElementChild) th.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

/* ================= events ================= */
function onAct(a, el) {
  const id = el.dataset.id;
  switch (a) {
    case 'new': S = newGame((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0); UI.view = 'game'; UI.tab = 'main'; UI.sheet = null; commit('top'); break;
    case 'continue': UI.view = 'game'; render(); window.scrollTo(0, 0); break;
    case 'home': UI.view = 'title'; UI.sheet = null; render(); window.scrollTo(0, 0); break;
    case 'menu': UI.sheet = { type: 'menu' }; render(); break;
    case 'askrestart': UI.sheet = { type: 'menu', confirm: true }; render(); break;
    case 'closesheet': UI.sheet = null; render(); break;
    case 'tab': UI.tab = el.dataset.v; commit('top'); break;
    case 'stance': S.stance = el.dataset.v; commit(); break;
    case 'open': openShop(); commit('top'); break;
    case 'shop': { const d = nextShopDeal(); if (d) startDeal(d.id, 'shop'); else startWalkin(); commit('top'); break; }
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
    case 'commission': commission(); commit(); break;
    case 'hbuy': buyFromHuichun(id); commit(); break;
    case 'hsell': sellToHuichun(+id); commit(); break;
    case 'tbuy': buyTea(+el.dataset.i); commit(); break;
    case 'overhear': overhear(); commit(); break;
    case 'askbai': UI.sheet = { type: 'askbai' }; render(); break;
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
  else { const saved = store.get(SAVE_KEY); S = saved && saved.v === 1 ? saved : null; UI.view = 'title'; }
  render();
}
window.claude?.hot?.snapshot?.(() => ({ S, view: UI.view, tab: UI.tab }));
window.__fs = { newGame, startDeal, startWalkin, actAsk, actPress, actSilence, actHaggle, actAppraise, actVerify, decide, closeEnc, enterPlace, leavePlace, advanceSlot, meditate, endDay, beginDay, openShop, nextShopDeal, encOptions, canAct, verifyList, sellToSmith, sellToHuichun, buyFromHuichun, turnIn, marketStall, netWorth, price, held, render, onAct,
  get S() { return S; }, set S(v) { S = v; }, UI, D, DEALS, NP, IT };
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
