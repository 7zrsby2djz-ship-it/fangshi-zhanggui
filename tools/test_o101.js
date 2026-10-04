#!/usr/bin/env node
'use strict';
// 原建置HTML的完整script執行；DOM僅承接容器，未冒稱Browser。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), KEY = 'fangshi-rework-v2', OLD = 'fangshi-p1-v1';
const html = fs.readFileSync(path.join(root, 'dist/game.html'), 'utf8');
const source = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1];
const clone = value => JSON.parse(JSON.stringify(value));
function boot(raw, old = '原版原文保留') {
  const storage = new Map([[OLD, old]]); if (raw !== undefined) storage.set(KEY, raw);
  const writes = [], nodes = Object.fromEntries(['#app', '#bar', '#hud', '#sheet', 'legacy-frame', 'legacy-json'].map(id => [id, { innerHTML: '', hidden: false, offsetHeight: 60, value: '' }]));
  const faults = { set: false, render: false };
  let appHTML = ''; Object.defineProperty(nodes['#app'], 'innerHTML', { get: () => appHTML, set: value => { if (faults.render) { faults.render = false; throw new Error('模擬畫面更新失敗'); } appHTML = value; } });
  const exports = [], appended = [];
  const document = { querySelector: id => nodes[id] || null, getElementById: id => nodes[id] || null, addEventListener() {}, documentElement: { style: { setProperty() {} } }, body: { appendChild(node) { appended.push(node); } }, createElement: () => ({ remove() {}, click() {} }) };
  const window = { addEventListener() {}, scrollTo() {} };
  class FixedDate extends Date { static now() { return 5052026; } }
  const math = Object.create(Math); math.random = () => 0.5;
  const context = vm.createContext({ window, document, Date: FixedDate, Math: math, console, requestAnimationFrame: callback => callback(), setTimeout: () => 0,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if (faults.set) throw new Error('模擬Quota寫入失敗'); storage.set(key, value); writes.push(key); }, removeItem: key => storage.delete(key) }, Blob, URL: { createObjectURL(blob) { exports.push(blob); return 'blob:test'; }, revokeObjectURL() {} } });
  vm.runInContext(source, context, { filename: 'dist/game.html script', timeout: 5000 });
  assert.equal(writes.length, 0, '載入不得改寫檔案');
  const env = { T: window.__fs, storage, writes, nodes, faults, exports, appended, originalOld: old };
  assert.equal(env.T.legacyHTML, fs.readFileSync(path.join(root, 'legacy/game-v1.html'), 'utf8'), '嵌入legacy HTML須逐字還原，無unicode escape破壞');
  return env;
}
function visible(env, action, dataset) {
  const markup = ['#app', '#bar', '#sheet', '#hud'].map(k => env.nodes[k].innerHTML).join('');
  return [...markup.matchAll(/<button\s+([^>]+)>/g)].some(([, attributes]) => {
    if (!new RegExp('data-act=["\']?' + action + '(?:["\'\\s]|$)').test(attributes) || /\bdisabled\b/.test(attributes)) return false;
    return Object.entries(dataset).every(([k, v]) => new RegExp('data-' + k + '=["\']?' + String(v) + '(?:["\'\\s]|$)').test(attributes));
  });
}
function act(env, action, dataset = {}, ui = true) {
  if (ui) assert.ok(visible(env, action, dataset), '當下UI須提供未鎖定按鈕：' + action + JSON.stringify(dataset));
  const previous = env.writes.length;
  env.T.onAct(action, { dataset });
  assert.ok(env.writes.length - previous <= 1, '每次action最多一次存新進度');
  assert.equal(env.storage.get(OLD), env.originalOld, '新故事不得改原key');
}
const state = env => clone(env.T.S);
function reload(env) { return boot(env.storage.get(KEY), env.originalOld); }
function rejectCustomer(env) {
  if (env.T.S.enc.scene) { act(env, 'm1scene', { k: 'decline' }); act(env, 'close'); return; }
  if (env.T.S.enc.opportunity) { act(env, 'oppreject'); act(env, 'close'); return; }
  do { if (!env.T.S.enc.generic) act(env, 'decidesheet'); act(env, 'decide', { k: env.T.S.enc.deal === 'd18' ? 'pay' : 'decline' }); } while (!env.T.S.enc.done);
  act(env, 'close');
}
function finishDay(env) {
  if (env.T.S.phase === 'morning') act(env, 'open');
  while (env.T.S.slot < 3) { act(env, 'shop'); rejectCustomer(env); }
  if (env.T.S.phase === 'enc') rejectCustomer(env);
  if (!env.T.S.night) act(env, 'meditate');
  act(env, 'sleep');
}
function toDay(env, day) { while (env.T.S.day < day) finishDay(env); }
function market(rain = true, trip = true, sourceRead = true) {
  const env = boot(); act(env, 'new'); toDay(env, 2);
  assert.equal(env.T.S.intel.i_opp_rain, undefined, '到第2日不自動得雨訊');
  if (rain) { act(env, 'readnews', { id: 'n_rain' }); assert.ok(env.T.S.intel.i_opp_rain); act(env, 'closesheet'); }
  toDay(env, 3); act(env, 'open'); act(env, 'enter', { id: 'market' });
  if (trip) act(env, 'opptrip'); if (sourceRead) act(env, 'oppsource');
  return env;
}
if (require.main === module) {
let env = market();
assert.equal(env.T.S.opportunities.O101.state, 'available');
assert.equal(env.T.S.stones, 120); assert.equal(env.T.held('hantie'), 6000);
const originalInventory = clone(env.T.S.lots);
const startSlot = env.T.S.slot, oneWrite = env.writes.length;
act(env, 'oppprepare'); assert.equal(env.writes.length - oneWrite, 1);
assert.equal(env.T.S.stones, 96); assert.equal(env.T.S.slot, startSlot);
assert.deepEqual(clone(env.T.S.lots), originalInventory, '備貨不耗舊物、普通庫存沒有副本');
assert.equal(env.T.S.opportunities.O101.stock.qty, 4);
act(env, 'oppprepare', {}, false); assert.equal(env.T.S.stones, 96);
env = reload(env); act(env, 'continue'); assert.equal(env.T.S.opportunities.O101.stock.qty, 4);
act(env, 'leave');
toDay(env, 4); act(env, 'open'); act(env, 'shop');
assert.equal(env.T.S.enc.opportunity, 'O101');
act(env, 'oppsale', {}, false); assert.equal(env.T.S.stones, 96, '沒試包不能收款');
act(env, 'oppfit'); env = reload(env); act(env, 'continue');
act(env, 'oppsale'); assert.equal(env.T.S.stones, 132); assert.equal(env.T.S.opportunities.O101.stock.qty, 0);
act(env, 'oppsale', {}, false); assert.equal(env.T.S.stones, 132);
env = reload(env); act(env, 'continue'); act(env, 'close');
act(env, 'shop'); assert.equal(env.T.S.enc.deal, 'd11');
act(env, 'verify'); act(env, 'verifyw', { id: 'bai' });
assert.equal(env.T.S.stones, 127); assert.equal(env.T.S.slot, 2);
act(env, 'decidesheet'); act(env, 'decide', { k: 'decline' }); act(env, 'close');
act(env, 'meditate'); act(env, 'sleep'); act(env, 'open'); act(env, 'shop');
assert.equal(env.T.S.day, 5); assert.equal(env.T.S.enc.deal, 'd12');
act(env, 'decidesheet'); act(env, 'decide', { k: 'decline' }); act(env, 'close');
toDay(env, 6);
assert.equal(env.T.S.opportunities.O101.state, 'return_due'); assert.equal(env.T.S.intel.i_opp101_return, undefined);
env = reload(env); act(env, 'continue'); const beforeReadFailure = state(env), beforeReadRaw = env.storage.get(KEY); env.faults.set = true; act(env, 'oppreturn'); assert.deepEqual(state(env), beforeReadFailure); assert.equal(env.storage.get(KEY), beforeReadRaw); env.faults.set = false; act(env, 'oppreturn');
assert.equal(env.T.S.opportunities.O101.state, 'settled'); assert.ok(env.T.S.intel.i_opp101_return);
assert.equal(env.T.S.stones, 127); assert.equal(env.T.held('wax_wrap_set'), 0);
const receipts = clone(env.T.S.opportunities.O101.receipts);
act(env, 'closesheet'); act(env, 'oppreturn'); assert.equal(env.T.UI.sheet.type, 'oppreturn');
assert.deepEqual(clone(env.T.S.opportunities.O101.receipts), receipts);
env = reload(env); assert.equal(env.T.S.stones, 127);
assert.equal(env.T.S.events.some(event => String(event.id).includes('O101')), false);
assert.equal(env.T.dealAvail(env.T.DEALS.d13), false);
console.log('通過：未鎖定UI action完整取得A/B/現貨→24備貨→第4日試包收36→查證5/一格→第5日d12→第6日實讀回報；逐階段存讀與連點');

for (const args of [[false, true, true], [true, false, true], [true, true, false]]) {
  const missing = market(...args), before = state(missing);
  if (!args[2]) assert.match(missing.nodes['#app'].innerHTML, /供貨尚待現場確認/);
  act(missing, 'oppprepare', {}, false);
  assert.deepEqual(state(missing), before, '缺線頭／來源不可扣款');
}
const short = market(); short.T.S.stones = 23; act(short, 'oppprepare', {}, false); assert.equal(short.T.S.stones, 23);
const left = market(); act(left, 'leave'); act(left, 'oppprepare', {}, false); assert.equal(left.T.S.stones, 120);
let reenter = reload(left); act(reenter, 'continue'); act(reenter, 'enter', { id: 'market' });
assert.equal(visible(reenter, 'oppprepare', {}), false, '新session不能沿用上一現場快照');
act(reenter, 'oppsource'); act(reenter, 'oppprepare'); assert.equal(reenter.T.S.stones, 96);
const declined = market(); act(declined, 'oppdecline'); assert.equal(declined.T.S.stones, 120); act(declined, 'leave'); toDay(declined, 4); act(declined, 'open'); act(declined, 'shop'); assert.notEqual(declined.T.S.enc.opportunity, 'O101');
console.log('通過：缺一線頭／缺source／23不足／離場失效／換session重新看貨／拒絕仍可顧店');

const failure = market(), beforeFailure = state(failure), failureRaw = failure.storage.get(KEY);
failure.faults.set = true; act(failure, 'oppprepare');
assert.deepEqual(state(failure), beforeFailure); assert.equal(failure.storage.get(KEY), failureRaw);
failure.faults.set = false; act(failure, 'oppprepare'); assert.equal(failure.T.S.stones, 96);
act(failure, 'leave'); toDay(failure, 4); act(failure, 'open'); act(failure, 'shop'); act(failure, 'oppfit');
const beforeSaleFailure = state(failure); failure.faults.set = true; act(failure, 'oppsale'); assert.deepEqual(state(failure), beforeSaleFailure);
failure.faults.set = false; act(failure, 'oppsale'); assert.equal(failure.T.S.stones, 132);
const conflict = market(), conflictBefore = state(conflict); conflict.storage.set(KEY, JSON.stringify({ otherTab: true })); act(conflict, 'oppprepare'); assert.deepEqual(state(conflict), conflictBefore); assert.equal(conflict.storage.get(KEY), '{"otherTab":true}');
console.log('通過：備貨／成交寫入失敗回滾S、session、stock；重試各一次；偵測另一分頁更新');

const expired = market(); act(expired, 'oppprepare'); act(expired, 'leave'); toDay(expired, 4); act(expired, 'open');
// 正常外出三次，整天沒有顧店；並非把state灌成expired。
for (let i = 0; i < 3; i++) { act(expired, 'enter', { id: 'market' }); act(expired, 'leave'); }
act(expired, 'meditate'); const beforeExpireFailure = state(expired), beforeExpireRaw = expired.storage.get(KEY); expired.faults.set = true; act(expired, 'sleep'); assert.deepEqual(state(expired), beforeExpireFailure); assert.equal(expired.storage.get(KEY), beforeExpireRaw); expired.faults.set = false; act(expired, 'sleep');
assert.equal(expired.T.S.opportunities.O101.state, 'expired'); assert.equal(expired.T.S.stones, 96); assert.equal(expired.T.held('wax_wrap_set'), 4);
assert.equal(expired.T.S.opportunities.O101.stock.qty, 0);
const disposedReceipt = clone(expired.T.S.opportunities.O101.receipts.disposition);
expired.T.tickOpportunities(); expired.T.tickOpportunities(); assert.equal(expired.T.held('wax_wrap_set'), 4);
assert.deepEqual(clone(expired.T.S.opportunities.O101.receipts.disposition), disposedReceipt);
act(expired, 'oppsale', {}, false); assert.equal(expired.T.S.stones, 96);
const none = market(); act(none, 'leave'); toDay(none, 5); assert.equal(none.T.held('wax_wrap_set'), 0); assert.equal(none.T.S.stones, 120);
const failedFit = market(); act(failedFit, 'oppprepare'); act(failedFit, 'leave'); toDay(failedFit, 4); act(failedFit, 'open'); act(failedFit, 'shop'); act(failedFit, 'oppreject'); assert.equal(failedFit.T.S.opportunities.O101.state, 'failed'); assert.equal(failedFit.T.held('wax_wrap_set'), 4); assert.equal(failedFit.T.S.stones, 96);
console.log('通過：未顧店過期一次轉普通四份／退款0；未備貨過期無貨；試包拒售分failed；不能再成交');

const cross = reload(failure);
act(cross, 'continue');
const r = cross.T.S.opportunities.O101;
// 人工時間probe只挪已真正成交的收據，不改O101故事日期或新增第三月案。
cross.T.S.day = 6; cross.T.S.slot = 0; cross.T.S.phase = 'morning'; cross.T.S.enc = null;
r.soldAt = 6; r.dueAbs = 8; r.receipts.sale.at = 6;
cross.T.render();
act(cross, 'open'); finishDay(cross); assert.equal(cross.T.S.phase, 'end');
const beforeEnd = clone(cross.T.S.opportunities.O101); cross.T.tickOpportunities(); assert.deepEqual(clone(cross.T.S.opportunities.O101), beforeEnd);
act(cross, 'nextmonth'); assert.equal(cross.T.S.opportunities.O101.state, 'sold');
finishDay(cross); assert.equal(cross.T.S.month, 2); assert.equal(cross.T.S.day, 2); assert.equal(cross.T.S.opportunities.O101.state, 'return_due');
assert.equal(cross.T.S.intel.i_opp101_return, undefined); const cashAtReturn = cross.T.S.stones;
act(cross, 'oppreturn'); assert.equal(cross.T.S.stones, cashAtReturn); assert.equal(cross.T.S.opportunities.O101.state, 'settled');
console.log('通過：人工abs6成交/abs8回報probe，月底不提前／end不tick／跨月不丟／實讀才記消息');

const valid = state(market());
for (const mutate of [s => { delete s.opportunities.O101.receipts; }, s => { s.opportunities.O101.stock.qty = 4; }, s => { s.opportunities.O101.state = 'unknown'; }, s => { s.opportunities.O101.receipts.prepare = { id: 'O101:prepare', at: 3 }; s.opportunities.O101.preparedAt = 3; }, s => { s.intel = null; }, s => { s.unitsVersion = 1; }, s => { delete s.visitSeq; }, s => { s.phase = 'unknown'; }, s => { s.level = -1; }, s => { s.xp = '30'; }]) {
  const broken = clone(valid); mutate(broken); const raw = JSON.stringify(broken), rejected = boot(raw);
  assert.equal(rejected.T.S, null); assert.equal(rejected.storage.get(KEY), raw); assert.equal(rejected.writes.length, 0);
}
console.log('通過：部分v2record／矛盾貨與收據／未知狀態／null／錯單位拒讀保留raw，不恢復成可重領狀態');

const protection = boot(); act(protection, 'new'); const p = protection.T;
// 人工防護probe，未冒稱玩家可達樣本。
p.S.lots = [{ id: 3, item: 'hudeng', qty: 1, cost: 0, q: 1, flags: [], known: true, label: '燈' }, { id: 4, item: 'chiyan', qty: 1, cost: 10, q: 1, flags: ['entrusted'], known: true, label: '受託貨' }, { id: 5, item: 'hantie', qty: 600, cost: 8, q: 1, flags: ['evidence'], known: true, label: '證物' }]; p.S.lotSeq = 5; p.S.stones = 0; p.S.day = 6; p.S.slot = 2; p.S.phase = 'day';
p.advanceSlot(); assert.equal(p.encOptions().some(o => o.key === 'goods'), false); p.decide('goods'); assert.equal(p.held('hudeng'), 1); assert.equal(p.held('chiyan'), 1); assert.equal(p.held('hantie'), 600);
p.S.place = { id: 'market' }; p.marketStall([3, 4, 5]); assert.equal(p.S.lots.length, 3); p.sellToSmith(5); p.sellToHuichun(4); assert.equal(p.S.lots.length, 3);
console.log('通過：新引擎實際抵費／marketStall／smith／huichun入口保護燈、受託及證物；敘事歸還入口未封takeQty');
// 人工壞UI probe：persist後render拋例外仍須保留已提交狀態，而非回滾S。
const renderFailure = market(), beforeRenderWrites = renderFailure.writes.length;
renderFailure.faults.render = true; act(renderFailure, 'oppprepare');
assert.equal(renderFailure.T.S.stones, 96); assert.equal(renderFailure.T.S.opportunities.O101.state, 'prepared');
assert.equal(renderFailure.writes.length - beforeRenderWrites, 1); assert.deepEqual(state(reload(renderFailure)), state(renderFailure));
assert.ok(renderFailure.appended.some(node => /進度已儲存/.test(node.textContent))); 
// 通用散客入口與配方備貨必須保護，不能只依UI不顯示。
for (const lot of clone(p.S.lots)) { p.S.enc = { generic: true, lot: lot.id, qty: lot.qty, price: 10, th: [] }; const cash = p.S.stones; p.decide('sell'); assert.equal(p.S.stones, cash); assert.equal(p.held(lot.item), lot.qty); }
p.S.enc = null; p.S.phase = 'place'; p.S.place = { id: 'smith', session: '1:6:1' }; p.S.stones = 100;
p.S.lots.find(l => l.item === 'hantie').qty = 3000; const beforeRecipe = clone(p.S.lots);
act(protection, 'commission', {}, false); assert.deepEqual(clone(p.S.lots), beforeRecipe); assert.equal(p.S.commission, null); assert.equal(p.S.stones, 100);
p.S.lots.push({ id: 6, item: 'hantie', qty: 3000, cost: 8, q: 1, flags: [], known: true, label: '一般配料' }); p.S.lotSeq = 6;
act(protection, 'commission', {}, false); assert.equal(p.S.stones, 90); assert.equal(p.S.commission.cost, 50); assert.equal(p.S.lots.some(l => l.id === 6), false); assert.equal(p.S.lots.find(l => l.id === 5).qty, 3000);
const entrusted = p.S.lots.find(l => l.flags.includes('entrusted'));
const nw = p.netWorth(); entrusted.qty = 99; assert.equal(p.netWorth(), nw, '受託貨不灌身家');
console.log('通過：persist後render故障保已提交紀錄；generic實扣貨／配方入口保護；受託貨不灌資產');

// 實際core價款／退款與普通量詞，未把報價四捨五入為每公克0。
const metric = boot(); act(metric, 'new'); metric.T.startDeal('d01', 'shop'); const quotedTotal = 10 * metric.T.S.enc.price; metric.T.decide('deal');
assert.equal(metric.T.held('hantie'), 0); assert.equal(metric.T.S.stones, 120 + quotedTotal);
assert.equal(metric.T.quantityText('hantie', 6000), '6公斤'); assert.equal(metric.T.D.places.smith.commission.needQty, 3000);
const ordinaryValue = expired.T.netWorth(); expired.T.S.lots.find(l => l.item === 'wax_wrap_set').qty = 3;
assert.equal(expired.T.netWorth(), ordinaryValue - expired.T.price('wax_wrap_set'), '轉普通貨部分售出後按剩量估值');
assert.equal(cross.T.S.done.d13, undefined, '被替代d13不得算錯過'); assert.ok(cross.T.S.bestScores[1]); assert.equal([...cross.storage.keys()].some(key => key.startsWith('fangshi-best-')), false, 'best只在同一新局JSON，沒有另寫舊key');
console.log('通過：原10單位轉6000公克，實際賣出全批價款等於原10個報價單位；轉貨剩3份按剩量估值；d13不算錯過');

// 真正重新開始action：只帶v2最高分，商案與當局清空；失敗仍可重試。
const restart = reload(cross), oldBest = clone(cross.T.S.bestScores);
act(restart, 'askrestart'); const beforeRestart = state(restart), restartRaw = restart.storage.get(KEY);
restart.faults.set = true; act(restart, 'new'); assert.deepEqual(state(restart), beforeRestart); assert.equal(restart.storage.get(KEY), restartRaw);
restart.faults.set = false; const writesBeforeRestart = restart.writes.length; act(restart, 'new');
assert.equal(restart.writes.length - writesBeforeRestart, 1); assert.deepEqual(clone(restart.T.S.bestScores), oldBest);
assert.equal(restart.T.S.day, 1); assert.equal(restart.T.S.stones, 120); assert.equal(restart.T.S.opportunities.O101.state, 'unavailable');
assert.deepEqual(clone(restart.T.S.opportunities.O101.receipts), {}); assert.deepEqual(clone(restart.T.S.history), []);
assert.deepEqual(clone(reload(restart).T.S.bestScores), oldBest);
console.log('通過：實際重新開始action保v2最高分／商案歸零／一次persist／失敗回滾／reload保最高分，不讀舊best key');

const oldRaw = fs.readFileSync(path.join(root, 'tools/fixtures/legacy_v1_missing_defaults.json'), 'utf8');
const compatibility = boot(undefined, oldRaw); act(compatibility, 'legacy'); assert.equal(compatibility.nodes['legacy-frame'].srcdoc, compatibility.T.legacyHTML);
const importEnv = boot(); importEnv.nodes['legacy-json'].value = oldRaw; importEnv.T.onAct('legacyimport', { dataset: {} });
assert.equal(importEnv.storage.get(OLD), oldRaw); assert.equal(importEnv.storage.get(KEY), undefined);
assert.equal([...importEnv.storage].find(([key]) => key.startsWith('fangshi-v1-import-backup-'))[1], '原版原文保留');
const activeOld = fs.readFileSync(path.join(root, 'tools/fixtures/legacy_v1_active_event.json'), 'utf8'); const activeImport = boot(); activeImport.nodes['legacy-json'].value = activeOld; activeImport.T.onAct('legacyimport', { dataset: {} }); assert.equal(activeImport.storage.get(OLD), activeOld);
const newRawBeforeImport = renderFailure.storage.get(KEY); renderFailure.nodes['legacy-json'].value = oldRaw; renderFailure.T.onAct('legacyimport', { dataset: {} }); assert.equal(renderFailure.storage.get(KEY), newRawBeforeImport);
for (const invalid of ['{"v":1}', JSON.stringify({ ...JSON.parse(oldRaw), v: 2 }), JSON.stringify({ ...JSON.parse(oldRaw), lots: [{ ...JSON.parse(oldRaw).lots[0], item: 'wax_wrap_set' }] })]) { const rejected = boot(undefined, oldRaw); rejected.nodes['legacy-json'].value = invalid; rejected.T.onAct('legacyimport', { dataset: {} }); assert.equal(rejected.storage.get(OLD), oldRaw); assert.equal(rejected.writes.length, 0); }
importEnv.T.onAct('legacyexport', { dataset: {} });
importEnv.exports[0].text().then(raw => assert.equal(raw, oldRaw));
console.log('通過：內附原版srcdoc逐字相同；v1代表性缺預設欄位樣本可匯入／原文匯出／備份原文，拒v2與新物品；new key不變');
console.log('全部O101核心測試完成；Node VM＋HTML可用按鈕核對，未測真實Browser DOM/畫面/平衡。');

}
module.exports = { boot, visible, act, state, reload, rejectCustomer, finishDay, toDay, market, clone, KEY, OLD };
