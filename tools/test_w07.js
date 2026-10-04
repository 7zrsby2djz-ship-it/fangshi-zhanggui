#!/usr/bin/env node
'use strict';
// Representative normal UI actions plus clearly labeled save/cash compatibility probes.
const assert = require('node:assert/strict');
const { boot, act, state, reload, rejectCustomer, finishDay, toDay, market, clone, KEY } = require('./test_o101');
function decision(e, k) { act(e, 'decidesheet'); act(e, 'decide', { k }); }
function s02(e, full = true) {
  act(e, 'open'); act(e, 'shop'); assert.equal(e.T.S.enc.scene, 's02');
  if (full) { for (let i = 0; i < 3; i++) act(e, 'm1scene', { k: 'next' }); }
  else act(e, 'm1scene', { k: 'decline' });
  act(e, 'close');
}
function mint(e, selection = 'all') {
  act(e, 'shop'); assert.equal(e.T.S.enc.scene, 's05');
  assert.doesNotMatch(e.nodes['#app'].innerHTML, /完整200|碎100|全收8|付7/, '未驗貨不先顯200/100與議定價');
  act(e, 'm1scene', { k: 'inspect' }); assert.match(e.nodes['#app'].innerHTML, /完整200/); assert.doesNotMatch(e.nodes['#app'].innerHTML, /全收300公克8|完整200公克7/);
  act(e, 'm1scene', { k: 'haggle' });
  if (selection) act(e, 'm1scene', { k: selection });
}
function normalToMint(delay = false) {
  let e = boot(); act(e, 'new'); act(e, 'readnews', { id: 'n_vein' }); act(e, 'closesheet'); act(e, 'open'); act(e, 'shop');
  assert.equal(e.T.S.enc.deal, 'd01'); assert.equal(e.T.S.enc.price, 6); assert.match(e.nodes['#app'].innerHTML, /60/);
  for (const quote of [6.5, 7]) { decision(e, 'decline'); assert.equal(e.T.S.enc.price, quote); assert.equal(e.T.S.stones, 120); assert.equal(e.T.held('hantie'), 6000); assert.equal(e.T.S.enc.done, null); }
  decision(e, 'decline'); assert.ok(e.T.S.enc.done); assert.equal(e.T.S.stones, 120); act(e, 'close'); finishDay(e);
  act(e, 'readnews', { id: 'n_rain' }); act(e, 'closesheet'); s02(e);
  assert.ok(e.T.S.intel.i_opp_han_short_intent); assert.equal(e.T.S.intel.i_opp101_trip, undefined);
  finishDay(e); act(e, 'open'); act(e, 'enter', { id: 'market' }); act(e, 'opptrip'); act(e, 'oppsource'); act(e, 'oppprepare'); assert.equal(e.T.S.stones, 96); act(e, 'leave');
  if (delay) { for (let i = 0; i < 2; i++) { act(e, 'enter', { id: 'market' }); act(e, 'leave'); } }
  finishDay(e);
  act(e, 'open'); act(e, 'shop'); act(e, 'oppfit'); act(e, 'oppsale'); assert.equal(e.T.S.stones, 132); act(e, 'close');
  act(e, 'shop'); assert.equal(e.T.S.enc.deal, 'd11'); act(e, 'verify'); act(e, 'verifyw', { id: 'bai' }); assert.equal(e.T.S.stones, 127); assert.equal(e.T.S.slot, 2); decision(e, 'decline'); act(e, 'close'); finishDay(e);
  act(e, 'open'); act(e, 'shop'); assert.equal(e.T.S.enc.deal, 'd12'); if (delay) { act(e, 'verify'); act(e, 'verifyw', { id: 'tie' }); assert.equal(e.T.S.slot, 1); } decision(e, 'decline'); act(e, 'close');
  return e;
}
let e = normalToMint();
const before = e.T.S.stones;
mint(e, null); e = reload(e); act(e, 'continue'); assert.equal(e.T.S.enc.step, 2);
const snapshot = state(e), raw = e.storage.get(KEY); e.faults.set = true; act(e, 'm1scene', { k: 'all' }); assert.deepEqual(state(e), snapshot); assert.equal(e.storage.get(KEY), raw);
e.faults.set = false; act(e, 'm1scene', { k: 'all' }); assert.equal(e.T.S.stones, before - 8);
const leaves = clone(e.T.S.lots.filter(l => l.item === 'dry_mint_leaf')); assert.deepEqual(leaves.map(l => [l.qty, l.gradeTag, l.totalCost, l.q]), [[200, 'whole_approx', 7, 1], [100, 'broken', 1, 1]]);
act(e, 'm1scene', { k: 'all' }, false); assert.equal(e.T.S.stones, 119); assert.equal(e.T.held('dry_mint_leaf'), 300); e = reload(e); act(e, 'continue'); act(e, 'close'); finishDay(e);
assert.equal(e.T.S.day, 6); assert.equal(e.T.S.intel.i_opp101_return, undefined); assert.equal(e.T.S.stones, 119); act(e, 'oppreturn'); assert.match(e.nodes['#sheet'].innerHTML, /繩頭|焦了一點/); assert.equal(e.T.S.stones, 119); assert.equal(e.T.held('wax_wrap_set'), 0); act(e, 'closesheet');
finishDay(e); assert.equal(e.T.S.phase, 'end'); assert.equal(e.T.S.dues.amount, 80); assert.equal(e.T.S.stones, 39); assert.equal(e.T.S.lifespan, 18); assert.equal(e.T.S.lifespanLeft, 17); assert.equal(e.T.D.meta.redeemCost, 300);
console.log('通過：正常UI拒60/65/70→S02真讀生活→O10124/36→查證5一格→D5d12→薄荷8雙批→D6回報0→實繳80餘39；存讀/連點/落盤失敗回滾');

