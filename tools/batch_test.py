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
  // ── v2：遺物事件鉤子、身上三格、第一次去、記得、找上門上限、日報不重複、站著看、把最重的留下 ──
  const satisfy = need => { if (!need) return; for (const [k, v] of Object.entries(need.has || {})) for (let i = 0; i < v; i++) give(k); [].concat(need.flag || []).forEach(f => T.S.flags[f] = 1); if (need.anyFlag) T.S.flags[[].concat(need.anyFlag)[0]] = 1; [].concat(need.not || []).forEach(f => delete T.S.flags[f]); if (need.minDays) T.S.dayCount = need.minDays + 1; if (need.anyOf) satisfy(need.anyOf[0]); };
  const prep = () => T.EXPLORE.forEach(p => T.spotList(p).forEach(sp => { const a = sp.after && T.spotList(p).find(x => x.id === sp.after); if (a && !(a.fx && a.fx.death)) T.S.explored[a.id] = 1; }));
  const HOOKS = [['ruin', 'ru_signback'], ['ruin', 'ru_shrine_return'], ['school', 'sc_tape_more'], ['school', 'sc_yearbook'], ['tea', 'tea_story_end'], ['cliff', 'cl_shell_bottle'], ['cliff', 'cl_bowl_back'], ['north', 'no_shell_feed'], ['north', 'no_vent_time'], ['lampst', 'ls_yellow'], ['lampst', 'ls_clock_back'], ['platform', 'pf_handover'], ['platform', 'pf_read'], ['stair', 'st_bus_back'], ['pawn', 'pw_slip']];
  for (const [pid, sid] of HOOKS) {
    fresh(); T.S.month = 2; const sp = T.spotList(pid).find(x => x.id === sid); if (!sp) { ok(false, 'hook spot missing ' + sid); continue; }
    satisfy(sp.need); if (sp.after) T.S.explored[sp.after] = 1; T.S.visits = { [pid]: 1 }; if (sp.months) T.S.month = sp.months[0]; if (sp.days) T.S.day = sp.days[0];
    window.__deathRoll = () => 0.99; T.S.slot = Math.min(T.S.slot, (T.D.places[pid].hours || [0])[0]); T.S.phase = 'day'; T.S.place = null; T.enterPlace(pid); T.explore(sid);
    ok(T.S.explored[sid] && !T.S.dead, 'hook ' + sid + ' ' + JSON.stringify((T.S.place && T.S.place.found || {}).notes || []));
  }
  for (const eid of ['dr_budeng_door', 'dr_tangzhi_kid']) { fresh(); T.S.month = 2; const e = T.ALLEV[eid]; satisfy(e.need); ok(T.needOk(e.need), 'hook drift need ' + eid); T.S.cards = [{ title: e.title, text: e.text, drift: eid, choices: e.choices.map(x => ({ label: x.label })) }]; T.driftChoose(0, 0); ok(!T.S.dead && T.S.cards[0].picked != null, 'hook drift ' + eid + ' ' + (T.S.cards[0].notes || []).join('/')); }
  for (const [eid, rid] of [['dr_branch_sign', 'anquanmao'], ['dr_fog_voice', 'wuguan'], ['dr_fog_again', 'wuguan'], ['se_bad_pill', 'boliye'], ['dr_frost_night', 'daoyu'], ['dr_overtime_due', 'qianbi']]) { const e = T.ALLEV[eid]; ok(e && e.choices.some(c => c.need && c.need.has && c.need.has[rid]), 'hook choice ' + eid + ' <- ' + rid); }
  for (const [pid, sid, pre] of [['north', 'no_shell_sit', ['no_shell']], ['lampst', 'ls_return', ['ls_enter', 'ls_flicker']], ['platform', 'pf_yellow', ['pf_arrive', 'pf_announce']]]) {
    const fl = { no_shell_sit: 'shell_fed', ls_return: 'lamp_on_time', pf_yellow: 'broadcast_fixed' }[sid];
    fresh(); T.S.month = 2; pre.forEach(x => T.S.explored[x] = 1); T.S.flags[fl] = 1; T.S.visits = { [pid]: 1 }; T.S.lots = T.S.lots.filter(l => l.item !== 'naiya'); window.__deathRoll = () => 0.01; T.S.slot = 0; T.S.phase = 'day'; T.enterPlace(pid); T.explore(sid);
    ok(!T.S.dead && T.S.explored[sid], 'patched ' + sid + ' saved by ' + fl);
  }
  // 身上三格
  fresh(); const carryIds = Object.keys(T.IT).filter(k => T.isCarryRelic(k)).slice(0, 4); carryIds.forEach(give); T.syncCarry();
  ok(T.S.carry.length === 3 && !T.S.carry.includes(carryIds[3]), 'carry 3 slots ' + JSON.stringify(T.S.carry));
  { const e4 = T.relicEff().find(([id]) => id === carryIds[3])[1]; ok(!e4.carry && !e4.warn && e4.stored, '4th carry relic inactive in storage'); }
  T.toggleCarry(carryIds[0]); T.toggleCarry(carryIds[3]); ok(T.S.carry.includes(carryIds[3]) && !T.S.carry.includes(carryIds[0]), 'carry swap');
  T.S.phase = 'day'; T.S.night = null; T.goNight(); ok((T.S.night.carryLines || []).length === 3, 'night carry lines ' + JSON.stringify(T.S.night.carryLines));
  // 第一次去：會死的地方先藏起來
  fresh(); prep(); T.S.month = 2; T.S.visits = {}; const lethal0 = T.spotsAvail('cliff').filter(sp => T.isLethal(sp)).length; T.S.visits = { cliff: 1 }; const lethal1 = T.spotsAvail('cliff').filter(sp => T.isLethal(sp)).length;
  ok(lethal0 === 0 && lethal1 > 0, 'first visit hides lethal ' + lethal0 + '/' + lethal1);
  // 記得：換個做法不會死
  fresh(); prep(); T.S.month = 2; T.S.visits = {}; T.EXPLORE.forEach(p => T.S.visits[p] = 1); { let ppid = null; const sp = T.EXPLORE.map(p => { const x = T.spotsAvail(p).find(sp => T.isLethal(sp) && !sp.repeat && T.needOk(sp.need) && !sp.strain && T.placeOpen(p) === true); if (x && !ppid) ppid = p; return x; }).find(Boolean); const did = typeof sp.fx.death === 'string' ? sp.fx.death : sp.fx.death.id; T.S.remember = { [did]: 1 }; T.S.burden = 0; window.__deathRoll = () => 0.01; T.S.phase = 'day'; T.enterPlace(ppid); T.explore(sp.id, true); ok(!T.S.dead && T.S.explored[sp.id] && T.S.burden >= 2, 'remember alt ' + sp.id + ' burden ' + T.S.burden); }
  fresh(); T.S.remember = { cliff_jump: 1 }; T.die('cliff_jump'); ok(T.S.dead.again, 'second death remembered');
  // 找上門：生意一天最多一件
  let maxBiz = 0; for (let m = 1; m <= 3; m++) for (let d = 1; d <= 6; d++) { fresh(); T.S.month = m; T.S.day = d; T.S.dayCount = (m - 1) * 6 + d; maxBiz = Math.max(maxBiz, T.interruptsAvail().filter(x => !T.isStoryDeal(x)).length); }
  ok(maxBiz <= 1, 'business interrupts per day <= 1 (' + maxBiz + ')');
  { let autoN = 0, bad = 0; for (let m = 1; m <= 3; m++) for (let d = 1; d <= 6; d++) { fresh(); T.S.month = m; T.S.day = d; T.S.phase = 'day'; T.S.night = null; try { T.goNight(); autoN += (T.S.night && T.S.night.autoDeals || []).length; } catch (e) { bad++; err.push('autoBiz ' + e.message); } } ok(!bad, 'night auto business ok, handled ' + autoN); }
  // 日報：同一局不重複
  fresh(); { const seen = {}; let dup = 0; for (let i = 0; i < 40; i++) { T.S.day = (i % 6) + 1; T.S.month = 1 + Math.floor(i / 14); const ls = T.shopFlavor({ acc: 1, fakes: i % 3 === 0 ? 1 : 0, caught: 1 }, 'd'); for (const l of ls) { if (seen[l]) dup++; seen[l] = 1; } } ok(dup === 0, 'flavor no repeats over 40 days (' + Object.keys(seen).length + ' lines)'); }
  // 站著看、白進白出
  fresh(); T.S.burden = 3; T.S.slot = 0; T.S.phase = 'day'; T.enterPlace('ruin'); T.leavePlace(); ok(T.S.slot === 0 && T.S.phase === 'day', 'free leave when nothing done');
  T.enterPlace('ruin'); T.watchPlace(); ok(T.S.place.acted && T.S.burden === 2, 'watch: acted, burden -1'); T.leavePlace(); ok(T.S.slot === 1 && T.S.visits.ruin === 1, 'watch costs slot, counts as visit');
  // 把最重的留下
  fresh(); T.S.visits = { ruin: 1 }; T.S.slot = 0; T.S.phase = 'day'; window.__deathRoll = () => 0.99; T.enterPlace('ruin'); { const gsp = T.spotsAvail('ruin').find(sp => !sp.repeat && !T.isLethal(sp) && sp.fx && sp.fx.give && !sp.strain); if (gsp) { T.explore(gsp.id); T.S.burden += 3; T.S.place.burdenAdded = 4; const b = T.S.burden; const c = T.dropCands().length; T.dropHeavy(); ok(c && T.S.burden === b - 2 && T.S.leftBehind.ruin, 'drop heaviest ' + gsp.id + ' ' + JSON.stringify(T.S.leftBehind)); T.leavePlace(); T.enterPlace('ruin'); T.pickBack(); ok(!T.S.leftBehind.ruin, 'pick back'); } else ok(false, 'no give spot in ruin'); }
  // 寄放
  fresh(); give('huangdeng'); T.S.phase = 'day'; T.S.slot = 0; T.enterPlace('pawn'); const pl = T.S.lots.find(l => l.item === 'huangdeng'); T.deposit(pl.id); ok(!T.held('huangdeng') && JSON.parse(localStorage.getItem('fangshi-pawn-v1')).item === 'huangdeng', 'deposit to pawn');
  T.S = T.newGame(777); T.S.phase = 'morning'; ok(T.S.pendingDep && T.S.pendingDep.item === 'huangdeng' && !localStorage.getItem('fangshi-pawn-v1'), 'deposit picked up next run'); for (let d = 0; d < 2; d++) { T.S.phase = 'day'; T.goNight(); T.endDay(); } ok(T.held('huangdeng') === 1, 'deposit arrives day 3');
  // 遺物不是鑰匙：成對、引來、門檻
  fresh(); give('boliye'); give('xianbei'); T.S.cards = []; T.relicReactions(); ok(T.S.flags.pair_fern_shell && T.S.cards.some(c => c.title === '葉子鹹了'), 'pair reaction fern+shell');
  T.S.cards = []; T.relicReactions(); ok(!T.S.cards.length, 'pair once');
  fresh(); give('chanke'); T.S.dayCount = 1; T.S.cards = []; T.relicReactions(); T.S.dayCount = 3; T.relicReactions(); ok(T.S.flags.att_chanke, 'attract chanke after 2 days');
  fresh(); Object.keys(T.IT).filter(k => T.IT[k].cat === 'relic').slice(0, 30).forEach(k => T.S.codex[k] = true); T.S.cards = []; T.relicReactions(); T.relicReactions(); ok(T.S.flags.rth_15 && T.S.flags.rth_30, 'thresholds 15/30');
  // 林老師研究：沒變就不說加強
  for (const id of ['naiya', 'tuoxie']) { fresh(); T.S.flags['studied_' + id] = true; const e = T.scaleEff(id, T.IT[id].eff); ok(!e.studied && e.studiedSame, 'studied honest ' + id); }
  for (const id of ['banpai', 'xiangpi']) { fresh(); T.S.flags['studied_' + id] = true; const e = T.scaleEff(id, T.IT[id].eff); ok(e.studied, 'studied stronger ' + id + ' ' + JSON.stringify(e.use.fx || {}) + ' ' + (e.use.eraseMin || '')); }
  // 逃過一劫：條件是遺物或夥計時，靠運氣活下來不能提那件東西
  fresh(); window.__deathRoll = () => 0.9; { const n = T.applyFx({ death: { id: 'frost_window', chance: 0.75, unless: { staff: 'ahua' }, saved: '阿花嬸來敲門' } }); ok(!T.S.dead && !n.join('').includes('阿花嬸'), 'luck survive no staff text ' + n.join('/')); }
  // QA 中-1：帶別的保護遺物，不會再冒出乳牙那段
  fresh(); give('jinianc'); window.__deathRoll = () => 0.5; { const sp = T.spotList('school').find(x => x.id === 'sc_answer'); const n = T.applyFx(sp.fx); ok(!T.S.dead ? !n.join('').includes('乳牙') : true, 'jinianc no naiya text: ' + n.join('/').slice(0, 60)); }
  // QA 中-2：回程有危險、帶警示遺物，要按兩次
  fresh(); give('boliye'); T.S.flags.ascent_grace = true; T.S.slot = 0; T.S.phase = 'day'; T.enterPlace('ruin'); T.S.place.steps = 1; T.S.burden = T.burdenLimit() + 3; window.__deathRoll = () => 0.99;
  { const el = { dataset: {} }; T.onAct('leave', el); ok(T.S.phase === 'place' && T.S.slot === 0, 'leave needs second tap with warn relic'); T.onAct('leave', el); ok(T.S.phase !== 'place', 'second tap climbs'); }
  // 籤詩：隔天當鋪價錢浮動
  fresh(); give('qianshi'); T.S.flags.tea_story_heard = 1; T.S.dayCount = 1; T.S.cards = []; T.relicReactions(); T.S.dayCount = 4; T.relicReactions(); ok(T.S.flags.att_qianshi && T.S.pawnShiftNext === 5, 'qianshi attract sets pawn shift');
  T.S.phase = 'day'; T.goNight(); T.endDay(); ok(T.pawnOpenToday() ? T.pawnMult() < 1 : (T.pawnMult() === 1 && T.S.pawnShiftNext != null), 'pawn shift waits for pawn open day (day ' + T.S.day + ', ' + T.redeemCost() + ')'); T.S.phase = 'day'; T.S.night = null; T.goNight(); ok(!!T.S.night.pawnLine === T.pawnOpenToday(), 'pawn line only on the day it applies');
  // 第四十五件：沒見過空號鉛筆就用不提鉛筆的版本
  fresh(); delete T.S.codex.qianbi; Object.keys(T.IT).filter(k => T.IT[k].cat === 'relic' && k !== 'qianbi').forEach(k => T.S.codex[k] = true); T.S.flags.rth_15 = T.S.flags.rth_30 = 1; T.S.cards = []; T.relicReactions(); ok(T.S.cards.some(c => c.text.includes('像在等誰應')), 'rth_45 fallback without qianbi');
  // 用過之後：五件可用遺物的後續
  for (const [rid, eid, setup] of [['chachou', 'fu_chachou', () => { const ik = Object.keys(T.IN).find(k => T.IN[k].kind === 'heard'); T.S.intel[ik] = { day: 1, m: 1, src: 'x' }; T.S.place = null; }], ['banbei', 'fu_banbei', () => { T.S.burden = 5; T.S.place = null; }], ['quepiao', 'fu_quepiao', () => { T.S.slot = 0; T.S.phase = 'day'; T.enterPlace('ruin'); T.S.place.steps = 1; T.S.burden = 30; }], ['banpai', 'fu_banpai', () => { T.S.slot = 0; T.S.phase = 'day'; T.enterPlace('ruin'); T.S.place.steps = 3; T.S.place.acted = true; }], ['xiangpi', 'fu_xiangpi', () => { T.S.burden = 6; T.S.place = null; }]]) {
    const e = T.ALLEV[eid]; if (!e) { ok(false, 'no followup ' + eid); continue; }
    for (let i = 0; i < e.choices.length; i++) {
      fresh(); T.S.month = 2; T.S.dayCount = 3; give(rid); setup(); const used = T.useRelic(rid); const before = T.needOk(e.need);
      T.S.dayCount = 6; if (!T.held(rid) && e.need.has) give(rid);
      const okNeed = T.needOk(e.need); T.S.phase = 'morning'; T.S.place = null;
      const opts = e.choices.filter(c => T.needOk(c.need || {})); T.S.cards = [{ title: e.title, text: e.text, drift: eid, choices: opts.map(x => ({ label: x.label })) }]; window.__deathRoll = () => 0.99; T.driftChoose(0, i);
      ok(used && !before && okNeed && !T.S.dead && T.S.cards[0].picked != null, 'followup ' + eid + '#' + i + ' ' + (T.S.cards[0].notes || []).join('/'));
    }
  }
  { localStorage.removeItem('fangshi-echo-v1'); fresh(); T.applyFx({ echo: '測試回響' }); T.S = T.newGame(31337); ok(T.S.cards.some(c => c.text === '測試回響') && !(JSON.parse(localStorage.getItem('fangshi-echo-v1')) || []).length, 'echo shows next run once'); }
  // 流水帳：不抽遺物、{who} 只取逗號前、沒夥計不出夥計句
  fresh(); T.S.shop.staff = []; { let bad = 0, staffLine = 0, comma = 0; T.S.usedFl = {}; for (let i = 0; i < 60; i++) { T.S.usedFl = {}; T.S.day = (i % 6) + 1; T.S.month = 1 + (i % 3); const ls = T.shopFlavor({ acc: 1, caught: 1 }, 'x' + i); for (const l of ls) { { const rk = Object.keys(T.IT).find(k => T.IT[k].cat === 'relic' && l.replace(/戴舊安全帽/g, '').includes(T.IT[k].name)); if (rk) { bad++; out.push('  relic? ' + rk + ' ' + T.IT[rk].name + ' | ' + l); } } if (l.includes('夥計')) staffLine++; } } ok(!bad && !staffLine, 'flavor: no relic goods (' + bad + '), no staff lines without staff (' + staffLine + ')'); }
  // 跳過日子：沒夥計只用 gapSolo，同一句不連著出現
  fresh(); T.S.shop.staff = []; { const SHF = T.SH.flavor; const t1 = T.gapYield().text; ok(SHF.gapSolo.some(x => t1.startsWith(x)), 'gap solo line'); T.S.month = 2; const t2 = T.gapYield().text; ok(t1.slice(0, 10) !== t2.slice(0, 10), 'gap no repeat'); }
  // 中-1／低-4：籤詩的當鋪價錢落在下一次開門那天，固定便宜一成
  { fresh(); const base = T.redeemCost(); T.S.pawnShiftNext = 5; let hit = null, off = 0;
    for (let d = 5; d <= 14 && !hit; d++) { T.S.dayCount = d; T.S.month = 1 + Math.floor((d - 1) / 6); T.S.day = ((d - 1) % 6) + 1; T.beginDay(); if (T.pawnMult() !== 1) { if (T.pawnOpenToday()) { T.S.phase = 'day'; T.S.night = null; T.goNight(); hit = { d, cost: T.redeemCost(), m: T.S.pawnShift.m, line: !!T.S.night.pawnLine }; } else off++; } }
    ok(hit && hit.d === 7 && hit.line && hit.m === -0.1 && hit.cost === Math.round(base * 0.9) && !off, 'qianshi pawn shift on next pawn open day, 10% cheaper ' + JSON.stringify(hit) + ' base ' + base); }
  // 圖示第二輪：三件遺物不再用通用圖示；全部遺物都有自己的圖示
  ok(['baihua', 'qianbi', 'xiangpi'].every(k => T.iconKey(k) === k), 'round2 icons baihua/qianbi/xiangpi');
  { const gen = Object.keys(T.IT).filter(k => T.IT[k].cat === 'relic' && T.iconKey(k) === '_relic'); ok(!gen.length, 'no relic falls back to _relic ' + gen.join(',')); }
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
