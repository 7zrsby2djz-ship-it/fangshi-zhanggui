#!/usr/bin/env node
'use strict';
// 載入原 game.js 全文，只以真正的 DOM 容器／localStorage 介面替身執行。
// start、store、migrate、save、render 及所有經濟函式皆未替換或抽出重寫。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const fixtureDir = path.join(__dirname, 'fixtures');
const data = JSON.parse(fs.readFileSync(path.join(root, 'dist/data.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'game.js'), 'utf8').replace('__GAME_DATA__', JSON.stringify(data));
const KEY = 'fangshi-p1-v1';
const clone = value => JSON.parse(JSON.stringify(value));

function boot(raw) {
  const storage = new Map(raw === undefined ? [] : [[KEY, raw]]);
  const calls = { reads: 0, writes: 0 };
  const nodes = Object.fromEntries(['#app', '#bar', '#hud', '#sheet'].map(id => [id, { innerHTML: '', hidden: false, offsetHeight: 60 }]));
  const document = {
    querySelector: selector => nodes[selector] || null,
    getElementById: () => null,
    addEventListener() {},
    documentElement: { style: { setProperty() {} } },
    body: { appendChild() {} },
    createElement: () => ({ remove() {} })
  };
  const window = { addEventListener() {}, scrollTo() {} };
  const context = vm.createContext({ window, document, localStorage: {
    getItem(key) { calls.reads++; return storage.get(key) ?? null; },
    setItem(key, value) { calls.writes++; storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  }, requestAnimationFrame: callback => callback(), setTimeout: () => 0, console });
  vm.runInContext(source, context, { filename: 'game.js', timeout: 5000 });
  assert.ok(calls.reads > 0, '必須經過實際 localStorage 讀取入口');
  assert.equal(calls.writes, 0, '啟動不得改寫舊檔');
  return { T: window.__fs, storage, calls, nodes };
}
const act = (env, action, dataset = {}) => env.T.onAct(action, { dataset });
const fixture = name => JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8'));

function generateFixtures() {
  const env = boot();
  env.T.S = env.T.newGame(5052026);
  env.T.UI.view = 'game';
  act(env, 'open');
  assert.ok(env.T.dealAvail(env.T.DEALS.d02));
  act(env, 'deal', { id: 'd02' }); act(env, 'decide', { k: 'deal' }); act(env, 'close');
  act(env, 'enter', { id: 'market' });
  assert.ok(env.T.dealAvail(env.T.DEALS.d10));
  act(env, 'deal', { id: 'd10' }); act(env, 'decide', { k: 'special' });
  act(env, 'decide', { k: 'special' }); // 同一現場重按不能再發。
  act(env, 'close'); act(env, 'leave');
  assert.equal(env.T.held('hudeng'), 1);
  // 早期 v1 形狀：從原程式生成後，只刪本次 migrate 支援的頂層欄位。
  const early = clone(env.T.S);
  for (const key of ['month', 'monthStartLevel', 'history', 'statLog', 'intel', 'isold', 'heat', 'extraNews', 'accused', 'baiSold', 'intelSeenN']) delete early[key];
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'legacy_v1_missing_defaults.json'), JSON.stringify(early, null, 2) + '\n');
  while (env.T.S.day < 4) { act(env, 'evening'); act(env, 'sleep'); }
  act(env, 'open');
  assert.ok(env.T.dealAvail(env.T.DEALS.d12));
  act(env, 'deal', { id: 'd12' }); act(env, 'ask'); act(env, 'decide', { k: 'deal' });
  fs.writeFileSync(path.join(fixtureDir, 'legacy_v1_active_event.json'), env.storage.get(KEY) + '\n');
  console.log('已從原程式生成兩份代表性 v1 fixture（非真實玩家存檔）。');
}

if (process.argv.includes('--generate-fixtures')) generateFixtures();

for (const name of ['legacy_v1_missing_defaults.json', 'legacy_v1_active_event.json']) {
  const original = fixture(name);
  const env = boot(JSON.stringify(original));
  const expected = { month: 1, monthStartLevel: data.meta.startLevel, history: [], statLog: [], intel: {}, isold: {}, heat: 0, extraNews: [], accused: {}, baiSold: {}, intelSeenN: 0, ...original };
  assert.deepEqual(clone(env.T.S), expected, name + '：start→migrate 應只補預設值');
  act(env, 'continue');
  for (const tab of ['store', 'people', 'intel', 'main']) act(env, 'tab', { v: tab });
  assert.equal(env.T.held('hudeng'), 1);
  assert.equal(env.T.S.done.d10, 'special');
  const saved = env.storage.get(KEY);
  const reloaded = boot(saved);
  assert.deepEqual(clone(reloaded.T.S), JSON.parse(saved), '第二次讀取不得再遷移或變更');
  for (const key of ['stones', 'lots', 'done', 'events', 'mem', 'rel', 'enc', 'isold']) {
    assert.deepEqual(clone(reloaded.T.S[key]), clone(expected[key]), name + '：保留 ' + key);
  }
  assert.equal(reloaded.T.dealAvail(reloaded.T.DEALS.d10), false, '讀檔後正常入口不可重領燈');
  console.log('通過：' + name + ' 實際啟動／缺欄位遷移／繼續／四頁render／save／再次讀取');
}

const env = boot(JSON.stringify(fixture('legacy_v1_active_event.json')));
act(env, 'continue'); act(env, 'close');
while (env.T.S.day < 6) { act(env, 'evening'); act(env, 'sleep'); }
act(env, 'open'); act(env, 'evening'); act(env, 'sleep');
assert.equal(env.T.S.phase, 'end');
act(env, 'nextmonth');
assert.equal(env.T.S.month, 2);
assert.equal(env.T.S.done.d10, 'special');
assert.equal(env.T.held('hudeng'), 1);
assert.equal(env.T.dealAvail(env.T.DEALS.d10), false);
const secondMonth = boot(env.storage.get(KEY));
assert.equal(secondMonth.T.held('hudeng'), 1);
assert.equal(secondMonth.T.S.done.d10, 'special');
console.log('通過：正常領燈記錄經月底／跨月／save／load仍唯一；未修改舊事件結算規則');

for (const raw of ['{壞JSON', JSON.stringify({ v: 99 })]) {
  const rejected = boot(raw);
  assert.equal(rejected.T.S, null);
  assert.equal(rejected.storage.get(KEY), raw);
}
console.log('通過：壞 JSON／未知版本未被當成新局覆寫');

// 已知缺口的可重現證據；這些 assertions 描述既有行為，不能稱保護已通過。
const dues = boot(JSON.stringify(fixture('legacy_v1_active_event.json')));
dues.T.S.lots = dues.T.S.lots.filter(l => l.item === 'hudeng');
dues.T.S.stones = 0; dues.T.S.day = 6; dues.T.S.slot = 2; dues.T.S.enc = null; dues.T.S.dues = null;
dues.T.advanceSlot();
assert.ok(dues.T.encOptions().some(o => o.key === 'goods'));
dues.T.decide('goods');
assert.equal(dues.T.held('hudeng'), 0);
const direct = boot(JSON.stringify(fixture('legacy_v1_active_event.json')));
direct.T.S.place = { id: 'market' };
const lampId = direct.T.S.lots.find(l => l.item === 'hudeng').id;
direct.T.marketStall([lampId]);
assert.equal(direct.T.held('hudeng'), 0);
console.log('已驗限制：hudeng 可被規費抵貨消耗；marketStall 直接接受燈 lot ID（一般擺攤UI沒有此選項）');
// 人工異常／接口防護樣本，不宣稱是正常玩家已達路線。
const entrusted = boot(JSON.stringify(fixture('legacy_v1_active_event.json')));
const entrustedLot = { id: ++entrusted.T.S.lotSeq, item: 'chiyan', qty: 1, cost: 10, q: 1, flags: ['entrusted'], label: '受託品防護測試', known: true };
entrusted.T.S.lots = [entrustedLot]; entrusted.T.S.stones = 0;
entrusted.T.S.day = 6; entrusted.T.S.slot = 2; entrusted.T.S.enc = null; entrusted.T.S.dues = null;
entrusted.T.advanceSlot(); entrusted.T.decide('goods');
assert.equal(entrusted.T.held('chiyan'), 0);
console.log('已驗限制：單帶 entrusted 旗標的人工普通貨仍可被規費抵貨消耗；未冒稱可達玩家存檔');
console.log('完成：Node VM 核心測試；未測真實瀏覽器 DOM／視覺／Playwright／平衡／W06。');