// S01 also sells at each published batch quote; no cash is granted by changing text.
for (const raising of [0, 1, 2]) {
  const sale = boot(); act(sale, 'new'); act(sale, 'open'); act(sale, 'shop'); assert.doesNotMatch(sale.nodes['#app'].innerHTML, /許衡抽出讀過/);
  for (let i = 0; i < raising; i++) decision(sale, 'decline');
  decision(sale, 'deal'); assert.equal(sale.T.S.stones, 120 + [60, 65, 70][raising]); assert.equal(sale.T.held('hantie'), 0);
  act(sale, 'close'); finishDay(sale); s02(sale, false); assert.equal(sale.T.S.intel.i_opp_han_short_intent, undefined); assert.equal(sale.T.S.intel.i_opp_rain, undefined);
}
const partial = boot(); act(partial, 'new'); partial.T.S.lots[0].qty = 3000; // explicit partial-stock probe
act(partial, 'open'); act(partial, 'shop'); assert.equal(partial.T.S.enc.qty, 3000); assert.match(partial.nodes['#app'].innerHTML, /目前這批 3公斤/); decision(partial, 'deal'); assert.equal(partial.T.S.stones, 150); assert.equal(partial.T.held('hantie'), 0);
const verified = boot(); act(verified, 'new'); act(verified, 'open'); act(verified, 'shop'); act(verified, 'verify'); act(verified, 'verifyw', { id: 'tie' }); assert.ok(verified.T.S.intel.i_vein_false); assert.equal(verified.T.S.slot, 1); assert.equal(verified.T.S.stones, 120); decision(verified, 'decline'); decision(verified, 'decline'); decision(verified, 'decline'); act(verified, 'close'); assert.equal(verified.T.S.slot, 2);
console.log('通過：S01真成交60/65/70、3000g只收30、未讀報不假知；原tie查證0錢另占1格');

