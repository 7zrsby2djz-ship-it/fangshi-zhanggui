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
