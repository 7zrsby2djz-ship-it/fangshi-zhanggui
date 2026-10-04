/* O101：與舊 S.events 分開的持久循環；本檔由 build 嵌入 game.js 同一closure。 */
const OLD_SAVE_KEY = 'fangshi-p1-v1';
const STORY_VERSION = 'taiwan-m1m2-v1';
const LEGACY_HTML = __LEGACY_HTML__;
const OP = (D.opportunities || []).find(o => o.id === 'O101');
const copyState = value => JSON.parse(JSON.stringify(value));
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const absDay = () => (MON() - 1) * M.days + S.day;
let persistedRaw = null, loadProblem = null, actionTransaction = false;
const RECORD_KEYS = ['id', 'state', 'discoveredAt', 'preparedAt', 'soldAt', 'dueAbs', 'quote', 'source', 'stock', 'receipts', 'inbox', 'fitConfirmed', 'revision'];
const PREDICATES = ['intelHeld', 'sourceSnapshotValid', 'fundsAtLeast', 'stateIs', 'withinWindow', 'stockOwned', 'receiptAbsent'];

function exactKeys(value, keys, label) {
  if (!plain(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(k => !keys.includes(k))) throw new Error(label + '欄位不完整或有未知欄位');
}
function validateOpportunityData() {
  if (!OP) throw new Error('缺少本輪商案資料');
  const keys = ['id', 'title', 'customer', 'supplier', 'item', 'quantity', 'cost', 'sale', 'assetValue', 'sourceDay', 'saleDay', 'returnDelay', 'requiredIntel', 'returnIntel', 'replaces', 'batch', 'predicates', 'trip', 'source', 'service', 'fit', 'sold', 'report'];
  exactKeys(OP, keys, '商案');
  if (OP.customer !== 'han' || OP.supplier !== 'tie' || OP.item !== 'wax_wrap_set' || OP.returnIntel !== 'i_opp101_return' || OP.replaces !== 'd13' || OP.batch !== 'O101_tie_M1D3_batch1' || !IT[OP.item] || !NP[OP.customer] || !NP[OP.supplier] || !IN[OP.returnIntel] || !DEALS[OP.replaces]) throw new Error('商案參照不符合本輪資料');
  if (!Array.isArray(OP.requiredIntel) || OP.requiredIntel.length !== 2 || !OP.requiredIntel.includes('i_opp_rain') || !OP.requiredIntel.includes('i_opp101_trip') || OP.requiredIntel.some(i => !IN[i])) throw new Error('商案必要消息錯誤');
  if ([OP.quantity, OP.cost, OP.sale, OP.assetValue, OP.sourceDay, OP.saleDay, OP.returnDelay].join(',') !== '4,24,36,16,3,4,2') throw new Error('商案數量／期限錯誤');
  exactKeys(OP.predicates, ['prepare', 'sale'], '商案條件');
  for (const [command, required] of Object.entries({ prepare: ['intelHeld', 'sourceSnapshotValid', 'fundsAtLeast', 'stateIs', 'withinWindow', 'receiptAbsent'], sale: ['stateIs', 'withinWindow', 'stockOwned', 'receiptAbsent'] })) {
    const values = OP.predicates[command];
    if (!Array.isArray(values) || values.length !== required.length || new Set(values).size !== required.length || values.some(p => !PREDICATES.includes(p)) || required.some(p => !values.includes(p))) throw new Error('未知或缺少商案條件');
  }
}
function freshOpportunity() {
  return { id: 'O101', state: 'unavailable', discoveredAt: null, preparedAt: null, soldAt: null, dueAbs: null,
    quote: { cost: 24, sale: 36, assetValue: 16 }, source: null,
    stock: { item: 'wax_wrap_set', qty: 0, cost: 0, owner: 'player', batch: OP.batch }, receipts: {}, inbox: { delivered: false, read: false }, fitConfirmed: false, revision: 0 };
}
function validateRecord(record) {
  exactKeys(record, RECORD_KEYS, '商案進度');
  if (record.id !== 'O101' || !['unavailable', 'available', 'prepared', 'sold', 'return_due', 'settled', 'declined', 'expired', 'failed'].includes(record.state) || !integer(record.revision)) throw new Error('商案狀態無效');
  for (const key of ['discoveredAt', 'preparedAt', 'soldAt', 'dueAbs']) if (record[key] !== null && (!integer(record[key]) || record[key] < 1)) throw new Error('商案日期無效');
  exactKeys(record.quote, ['cost', 'sale', 'assetValue'], '報價');
  if (record.quote.cost !== OP.cost || record.quote.sale !== OP.sale || record.quote.assetValue !== OP.assetValue) throw new Error('已存報價不一致');
  exactKeys(record.stock, ['item', 'qty', 'cost', 'owner', 'batch'], '專用貨');
  if (record.stock.item !== OP.item || record.stock.owner !== 'player' || record.stock.batch !== OP.batch || !integer(record.stock.qty) || !integer(record.stock.cost)) throw new Error('專用貨記錄無效');
  exactKeys(record.inbox, ['delivered', 'read'], '回報');
  if (typeof record.inbox.delivered !== 'boolean' || typeof record.inbox.read !== 'boolean' || typeof record.fitConfirmed !== 'boolean') throw new Error('回報記錄無效');
  if (!plain(record.receipts) || Object.keys(record.receipts).some(k => !['prepare', 'sale', 'return_deliver', 'return_read', 'disposition', 'decline'].includes(k))) throw new Error('收據無效');
  for (const [kind, receipt] of Object.entries(record.receipts)) {
    exactKeys(receipt, ['id', 'at'], '收據');
    if (receipt.id !== 'O101:' + kind || !integer(receipt.at) || receipt.at < 1) throw new Error('收據內容無效');
  }
  if (record.source !== null) {
    exactKeys(record.source, ['batch', 'session', 'day', 'item', 'quantity', 'cost'], '供貨記錄');
    if (record.source.batch !== OP.batch || record.source.item !== OP.item || record.source.quantity !== OP.quantity || record.source.cost !== OP.cost || record.source.day !== OP.sourceDay || typeof record.source.session !== 'string' || !record.source.session) throw new Error('供貨內容無效');
  }
  const r = record.receipts, prepared = !!r.prepare, sold = !!r.sale, disposed = !!r.disposition;
  const stages = { unavailable: [], available: [], prepared: ['prepare'], sold: ['prepare', 'sale'], return_due: ['prepare', 'sale', 'return_deliver'], settled: ['prepare', 'sale', 'return_deliver', 'return_read'], declined: ['decline'], expired: prepared ? ['prepare', 'disposition'] : [], failed: ['prepare', 'disposition'] };
  if (Object.keys(r).sort().join(',') !== stages[record.state].sort().join(',')) throw new Error('商案狀態與收據組合不一致');
  if (prepared && (!record.source || r.prepare.at !== record.preparedAt) || sold && (r.sale.at !== record.soldAt || record.dueAbs !== record.soldAt + OP.returnDelay) || record.state === 'available' && record.discoveredAt === null || record.state === 'unavailable' && record.discoveredAt !== null) throw new Error('商案日期／來源不完整');
  if (prepared !== (record.preparedAt !== null) || sold !== (record.soldAt !== null) || sold !== (record.dueAbs !== null) || sold && !prepared || disposed && (!prepared || sold) || r.return_deliver && !sold || r.return_read && !r.return_deliver) throw new Error('收據與狀態矛盾');
  if (prepared && (record.preparedAt !== OP.sourceDay || record.discoveredAt === null || record.discoveredAt > record.preparedAt) || r.return_deliver && r.return_deliver.at < record.dueAbs || r.return_read && r.return_read.at < r.return_deliver.at || record.revision < Object.keys(r).length) throw new Error('商案階段日期不一致');
  if (record.stock.qty !== (record.state === 'prepared' ? OP.quantity : 0) || record.stock.cost !== (record.state === 'prepared' ? OP.cost : 0)) throw new Error('專用數量與狀態矛盾');
  if (record.state === 'prepared' && (!prepared || sold || disposed || !record.source) || ['sold', 'return_due', 'settled'].includes(record.state) && (!sold || disposed) || ['expired', 'failed'].includes(record.state) && prepared && !disposed) throw new Error('商案收據不完整');
  if (record.inbox.delivered !== !!r.return_deliver || record.inbox.read !== !!r.return_read || (record.state === 'return_due') !== (!!r.return_deliver && !r.return_read) || (record.state === 'settled') !== !!r.return_read) throw new Error('回報狀態不完整');
}
function validateSave(candidate) {
  validateOpportunityData();
  if (!plain(candidate) || candidate.v !== 2 || candidate.storyVersion !== STORY_VERSION || candidate.unitsVersion !== 2) throw new Error('這份進度不是本版可讀的遊戲');
  for (const key of ['stones', 'debt']) if (!Number.isFinite(candidate[key]) || candidate[key] < 0) throw new Error('進度金額無效：' + key);
  for (const key of ['seed', 'lotSeq', 'saveRevision', 'visitSeq', 'month', 'day', 'slot', 'level', 'xp', 'spirit', 'lifespan', 'lifespanLeft']) if (!integer(candidate[key])) throw new Error('進度數字無效：' + key);
  if (!['morning', 'day', 'enc', 'place', 'night', 'end'].includes(candidate.phase) || candidate.phase === 'enc' && !plain(candidate.enc) || candidate.phase === 'place' && (!plain(candidate.place) || typeof candidate.place.session !== 'string')) throw new Error('進度場景無效');
  if (candidate.month < 1 || candidate.month > LAST_MONTH || candidate.day < 1 || candidate.day > M.days + 1 || candidate.slot > 3) throw new Error('進度時間無效');
  for (const key of ['flags', 'done', 'intel', 'isold', 'rel', 'met', 'mem', 'codex', 'rep', 'opportunities', 'newsRead', 'stats', 'repTag', 'notes', 'homes', 'tags', 'stanceDays', 'accused']) if (!plain(candidate[key])) throw new Error('進度欄位無效：' + key);
  for (const key of ['lots', 'events', 'cards', 'todayNews', 'history', 'statLog', 'complaints', 'log', 'sold']) if (!Array.isArray(candidate[key])) throw new Error('進度清單無效：' + key);
  for (const key of ['saw', 'fooled', 'wronged']) if (!integer(candidate.stats[key])) throw new Error('評分記錄無效');
  if (!['收斂', '外放'].includes(candidate.stance)) throw new Error('進度姿態無效');
  const ids = new Set();
  for (const lot of candidate.lots) {
    if (!plain(lot) || !integer(lot.id) || ids.has(lot.id) || !IT[lot.item] || !integer(lot.qty) || lot.qty < 1 || !Number.isFinite(lot.cost) || lot.cost < 0 || !Number.isFinite(lot.q) || !Array.isArray(lot.flags) || lot.flags.some(f => typeof f !== 'string') || candidate.lotSeq < lot.id) throw new Error('庫存記錄無效');
    ids.add(lot.id);
  }
  exactKeys(candidate.opportunities, ['O101'], '商案集合');
  validateRecord(candidate.opportunities.O101);
  const record = candidate.opportunities.O101;
  if (record.receipts.prepare && !OP.requiredIntel.every(id => candidate.intel[id]) || record.inbox.read && !candidate.intel[OP.returnIntel]) throw new Error('商案階段與已讀消息不一致');
  const fallback = candidate.lots.filter(l => l.reservationOrigin === 'O101:disposition');
  if (fallback.length > 1 || fallback.length && (!record.receipts.disposition || record.receipts.sale) || record.state === 'prepared' && candidate.lots.some(l => l.item === OP.item && l.reservationOrigin === OP.batch)) throw new Error('貨物重複或轉貨收據缺失');
  if (candidate.enc && candidate.enc.deal === OP.replaces) throw new Error('這筆舊收購不屬於新故事');
  validateMonthOne(candidate);
}

// W06 v2不改貨量、不改done、不補讀過的生活段；首次成功action才保存補值。
function migrateMonthOne(candidate) {
  if (candidate.monthOneVersion === undefined && candidate.monthOne === undefined) {
    candidate.monthOneVersion = 1;
    candidate.monthOne = {
      s02: candidate.month > 1 || candidate.day > 2 ? 'unseen' : 'pending',
      s05: candidate.enc && candidate.enc.deal === 'd14' ? 'legacy_active' : candidate.done.d14 && !['missed', 'na'].includes(candidate.done.d14) ? 'legacy_completed' : candidate.month > 1 || candidate.day > 6 ? 'unseen' : 'pending'
    };
  }
  return candidate;
}
function validateMonthOne(candidate) {
  if (candidate.monthOneVersion !== 1) throw new Error('第一月場景版本不支援');
  exactKeys(candidate.monthOne, ['s02', 's05'], '第一月場景');
  if (!['pending', 'heard', 'stopped', 'unseen'].includes(candidate.monthOne.s02) || !['pending', 'all', 'whole', 'declined', 'unseen', 'legacy_active', 'legacy_completed'].includes(candidate.monthOne.s05)) throw new Error('第一月場景狀態無效');
  const e = candidate.enc;
  if (e && e.deal === 'd14' && candidate.monthOne.s05 !== 'legacy_active') throw new Error('新故事不接受新的狼牙來訪');
  if (e && e.scene) {
    if (!['s02', 's05'].includes(e.scene) || e.from !== 'shop' || e.deal || !Array.isArray(e.th) || !integer(e.step) || e.step > (e.scene === 's02' ? 3 : 2)) throw new Error('第一月現場記錄無效');
    if (!e.done && candidate.monthOne[e.scene] !== 'pending') throw new Error('第一月場景已結清');
  }
  if (candidate.intel.i_opp_han_short_intent && candidate.monthOne.s02 === 'unseen') throw new Error('未見生活對話卻有生活消息');
}
function startMonthOneEncounter() {
  if (MON() !== 1) return false;
  const m = S.monthOne, next = nextShopDeal();
  let scene = S.day === 2 && m.s02 === 'pending' ? 's02' : S.day >= 5 && S.day <= 6 && m.s05 === 'pending' && (!next || next.days[1] >= 6) ? 's05' : null;
  if (!scene) return false;
  S.met.ge = true; if (scene === 's02') S.met.han = true;
  if (S.stance === '外放') S.wind++;
  S.enc = { scene, npc: 'ge', from: 'shop', th: [{ k: 'narr', t: D.month1[scene].open }], step: 0, done: null };
  if (scene === 's02') S.enc.th.push({ k: 'narr', t: held('hantie') ? D.month1.s02.oreHeld : D.month1.s02.oreGone });
  else S.enc.th.push({ k: 'narr', t: S.intel.i_opp_han_short_intent ? D.month1.s05.lifeKnown : D.month1.s05.lifeUnknown });
  S.phase = 'enc'; return true;
}
function monthOneAction(command) {
  const e = S.enc; if (!e || !e.scene || e.done) return;
  const data = D.month1[e.scene];
  if (e.scene === 's02') {
    if (command === 'next') {
      if (e.step === 0) { e.th.push({ k: 'narr', t: data.life }); learnTrigger('scene:S02:life_read'); }
      if (e.step === 1) e.th.push({ k: 'narr', t: data.drying });
      if (e.step === 2) { if (S.newsRead.n_rain) e.th.push({ k: 'narr', t: data.rainRead }); e.th.push({ k: 'narr', t: data.end }); S.monthOne.s02 = 'heard'; e.done = { key: 'heard', label: '聊完了' }; }
      e.step = Math.min(3, e.step + 1);
    } else if (command === 'decline') { e.th.push({ k: 'narr', t: data.stop }); S.monthOne.s02 = 'stopped'; e.done = { key: 'stopped', label: '先忙店裡' }; }
    return;
  }
  if (command === 'inspect' && e.step === 0) { e.th.push({ k: 'narr', t: data.inspect }); e.step = 1; return; }
  if (command === 'haggle' && e.step === 1) { e.th.push({ k: 'narr', t: data.haggle }); e.step = 2; return; }
  if (command === 'decline') { e.th.push({ k: 'res', t: e.step === 0 ? data.rejectUnopened : data.reject }); S.monthOne.s05 = 'declined'; e.done = { key: 'declined', label: '不收' }; return; }
  if (!['all', 'whole'].includes(command) || e.step !== 2 || S.monthOne.s05 !== 'pending') return;
  const cost = command === 'all' ? 8 : 7;
  if (S.stones < cost) { toast('錢不夠，這筆還沒成交。可以只收完整葉，或不收。'); return; }
  if (!IT.dry_mint_leaf || S.lots.some(l => l.from === 'scene_s05_mint')) throw new Error('薄荷批次已存在，沒有重複扣款');
  S.stones -= cost;
  const whole = addLot({ item: 'dry_mint_leaf', qty: 200, cost: 7, q: 1, known: true, label: '乾薄荷葉（較完整，200公克）', from: 'scene_s05_mint' });
  whole.gradeTag = 'whole_approx'; whole.totalCost = 7;
  if (command === 'all') { const broken = addLot({ item: 'dry_mint_leaf', qty: 100, cost: 2, q: 1, known: true, label: '乾薄荷葉（碎葉，100公克）', from: 'scene_s05_mint' }); broken.gradeTag = 'broken'; broken.totalCost = 1; }
  S.monthOne.s05 = command;
  e.th.push({ k: 'res', t: data[command], notes: ['－' + cost + ' 靈石'] }); e.done = { key: command, label: command === 'all' ? '全收' : '只收完整葉' };
  S.log.push({ day: S.day, t: '老葛的乾薄荷葉：' + e.done.label + '，付' + cost });
}
function renderMonthOneEncounter() {
  const e = S.enc;
  const mintStatus = e.done ? e.done.key === 'all' ? '已付8靈石，收到完整200公克／碎100公克。原袋由老葛帶回。' : e.done.key === 'whole' ? '已付7靈石，收到完整200公克。碎葉100公克由老葛帶回。' : '沒有收貨或付款，原袋由老葛帶走。' : e.step === 2 ? '已議：全收300公克8靈石，或只收完整200公克7靈石。' : e.step === 1 ? '已秤：完整200公克／碎100公克。還沒議定價格。' : '老葛要價10靈石，還沒倒完整袋驗貨。';
  const warning = e.scene === 's05' ? `<div class="goods"><div class="g-name">${icon('dry_mint_leaf')}乾薄荷葉${e.done ? '｜本次結果' : ' 300公克'}</div><p>${mintStatus}${e.done && e.done.key === 'declined' ? '' : '後續售價與買家尚未確認。'}</p></div>` : '';
  return `<div class="who">${portrait('ge', 'neutral', 'big')}<div><div class="nm">${e.scene === 's02' ? '老葛、韓九' : '老葛'}</div><div class="rl">${e.scene === 's02' ? '找箱子，聊兩句' : '不是叫你幫忙'}</div></div></div>${warning}<div class="thread">${e.th.map(x => `<div class="ln ${x.k}"><span class="tx">${esc(x.t)}</span></div>`).join('')}</div>`;
}
function monthOneBarHTML() {
  const e = S.enc;
  if (e.done) return '<button class="btn primary wide" data-act="close">繼續</button>';
  const button = (command, text, disabled = false) => `<button class="btn quiet wide" data-act="m1scene" data-k="${command}" ${disabled ? 'disabled' : ''}>${text}</button>`;
  if (e.scene === 's02') return button('next', e.step === 0 ? '問他們要裝什麼' : e.step === 1 ? '先看箱子，問乾了沒' : '說清楚沒有空箱子，聊完') + button('decline', '今天先不聊');
  return (e.step === 0 ? button('inspect', '倒完整袋驗貨、分開秤重') : e.step === 1 ? button('haggle', '按完整葉／碎葉議價') : button('all', '全收300公克，付8靈石', S.stones < 8) + button('whole', '只收完整200公克，付7靈石', S.stones < 7)) + button('decline', '不收，原貨還老葛');
}
function strictPersist() {
  validateSave(S);
  const current = localStorage.getItem(SAVE_KEY);
  if (current !== persistedRaw) throw new Error('另一個分頁已更新進度；請重新開啟後繼續');
  S.saveRevision++;
  const raw = JSON.stringify(S);
  localStorage.setItem(SAVE_KEY, raw);
  persistedRaw = raw;
}
function receipt(record, kind) { record.receipts[kind] = { id: 'O101:' + kind, at: absDay() }; record.revision++; }
function opportunityRecord() { return S && S.opportunities && S.opportunities.O101; }
function scanOpportunities() {
  const record = opportunityRecord(); if (!record || record.state !== 'unavailable' || absDay() > OP.sourceDay || S.phase === 'end') return;
  if (OP.requiredIntel.every(i => S.intel[i])) { record.state = 'available'; record.discoveredAt = absDay(); record.revision++; }
}
function sourceValid(record) {
  return S.phase === 'place' && S.place && S.place.id === 'market' && MON() === 1 && S.day === OP.sourceDay && S.slot < 3 && record.source && record.source.session === S.place.session;
}
function checkPredicates(command, record) {
  validateOpportunityData(); validateRecord(record);
  const tests = { intelHeld: () => OP.requiredIntel.every(i => S.intel[i]), sourceSnapshotValid: () => sourceValid(record), fundsAtLeast: () => S.stones >= record.quote.cost,
    stateIs: () => record.state === (command === 'prepare' ? 'available' : 'prepared'), withinWindow: () => MON() === 1 && S.day === (command === 'prepare' ? OP.sourceDay : OP.saleDay) && S.phase !== 'end',
    stockOwned: () => record.stock.qty === OP.quantity && record.stock.owner === 'player', receiptAbsent: () => !record.receipts[command] && !record.receipts.disposition };
  for (const predicate of OP.predicates[command]) if (!tests[predicate] || !tests[predicate]()) throw new Error(command === 'prepare' ? '請先確認消息、當場供貨與可用資金' : '這筆貨現在不能成交');
}
function readNews(id) {
  if (UI.view !== 'game' || !['morning', 'day'].includes(S.phase) || !S.todayNews.includes(id)) return;
  UI.sheet = { type: 'news', id };
  S.newsRead[id] = true;
  learnTrigger('news:seen:' + id); scanOpportunities();
}
function marketSourceAction(which) {
  if (S.phase !== 'place' || !S.place || S.place.id !== 'market' || MON() !== 1 || S.day !== OP.sourceDay || S.slot >= 3) return;
  if (which === 'trip') { S.place.oppTripRead = true; learnTrigger('scene:S03:han_trip_complete'); S.met.han = true; }
  else {
    const record = opportunityRecord();
    if (!record.receipts.prepare) record.source = { batch: OP.batch, session: S.place.session, day: S.day, item: OP.item, quantity: OP.quantity, cost: OP.cost };
    S.place.oppSourceRead = true; S.met.tie = true;
  }
  scanOpportunities();
}
function prepareOpportunity() {
  const record = opportunityRecord(); if (record.receipts.prepare) return;
  checkPredicates('prepare', record);
  S.stones -= record.quote.cost;
  record.stock = { item: OP.item, qty: OP.quantity, cost: OP.cost, owner: 'player', batch: OP.batch };
  record.state = 'prepared'; record.preparedAt = absDay(); receipt(record, 'prepare');
  S.codex[OP.item] = true; toast('已備好四份布繩，付24靈石；明天第一次顧店等韓九來試包。');
}
function declineOpportunity() {
  const record = opportunityRecord(); if (!['available', 'unavailable'].includes(record.state)) return;
  record.state = 'declined'; receipt(record, 'decline'); toast('這次不做；沒有扣款。普通生意照常。');
}
function startOpportunityEncounter() {
  const record = opportunityRecord();
  if (MON() !== 1 || S.day !== OP.saleDay || record.state !== 'prepared' || S.phase !== 'day' || S.slot >= 3) return false;
  S.enc = { opportunity: 'O101', from: 'shop', done: false }; S.phase = 'enc'; S.met.han = true; return true;
}
function fitOpportunity() {
  const record = opportunityRecord();
  if (!S.enc || S.enc.opportunity !== 'O101' || S.enc.done || record.state !== 'prepared') return;
  record.fitConfirmed = true; record.revision++;
}
function saleOpportunity() {
  const record = opportunityRecord(); if (record.receipts.sale) return;
  checkPredicates('sale', record);
  if (!S.enc || S.enc.opportunity !== 'O101' || S.enc.done || !record.fitConfirmed) throw new Error('先把四包貨實際試好，再確認收款');
  S.stones += record.quote.sale; record.stock.qty = 0; record.stock.cost = 0;
  record.state = 'sold'; record.soldAt = absDay(); record.dueAbs = absDay() + OP.returnDelay; receipt(record, 'sale');
  S.enc.done = true; toast('收36靈石，四份布繩由韓九帶走；約好月底最後一天早上回報。');
}
function disposeOpportunity(record, state) {
  if (record.receipts.disposition || record.receipts.sale) return;
  if (S.lots.some(l => l.reservationOrigin === 'O101:disposition')) throw new Error('已有轉貨但缺少對應紀錄，請保留這份進度');
  const lot = addLot({ item: OP.item, qty: OP.quantity, cost: OP.cost / OP.quantity, known: true, label: '未成交的布繩（四份）' });
  if (!lot) throw new Error('轉貨物品不存在');
  lot.reservationOrigin = 'O101:disposition';
  record.stock.qty = 0; record.stock.cost = 0; record.state = state; receipt(record, 'disposition');
}
function rejectOpportunity() {
  const record = opportunityRecord(); if (!S.enc || S.enc.opportunity !== 'O101' || S.enc.done || record.state !== 'prepared') return;
  disposeOpportunity(record, 'failed'); S.enc.done = true; toast('這次不成交；四份布繩轉回普通庫存，沒有現金退款。');
}
function tickOpportunities() {
  const record = opportunityRecord(); if (!record || S.phase === 'end' || S.day > M.days) return;
  if (record.state === 'prepared' && absDay() > OP.saleDay) disposeOpportunity(record, 'expired');
  else if (['available', 'unavailable'].includes(record.state) && absDay() > OP.sourceDay) { record.state = 'expired'; record.revision++; }
  if (record.state === 'sold' && absDay() >= record.dueAbs && !record.receipts.return_deliver) { record.state = 'return_due'; record.inbox.delivered = true; receipt(record, 'return_deliver'); }
}
function closeOpportunityWindow() {
  const record = opportunityRecord();
  if (MON() === 1 && S.day === OP.saleDay && record.state === 'prepared') disposeOpportunity(record, 'expired');
}
function readOpportunityReturn() {
  const record = opportunityRecord(); if (!record.inbox.delivered) return;
  UI.sheet = { type: 'oppreturn' }; if (record.inbox.read) return;
  record.inbox.read = true; record.state = 'settled'; receipt(record, 'return_read');
  UI.sheet = { type: 'oppreturn' }; learnTrigger('opp:O101:return_read');
}
function reservedStockValue() { const record = opportunityRecord(); return record && record.state === 'prepared' ? record.quote.assetValue : 0; }
function opportunityHTML() {
  const record = opportunityRecord(); if (!record) return '';
  let html = '';
  if (record.inbox.delivered) html += `<section class="card stack opp"><h3>韓九的用後回報</h3><p class="small muted">第${Math.floor((record.receipts.return_deliver.at - 1) / M.days) + 1}個月第${(record.receipts.return_deliver.at - 1) % M.days + 1}天收到；保留的回報，沒有再走一趟。</p><button class="btn quiet" data-act="oppreturn">${record.inbox.read ? '再看回報' : '讀回報（不占時段）'}</button></section>`;
  if (['unavailable', 'declined'].includes(record.state)) return html;
  let description = '', controls = '';
  if (record.state === 'available') {
    description = OP.service + ' 投入24，若合用成交收36。沒成交，四份布繩轉普通貨，參考估值16，退款0；後續要自己找買家。';
    const ready = sourceValid(record) && S.stones >= OP.cost;
    controls = `<button class="btn primary" data-act="oppprepare" ${ready ? '' : 'disabled'}>備貨，投入24靈石</button><button class="btn quiet" data-act="oppdefer">先不做</button><button class="btn quiet" data-act="oppdecline">這次不做</button><p class="small muted">${!sourceValid(record) ? '要在今天市場現場看過四份布繩；離場就不能遠端買。' : S.stones < OP.cost ? '目前資金不足24。' : '現場供貨有效，備貨不另占時段。'}</p>`;
  } else if (record.state === 'prepared') description = '已付24，已備妥韓九的四份布繩。第四天第一次顧店先接韓九；試包後確認付款36。若整天沒接，轉普通貨，退款0。';
  else if (record.state === 'sold') description = '已收36，貨由韓九帶走。已約回報；回報尚未到，沒有另外一筆獎金。';
  else if (['failed', 'expired'].includes(record.state)) description = record.receipts.prepare ? '四份未售布繩已轉普通庫存，退款0，參考估值16；不保證立即賣掉。' : '這次備貨期限已過；沒有扣錢，也沒有發貨。';
  else return html;
  return html + `<section class="card stack opp"><h3>韓九的四包香菇</h3><p>${esc(description)}</p><p class="small muted">消息來源：報紙倉庫傳聞＋韓九本人這趟需求；${record.source ? '已看鐵師傅當場短試；未證明長時防水。' : '供貨尚待現場確認。'}</p>${controls}</section>`;
}
function opportunitySummaryHTML() {
  const record = opportunityRecord();
  if (!record) return '';
  const summary = record.receipts.sale ? '已收36靈石，四份布繩交給韓九；' + (record.inbox.read ? '已讀用後回報。' : record.inbox.delivered ? '用後回報已到，尚未閱讀。' : '用後回報尚未到。') : record.receipts.disposition ? '未成交；四份布繩已轉普通貨，現金退款0。' : record.state === 'prepared' ? '已付24靈石備妥四份布繩，尚未成交。' : '這個月未承接，沒有備貨扣款或收入。';
  return `<div class="truth"><b>韓九的四包香菇</b><p>${esc(summary)}</p></div>`;
}
function opportunityMarketHTML() {
  if (MON() !== 1 || S.day !== OP.sourceDay) return opportunityHTML();
  return `<section class="card stack opp"><h3>韓九在鐵師傅攤前</h3>${S.place.oppTripRead ? `<p>${esc(OP.trip)}</p>` : '<button class="btn quiet" data-act="opptrip">和韓九聊明天的運送安排</button>'}${S.place.oppSourceRead ? `<p>${esc(OP.source)}</p>` : '<button class="btn quiet" data-act="oppsource">看鐵師傅的四份布繩與短試</button>'}<p class="small muted">同一次外出交談、看貨與備貨；離場才占一個時段。</p></section>` + opportunityHTML();
}
function renderOpportunityEncounter() {
  const record = opportunityRecord();
  return `<section class="card stack"><h2>韓九把四包貨送來了</h2><p>${esc(record.fitConfirmed ? OP.fit : '韓九說：「昨天說好的四包。先放進去看看，包角有沒有蓋住。」')}</p>${S.enc.done ? `<p>${esc(record.state === 'failed' ? '沒有成交；韓九把香菇帶走，你的布繩轉回普通庫存。' : OP.sold)}</p>` : ''}<p class="small muted">香菇一直是貨主的貨；許衡提供四份布繩與整理服務。</p></section>`;
}
function opportunityBarHTML() {
  if (S.enc.done) return '<button class="btn primary wide" data-act="close">送客（占一個時段）</button>';
  if (!opportunityRecord().fitConfirmed) return '<button class="btn primary wide" data-act="oppfit">逐包試布、覆住折角</button><button class="btn quiet wide" data-act="oppreject">這次不成交</button>';
  return '<button class="btn primary wide" data-act="oppsale">確認收36靈石，交付布繩</button><button class="btn quiet wide" data-act="oppreject">這次不成交</button>';
}
function ordinaryHeld(item) { return S.lots.filter(l => l.item === item && !protectedLot(l)).reduce((n, l) => n + l.qty, 0); }
function takeOrdinary(item, qty) {
  if (ordinaryHeld(item) < qty) return false;
  let need = qty;
  for (const lot of S.lots.filter(l => l.item === item && !protectedLot(l))) { const used = Math.min(need, lot.qty); lot.qty -= used; need -= used; if (!need) break; }
  S.lots = S.lots.filter(l => l.qty > 0); return true;
}
function externalLot(lot) { return lot.flags.includes('entrusted') || lot.owner && lot.owner !== 'player'; }
function protectedLot(lot) { return !lot || lot.item === 'hudeng' || IT[lot.item].cat === 'story' || lot.flags.some(f => ['entrusted', 'evidence'].includes(f)) || lot.owner && lot.owner !== 'player'; }
function legacyPanelHTML() {
  return `<section class="card stack"><h3>原版進度</h3><p>原版會用原來的物品、數量與價格繼續。這個新故事切片另存進度；原版檔案不會被換成新的單位。</p><button class="btn quiet" data-act="legacy">開啟內附原版</button><button class="btn quiet" data-act="legacyfiles">匯入／匯出原版存檔</button></section>`;
}
function validateLegacyRaw(raw) {
  const state = JSON.parse(raw), oldData = JSON.parse(LEGACY_HTML.match(/const D = (.+);\nconst M/)[1]);
  if (!plain(state) || state.v !== 1) throw new Error('請提供原版v1的完整JSON存檔');
  for (const key of ['stones', 'debt', 'seed', 'day', 'slot', 'level', 'xp', 'spirit', 'lifespan', 'lotSeq']) if (!Number.isFinite(state[key]) || state[key] < 0) throw new Error('原版數值欄位不完整：' + key);
  if (!Number.isSafeInteger(state.day) || state.day < 1 || state.day > oldData.meta.days + 1 || !Number.isSafeInteger(state.slot) || state.slot > 3 || !['morning', 'day', 'enc', 'place', 'night', 'end'].includes(state.phase)) throw new Error('原版日期／場景不完整');
  for (const key of ['flags', 'done', 'rel', 'mem', 'met', 'codex', 'rep', 'stats', 'notes', 'homes']) if (!plain(state[key])) throw new Error('原版欄位不完整：' + key);
  for (const key of ['lots', 'events', 'cards', 'todayNews', 'complaints', 'log', 'sold']) if (!Array.isArray(state[key])) throw new Error('原版清單不完整：' + key);
  if (state.phase === 'enc' && !plain(state.enc) || state.phase === 'place' && !plain(state.place)) throw new Error('原版場景不完整');
  const ids = new Set();
  for (const lot of state.lots) {
    if (!plain(lot) || !Number.isSafeInteger(lot.id) || lot.id < 1 || ids.has(lot.id) || !oldData.items[lot.item] || !Number.isSafeInteger(lot.qty) || lot.qty < 1 || !Number.isFinite(lot.cost) || lot.cost < 0 || !Number.isFinite(lot.q) || !Array.isArray(lot.flags) || lot.flags.some(f => typeof f !== 'string') || state.lotSeq < lot.id) throw new Error('原版庫存資料不完整');
    ids.add(lot.id);
  }
  return state;
}
function openLegacy() {
  UI.view = 'legacy'; $bar.hidden = true; $hud.hidden = true; $sheet.hidden = true;
  $app.innerHTML = '<button class="btn quiet" data-act="home">返回新故事選單</button><p class="small muted">內附原版使用原進度；若此檔案讀不到之前的進度，先返回匯入原版JSON。</p><iframe id="legacy-frame" title="原版坊市掌櫃" style="width:100%;height:85vh;border:0"></iframe>';
  const frame = document.getElementById('legacy-frame'); if (frame) frame.srcdoc = LEGACY_HTML;
}
function legacyFileSheet() {
  let raw = ''; try { raw = localStorage.getItem(OLD_SAVE_KEY) || ''; } catch (error) {}
  UI.sheet = { type: 'legacyfiles', raw };
}
function exportRaw(raw, name) {
  if (!raw) throw new Error('目前沒有可匯出的存檔');
  const blob = new Blob([raw], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
function onAct(a, el) {
  if (a === 'legacy') { openLegacy(); return; }
  if (a === 'legacyfiles') { legacyFileSheet(); render(); return; }
  if (a === 'legacyexport') { try { exportRaw(localStorage.getItem(OLD_SAVE_KEY), 'fangshi-v1-save.json'); } catch (error) { toast(error.message); render(); } return; }
  if (a === 'rawexport') { try { exportRaw(persistedRaw, 'fangshi-unreadable-save.json'); } catch (error) { toast(error.message); render(); } return; }
  if (a === 'legacyimport') {
    try {
      const raw = document.getElementById('legacy-json').value; validateLegacyRaw(raw);
      const existing = localStorage.getItem(OLD_SAVE_KEY);
      if (existing && existing !== raw) { const backup = 'fangshi-v1-import-backup-' + Date.now(); localStorage.setItem(backup, existing); }
      localStorage.setItem(OLD_SAVE_KEY, raw); UI.sheet = null; toast('原版存檔已保留。開啟內附原版即可繼續。');
    } catch (error) { toast(error.message); }
    render(); return;
  }
  if (loadProblem && !['home', 'menu', 'closesheet'].includes(a)) { toast('這份進度無法安全載入，請先匯出保留'); render(); return; }
  const before = S, beforeUI = copyState(UI);
  if (S) S = copyState(S);
  actionTransaction = true; let committed = false;
  try {
    runAct(a, el);
    if (S) { if (S.phase !== 'end') scanLearn(); validateSave(S); strictPersist(); committed = true; }
    actionTransaction = false; render();
    if (UI.pendingScroll === 'top') window.scrollTo(0, 0); delete UI.pendingScroll;
  } catch (error) {
    if (!committed) { S = before; Object.assign(UI, beforeUI); }
    actionTransaction = false;
    toast(committed ? '進度已儲存；畫面更新失敗，重新開啟即可接續。' : error.message || '存檔失敗；這次操作沒有完成，請重試');
    try { render(); } catch (renderError) { $app.innerHTML = '<p>畫面暫時無法更新，請重新開啟這份檔案；已儲存的進度會保留。</p>'; }
  }
}