for (const selected of ['whole', 'decline']) {
  const route = normalToMint(), beforeMoney = route.T.S.stones, beforeRel = clone(route.T.S.rel); mint(route, selected);
  assert.equal(route.T.S.stones, beforeMoney - (selected === 'whole' ? 7 : 0)); assert.equal(route.T.held('dry_mint_leaf'), selected === 'whole' ? 200 : 0); assert.deepEqual(clone(route.T.S.rel), beforeRel);
  if (selected === 'whole') assert.match(route.nodes['#app'].innerHTML, /已付7靈石，收到完整200公克。碎葉100公克由老葛帶回/);
}
const short = normalToMint(); mint(short, null); short.T.S.stones = 6; // explicit cash-shortage probe
const shortBefore = state(short); act(short, 'm1scene', { k: 'all' }, false); act(short, 'm1scene', { k: 'whole' }, false); const shortAfter = state(short); delete shortBefore.saveRevision; delete shortAfter.saveRevision; assert.deepEqual(shortAfter, shortBefore); assert.equal(short.T.held('dry_mint_leaf'), 0);
// Normal UI: D3 external visits keep d21 pending; D5 d12 plus verification costs two slots, d21 takes the third. S05 remains reachable D6.
const delayed = normalToMint(true); assert.equal(delayed.T.S.slot, 2); assert.equal(delayed.T.S.done.d21, undefined);
act(delayed, 'shop'); assert.equal(delayed.T.S.enc.deal, 'd21'); decision(delayed, 'decline'); act(delayed, 'close'); assert.equal(delayed.T.S.slot, 3);
finishDay(delayed); act(delayed, 'open'); mint(delayed, 'all'); assert.equal(delayed.T.S.day, 6); assert.equal(delayed.T.held('dry_mint_leaf'), 300);
const absent = boot(); act(absent, 'new'); toDay(absent, 5); act(absent, 'open'); while (absent.T.nextShopDeal() && absent.T.nextShopDeal().days[1] < 6) { act(absent, 'shop'); rejectCustomer(absent); } act(absent, 'shop'); assert.equal(absent.T.S.enc.scene, 's05'); assert.match(absent.nodes['#app'].innerHTML, /我先看一下這袋/); assert.doesNotMatch(absent.nodes['#app'].innerHTML, /其他的呢/); act(absent, 'm1scene', { k: 'decline' }); act(absent, 'close');
console.log('通過：只整葉7、拒收0無人情處罰、6靈石不足不扣、D5競合可D6接薄荷、未聽S02不補家庭承接');

// Normal UI: hearing the entire life scene without reading the paper grants only that conversation.
const unread = boot(); act(unread, 'new'); toDay(unread, 2); s02(unread);
assert.ok(unread.T.S.intel.i_opp_han_short_intent); assert.equal(unread.T.S.intel.i_opp_rain, undefined); assert.equal(unread.T.S.intel.i_opp101_trip, undefined);
toDay(unread, 5); act(unread, 'open'); act(unread, 'shop'); assert.equal(unread.T.S.enc.scene, 's05');
const unopenedMoney = unread.T.S.stones, unopenedRel = clone(unread.T.S.rel);
act(unread, 'm1scene', { k: 'decline' }); assert.match(unread.nodes['#app'].innerHTML, /還沒打開的原袋/); assert.doesNotMatch(unread.nodes['#app'].innerHTML, /兩盤葉子/);
assert.equal(unread.T.S.stones, unopenedMoney); assert.equal(unread.T.held('dry_mint_leaf'), 0); assert.deepEqual(clone(unread.T.S.rel), unopenedRel);
// Normal UI: showing power makes the real month-end fee high; bargaining with the collector does not meet or offend the police.
const fee = boot(); act(fee, 'new'); act(fee, 'stance', { v: '外放' }); toDay(fee, 6); act(fee, 'open');
while (fee.T.S.slot < 3) { act(fee, 'shop'); rejectCustomer(fee); }
assert.equal(fee.T.S.enc.deal, 'd18'); assert.equal(fee.T.S.enc.due, 100); assert.equal(fee.T.S.met.zhou, undefined);
const feeRel = clone(fee.T.S.rel); decision(fee, 'poor'); assert.equal(fee.T.S.enc.due, 100); assert.deepEqual(clone(fee.T.S.rel), feeRel); assert.equal(fee.T.S.met.zhou, undefined);
decision(fee, 'pay'); assert.equal(fee.T.S.stones, 20); assert.equal(fee.T.S.dues.amount, 100);
console.log('通過：未讀報完整S02仍不補A/B；未拆袋拒收不冒出兩盤葉子；正常外放規費100，拒降價不影響周正關係');

