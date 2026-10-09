"""第一批外稿的定點測試：每個新地點、散事、遺物效果、謎題簿、成就都跑一次。"""
import json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
page = pathlib.Path('/tmp/fs/b1.html'); page.write_text((ROOT / 'dist/game.html').read_text(encoding='utf-8'), encoding='utf-8')
JS = r"""
(() => {
  const T = window.__fs, out = [], err = [];
  const fresh = () => { T.S = T.newGame(4242); T.S.level = 8; T.S.stones = 999; T.S.phase = 'day'; T.S.slot = 1; T.S.flags.saw_below_lights = 1; T.S.flags.rode_bus = 1; T.S.flags.platform_found = 1; return T.S; };
  const visit = (pid, ids, roll = 0.99) => {
    window.__deathRoll = () => roll;
    T.S.slot = Math.min(T.S.slot, 1); T.S.phase = 'day'; T.S.place = null;
    T.enterPlace(pid);
    if (!T.S.place) { err.push('cannot enter ' + pid); return; }
    for (const id of ids) { T.S.place.acted = false; T.S.place.strain = false; T.S.place.steps = 0;
      const sp = T.spotList(pid).find(x => x.id === id); if (!sp) { err.push('no spot ' + id); continue; }
      const before = T.S.explored[id]; T.explore(id);
      if (!T.S.explored[id] && !before) err.push('not explored ' + id + ' need=' + JSON.stringify(sp.need) + ' ok=' + T.needOk(sp.need));
      if (T.S.dead) { out.push(id + ' DEAD ' + T.S.dead.id); return; }
    }
    T.S.phase = 'place'; T.leavePlace();
  };
  fresh();
  visit('school', ['sc_roll', 'sc_tape', 'sc_answer']);
  visit('tea', ['tea_seat', 'tea_story', 'tea_half']);
  const st0 = T.shopStats().rest; out.push('rest with banbei ' + st0);
  visit('office', ['of_overtime', 'of_sign']);
  visit('homes', ['hm_light', 'hm_fold']);
  out.push('protect flower_eat ' + T.gearStats().protect.flower_eat);
  T.S.burden = 9; visit('stair', ['st_b1', 'st_echo', 'st_light_step', 'st_lab', 'st_plate', 'st_inner', 'st_stop', 'st_card']); out.push('burden after light step ' + T.S.burden + ' life ' + T.S.lifespan);
  visit('north', ['no_shell']); out.push('steps ' + T.gearStats().steps);
  T.S.flags.branch_sign = 1;
  visit('lampst', ['ls_enter', 'ls_flicker', 'ls_windows', 'ls_shop', 'ls_branch']); out.push('protect fog ' + T.gearStats().protect.fog_lamp);
  T.S.burden = 8; visit('platform', ['pf_arrive', 'pf_announce', 'pf_ticket']); out.push('burden after ticket ' + T.S.burden);
  out.push('threads ' + JSON.stringify(T.threadState ? T.THREADS.filter(t => ['rollcall', 'b217', 'branch'].includes(t.id)).map(t => [t.id, JSON.stringify(T.threadState(t))]) : 'n/a'));
  // 死法：每一個新死法都要能觸發
  for (const [pid, id, pre] of [['school', 'sc_answer', ['sc_roll']], ['tea', 'tea_all', ['tea_seat', 'tea_half']], ['homes', 'hm_stay', ['hm_light']], ['stair', 'st_slipper', ['st_b1', 'st_lab', 'st_plate']], ['lampst', 'ls_return', ['ls_enter', 'ls_flicker']], ['platform', 'pf_yellow', ['pf_arrive', 'pf_announce']], ['north', 'no_shell_sit', ['no_shell']]]) {
    fresh(); T.S.month = 2; visit(pid, pre); T.S.lots = T.S.lots.filter(l => l.item !== 'naiya'); visit(pid, [id], 0.01); out.push(id + ' -> ' + (T.S.dead ? T.S.dead.id : 'alive'));
  }
  // 散事
  for (const [eid, flags] of [['dr_branch_sign', []], ['dr_overtime_due', ['overtime_signed']], ['dr_footprints', ['saw_shell']]]) {
    const e = T.ALLEV[eid]; if (!e) { err.push('no drift ' + eid); continue; }
    e.choices.forEach((c, i) => { fresh(); T.S.month = 2; flags.forEach(f => T.S.flags[f] = 1); window.__deathRoll = () => 0.01;
      T.S.cards = [{ title: e.title, text: e.text, drift: eid, choices: e.choices.map(x => ({ label: x.label })) }]; T.driftChoose(0, i);
      out.push(eid + '#' + i + ' ' + (T.S.dead ? 'DEAD ' + T.S.dead.id : 'ok ' + (T.S.cards[0].notes || []).join('/'))); });
  }
  // 夥計
  fresh(); T.S.flags.stair_b1 = 1; T.S.month = 2;
  for (const id of ['amai', 'xiaohe', 'tishu', 'chunjiao', 'aque', 'momo']) { T.S.shop.staff = []; const ok = T.hireStaff(id); out.push(id + ' hire ' + ok + ' ' + JSON.stringify(T.shopStats().security) + ' asc ' + T.gearStats().ascent); }
  // 成就
  T.checkAchieve(); out.push('ach ' + JSON.stringify(Object.keys(T.achBook()).filter(k => ['a_rollcall', 'a_b217', 'a_branch', 'a_shell'].includes(k))));
  // ── 遺物效果 ──
  const give = id => T.S.lots.push({ id: 'L' + Math.random(), item: id, qty: 1, cost: 0, q: 1, flags: [], label: T.IT[id].name, known: true });
  fresh(); const tr0 = T.shopStats().traffic; give('muxie'); give('budeng'); out.push('passive traffic ' + tr0 + '->' + T.shopStats().traffic + ' night ' + T.shopStats().night);
  fresh(); give('dengsui'); T.S.flags.saw_fog_lamp = 1;
  { const r = (() => { window.__deathRoll = () => 0.4; const notes = []; return T.relicEff().length; })(); }
  // 直接用 applyFx 模擬「霧裡的燈」：基礎 0.6，碎片減半 → 0.3；擲 0.4 → 被碎片救
  window.__deathRoll = () => 0.4;
  { const n = (window.__fs.applyFx || (() => ['no applyFx']))({ death: { id: 'fog_lamp', chance: 0.6 } }); out.push('protect notice: ' + JSON.stringify(n) + ' dead=' + !!T.S.dead); }
  fresh(); give('huangdeng'); out.push('warn: ' + JSON.stringify(T.warnRelic({ death: { id: 'cliff_jump', chance: 0.2 } })));
  fresh(); give('fapiao'); give('daoyu'); give('bijiben'); give('shenhua'); let lines = [], life0 = T.S.lifespan;
  for (let d = 0; d < 14; d++) { T.S.phase = 'day'; T.S.night = null; T.S.burden = 3; T.goNight(); lines.push(...(T.S.night.relicLines || []).map(x => x.id + ':' + x.notes.join('/'))); T.S.day = (T.S.day % 6) + 1; }
  out.push('night triggers: ' + lines.join(' | ')); out.push('relicOn ' + JSON.stringify(T.S.night.relicOn));
  fresh(); give('banpai'); window.__deathRoll = () => 0.99; T.S.burden = 0; T.S.phase = 'day'; T.enterPlace('ruin'); const sp = T.spotsAvail('ruin').filter(x => !x.strain && !x.repeat && !(x.fx && x.fx.death)).slice(0, 3);
  sp.forEach(x => T.explore(x.id)); out.push('steps notice: ' + JSON.stringify((T.S.place.found || {}).notes) + ' steps=' + T.S.place.steps);
  out.push('relicLog ' + JSON.stringify((T.S.relicLog || []).slice(-3)));
  // ── 遺物：回程保護、拿出來用、當鑰匙、事件選項（失敗會進 err） ──
  const ok = (c, m) => { out.push((c ? 'PASS ' : 'FAIL ') + m); if (!c) err.push(m); };
  const ascRate = (pid, ids) => { let n = 0; for (let i = 0; i < 100; i++) { fresh(); ids.forEach(give); T.S.flags.ascent_grace = true; T.S.slot = 0; T.enterPlace(pid); T.S.place.steps = 1; T.S.burden = T.burdenLimit() + 2; window.__deathRoll = () => (i + 0.5) / 100; T.leavePlace(); if (T.S.dead) n++; } return n / 100; };
  for (const [rid, pid] of [['lupai', 'ruin'], ['wuguan', 'reservoir'], ['piaogen', 'stair'], ['lengyu', 'north'], ['zhanwu', 'platform']]) { const a = ascRate(pid, []), b = ascRate(pid, [rid]); ok(b < a, `ascent ${rid}@${pid} ${a}->${b}`); }
  fresh(); give('quepiao'); T.S.slot = 0; T.enterPlace('ruin'); T.S.place.steps = 1; T.S.burden = 30; const sl = T.S.slot; ok(T.relicUseState('quepiao').ok && T.useRelic('quepiao') && !T.S.dead && T.S.burden === 15 && !T.held('quepiao') && T.S.slot === sl + 1, 'use quepiao safe return');
  fresh(); give('banpai'); T.S.slot = 0; T.enterPlace('ruin'); T.S.place.steps = 3; T.S.place.acted = true; ok(T.useRelic('banpai') && !T.S.place.acted && !T.relicUseState('banpai').ok, 'use banpai extra step, once a day');
  fresh(); give('banbei'); T.S.burden = 5; ok(T.useRelic('banbei') && T.S.burden === 3 && T.held('banbei') === 1, 'use banbei');
  fresh(); give('dengsui'); ok(T.useRelic('dengsui') && T.S.reveal, 'use dengsui reveal');
  fresh(); give('xiangpi'); T.S.burden = 6; ok(T.useRelic('xiangpi') && T.S.burden === 4 && !T.held('xiangpi'), 'use xiangpi erase');
  fresh(); give('naiya'); T.S.shop.staff = ['akai']; const g0 = T.shopStats().greed; T.S.place = null; ok(T.useRelic('naiya') && T.shopStats().greed < g0, 'use naiya noSkim ' + g0);
  fresh(); give('chachou'); const ik = Object.keys(T.IN).find(k => T.IN[k].kind === 'heard'); T.S.intel[ik] = { day: 1, m: 1, src: 'x' }; ok(T.useRelic('chachou') && T.S.truthKnown[ik] && !T.held('chachou'), 'use chachou truth ' + ik);
  fresh(); give('qianbi'); T.S.heat = 3; let h = 0; for (let d = 0; d < 12; d++) { T.S.phase = 'day'; T.S.night = null; T.goNight(); T.S.day = (T.S.day % 6) + 1; } ok(T.S.heat < 3, 'qianbi lowers heat -> ' + T.S.heat);
  fresh(); const t0 = T.shopDay('est', true).total; give('baihua'); give('xiaozhong'); give('fengling'); ok(T.shopDay('est', true).total > t0, 'shop relics visible ' + t0 + '->' + T.shopDay('est', true).total);
  fresh(); T.S.flags.lin_dummy = 1; give('chanke'); const l0 = T.gearStats().limit; T.S.flags.studied_chanke = true; ok(T.gearStats().limit > l0, 'studied relic stronger');
  fresh(); give('huangdeng'); ok(T.protectMult('cliff_jump') < 1, 'huangdeng protectAll');
  // 鑰匙
  for (const [pid, sid, rid, pre] of [['homes', 'hm_return', 'zhifu', ['hm_light', 'hm_fold']], ['lampst', 'ls_branch_pay', 'muxie', []], ['reservoir', 're_plate', 'cunpai', []], ['tunnel', 'tu_letter', 'laixin', []]]) {
    fresh(); T.S.month = 2; pre.forEach(x => T.S.explored[x] = 1); ['ls_enter', 'ls_shop', 'ls_branch', 're_dive', 'tu_wall_hand'].forEach(x => T.S.explored[x] = 1); T.S.flags.branch_sign = 1; give(rid); T.S.place = null; T.S.slot = 0; window.__deathRoll = () => 0.99; T.enterPlace(pid);
    const before = T.held(rid); T.explore(sid); ok(T.S.explored[sid] && T.held(rid) < before, 'key ' + rid + ' -> ' + sid);
  }
  // 事件裡持有遺物才出現的選項
  for (const [eid, rid, extra] of [['se_night2', 'wenbi', {}], ['se_robbery', 'fengling', {}], ['se_breath_box', 'huishi', {}], ['se_amei_missing', 'dengsui', {}], ['dr_flowers_turn', 'zhifu', {}], ['dr_frost_night', 'lengyu', {}], ['dr_fapiao_draw', 'fapiao', {}], ['dr_youyou_beep', 'youyou', {}], ['dr_keben_hill', 'keben', {}], ['dr_patrol_roll', null, {}]]) {
    fresh(); T.S.month = 3; T.S.dayCount = 6; if (rid) give(rid); const e = T.ALLEV[eid]; if (!e) { ok(false, 'no event ' + eid); continue; }
    const opts = e.choices.filter(c => T.needOk(c.need || {})); const i = rid ? (e.need && e.need.has && e.need.has[rid] ? (T.needOk(e.need) ? 0 : -1) : opts.findIndex(c => c.need && c.need.has && c.need.has[rid])) : 0;
    T.S.cards = [{ title: e.title, text: e.text, drift: eid, choices: opts.map(x => ({ label: x.label })) }]; window.__deathRoll = () => 0.01; T.driftChoose(0, i < 0 ? 0 : i);
    ok(i >= 0 && !T.S.dead && T.S.cards[0].picked != null, 'event ' + eid + ' relic choice ' + (rid || '') + ' ' + (T.S.cards[0].notes || []).join('/'));
  }
  return { out, err };
})()
"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(page.as_uri()); pg.wait_for_timeout(300)
    r = pg.evaluate(JS)
    print('\n'.join(r['out'])); print('ERR', r['err'], errs)
    b.close()