// Compatibility is an explicit probe of prior W06 v2 shape, not normal gameplay.
const old = boot(); act(old, 'new'); const prior = state(old); delete prior.monthOne; delete prior.monthOneVersion;
const migrated = boot(JSON.stringify(prior)); assert.equal(migrated.T.S.monthOne.s02, 'pending'); assert.equal(migrated.writes.length, 0); assert.equal(migrated.T.S.stones, 120);
for (const done of ['deal', 'decline', 'missed', 'na']) { const fixture = clone(prior); fixture.day = 5; fixture.done.d14 = done; const restored = boot(JSON.stringify(fixture)); assert.ok(restored.T.S); assert.equal(restored.T.S.monthOne.s05, ['missed','na'].includes(done) ? 'pending' : 'legacy_completed'); assert.equal(restored.T.held('dry_mint_leaf'), 0); }
const legacy = clone(prior); legacy.day = 5; legacy.phase = 'enc'; legacy.enc = { deal: 'd14', npc: 'ge', side: 'sell', item: 'langya', qty: 8, price: 4, tea: 4, teaMax: 4, th: [], press: 0, haggle: 0, asked: false, silent: false, appraised: false, verified: [], cold: false, done: null, from: 'shop', lot: null };
const resumed = boot(JSON.stringify(legacy)); assert.equal(resumed.T.S.monthOne.s05, 'legacy_active'); act(resumed, 'continue'); assert.match(resumed.nodes['#app'].innerHTML, /上版已開始/); decision(resumed, 'deal'); assert.equal(resumed.T.held('langya'), 8); assert.equal(resumed.T.S.stones, 88); act(resumed, 'close'); assert.equal(resumed.T.S.monthOne.s05, 'legacy_completed'); assert.equal(resumed.T.held('dry_mint_leaf'), 0);
// Legal W06 active snapshot can have an 80 quote from stance/realm. Keep the money and make new dialogue match it.
const oldQian = clone(prior); oldQian.phase = 'enc'; oldQian.enc = { ...legacy.enc, deal: 'd01', npc: 'qian', side: 'buy', item: 'hantie', qty: 6000, price: 8, tea: 10, teaMax: 10, lot: prior.lots[0].id };
const oldQuote = boot(JSON.stringify(oldQian)); act(oldQuote, 'continue'); act(oldQuote, 'silence'); assert.equal(oldQuote.T.S.enc.price, 8); assert.match(oldQuote.nodes['#app'].innerHTML, /總共 80 塊/); assert.doesNotMatch(oldQuote.nodes['#app'].innerHTML, /整箱六十五/); act(oldQuote, 'haggle'); assert.equal(oldQuote.T.S.enc.price, 8); decision(oldQuote, 'deal'); assert.equal(oldQuote.T.S.stones, 200); assert.equal(oldQuote.T.held('hantie'), 0);
const stale = boot(); act(stale, 'new'); stale.T.startDeal('d14', 'shop'); assert.equal(stale.T.S.enc, null); assert.equal(stale.T.dealAvail(stale.T.DEALS.d14), false);
const malformed = clone(state(stale)); delete malformed.monthOne.s05; assert.equal(boot(JSON.stringify(malformed)).T.S, null);
console.log('通過：W06v2無新增欄位唯讀補預設、done只保舊歷史；active d14原狼牙8/32續完且不補S05；新入口禁d14、partial場景拒讀保raw');
console.log('全部W07代表性核心驗收完成；Node VM＋最小DOM/正常HTML action，不是Browser版面或平衡驗收。');
