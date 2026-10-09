// 甩手掌櫃版自動模擬：在瀏覽器裡跑（python3 tools/harness.py sim）。
// 風格：careful 謹慎、lamp 追故事（守燈）、ledger 追帳、explorer 探索、greedy 貪心、reckless 莽撞、random 亂按
(() => {
  const T = window.__fs, D = T.D;
  const N = window.__N || 60, REWIND = window.__REWIND || 0;
  const errors = [];
  const M = () => T.S.month || 1;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const BASE = { careful: 'wise', lamp: 'wise', ledger: 'wise', explorer: 'wise', greedy: 'mid', reckless: 'random', random: 'random' };
  function decideFor(style, S) {
    const e = S.enc, opts = T.encOptions().filter(o => !o.disabled), d = T.DEALS[e.deal];
    const has = k => opts.some(o => o.key === k);
    if (!opts.length) return 'decline';
    const policy = BASE[style];
    if (/^m309/.test(e.deal)) {
      if (style === 'lamp') return ['special', 'special2', 'deal'].find(has);
      if (style === 'ledger' || style === 'careful') return ['special2', 'special', 'deal'].find(has);
      if (policy === 'random') return pick(opts).key;
      if (style === 'greedy') return ['deal', 'decline'].find(has) || opts[0].key;
      return ['special2', 'deal'].find(has) || opts[0].key;
    }
    if (e.deal === 'm307' && style === 'lamp') return 'decline';
    if (style === 'lamp' || style === 'explorer') { if (has('special')) return 'special'; if (e.deal === 'm305' && has('deal')) return 'deal'; }
    if (policy === 'random') return pick(opts).key;
    if (policy === 'mid' && !d.neutral && has('deal') && Math.random() < 0.4) return 'deal';
    if (d.neutral) { if (has('special')) return 'special'; return has('deal') && d.side === 'buy' ? 'deal' : has('decline') ? 'decline' : opts[0].key; }
    for (const k of ['special', ...(d.verdict || [])]) if (has(k) && (k !== 'special' || (d.verdict || []).includes('special'))) return k;
    return has('decline') ? 'decline' : opts[0].key;
  }
  const deadly = fx => fx && fx.death && !(fx.death.unless && T.needOk(fx.death.unless));
  function driftPick(style, c) {
    const e = T.ALLEV[c.drift]; const ch = (e && (e.choices || []).filter(x => T.needOk(x.need || {}))) || [];
    if (!ch.length) return 0;
    if (style === 'reckless' || style === 'random') return Math.floor(Math.random() * c.choices.length);
    const safe = c.choices.map((x, i) => i).filter(i => !deadly((ch[i] || {}).fx));
    if (style === 'greedy') return Math.random() < 0.3 ? Math.floor(Math.random() * c.choices.length) : pick(safe.length ? safe : [0]);
    return safe.length ? safe[safe.length > 1 && style === 'explorer' ? 1 : 0] : 0;
  }
  const HIRE = { careful: ['xiaoye', 'ayue', 'caijie', 'chunjiao', 'wenbo', 'ahua'], lamp: ['ayue', 'xiaohe', 'xiaoye', 'caijie', 'laofu', 'momo'], ledger: ['caijie', 'amai', 'xiaoye', 'ayue', 'ahua'], explorer: ['laofu', 'tishu', 'ayue', 'amei', 'xiaoye', 'heigou'], greedy: ['akai', 'aque', 'heigou', 'ayue', 'shuqi', 'amei', 'xiaoye'], reckless: ['akai', 'heigou', 'amei'], random: [] };
  const UPGS = ['sign', 'shelf', 'teadesk', 'irongate', 'lamp', 'coldbox', 'quiet', 'backyard', 'cart', 'annex'];
  const GEAR = { explorer: ['stick', 'rope', 'headlamp', 'oxygen', 'harness', 'bag', 'charm', 'coat'], careful: ['rope', 'headlamp', 'stick', 'oxygen', 'charm'], lamp: ['rope', 'stick', 'headlamp', 'coat'], ledger: ['rope'], greedy: ['bag', 'stick', 'oxygen'], reckless: ['bag'], random: [] };
  function manage(style) {
    const S = T.S, P = S.shop.pol;
    if (S.dayCount === 0) {
      if (style === 'greedy') { P.price = 'high'; P.buy = 'generous'; P.cats.shady = true; P.sign = '張揚'; P.cult = 'half'; }
      if (style === 'reckless') { P.buy = 'generous'; P.cats.shady = Math.random() < 0.6; P.cult = 'full'; P.sign = pick(['低調', '張揚']); }
      if (style === 'careful' || style === 'ledger') { P.buy = 'strict'; P.cult = 'half'; }
      if (style === 'explorer' || style === 'lamp') { P.cult = 'full'; }
      if (style === 'random') { P.buy = pick(['strict', 'normal', 'generous']); P.price = pick(['low', 'normal', 'high']); P.cult = pick(['none', 'half', 'full']); P.cats.shady = Math.random() < 0.4; }
    }
    const reserve = M() === 2 && !S.dues ? 120 : 40;
    const hires = style === 'random' ? Object.keys(T.SH.staff).filter(k => !T.SH.staff[k].bonusOnly).sort(() => Math.random() - 0.5) : HIRE[style];
    for (const id of hires) { const s = T.SH.staff[id]; if (s && !S.shop.staff.includes(id) && T.needOk(s.need) && !S.flags['hired_' + id] && S.stones - s.hire > reserve && S.shop.staff.length < T.shopStats().slots) T.hireStaff(id); }
    for (const id of GEAR[style] || []) { const g = T.SH.gear[id]; if (g && !(S.shop.gear || {})[id] && S.stones - g.cost > reserve) T.buyGear(id); }
    for (const id of UPGS) { const u = T.SH.upgrades[id]; if (u && !S.shop.upg[id] && S.stones - u.cost > reserve + 20) T.buyUpg(id); }
  }
  function doInterrupts(style) {
    for (let k = 0; k < 8; k++) {
      const list = T.interruptsAvail(); if (!list.length) return;
      const d = list[0]; T.openInterrupt(d.id);
      const S = T.S; if (S.dead) return;
      if (S.enc && !S.enc.done) T.decide(decideFor(style, S));
      if (S.enc && !S.enc.done) T.decide('decline');
      if (S.enc && !S.enc.done) { errors.push('stuck ' + d.id + ' ' + T.encOptions().map(o => o.key)); S.enc = null; S.phase = 'day'; continue; }
      if (T.S.dead) return; T.closeEnc();
    }
  }
  function spotPick(style, id) {
    const S = T.S, L = T.burdenLimit();
    const av = T.spotsAvail(id).filter(sp => T.needOk(sp.need) && (!sp.cost || S.stones >= sp.cost + 20));
    const ok = av.filter(sp => {
      const b = T.spotBurden(id, sp);
      if (style === 'random') return true;
      if (style === 'reckless') return !deadly(sp.fx) || sp.fx.death.chance != null || Math.random() < 0.25;
      if (style === 'greedy') return S.burden + b <= L + (Math.random() < 0.3 ? 1 : 0) && (!deadly(sp.fx) || (sp.fx.death.chance != null && Math.random() < 0.5));
      if (deadly(sp.fx) && !(style === 'explorer' && (sp.fx.death.chance || 1) < 0.3 && Math.random() < 0.3)) return false;
      return S.burden + b <= L;
    });
    if (!ok.length) return null;
    return ok.find(x => !x.repeat && (style === 'reckless' || style === 'random' || style === 'explorer' || style === 'lamp' ? true : !x.strain)) || ok.find(x => !x.repeat) || ok[0];
  }
  function goExplore(style) {
    const S = T.S, L = T.burdenLimit();
    const order = [...T.EXPLORE].filter(id => T.D.places[id] && T.placeOpen(id) === true && (!T.D.places[id].reveal || [].concat(T.D.places[id].reveal).some(f => S.flags[f])));
    const deep = style === 'careful' || style === 'ledger' ? order : [...order].reverse();
    const cand = deep.filter(id => T.spotsAvail(id).some(sp => !sp.repeat && T.needOk(sp.need) && (!deadly(sp.fx) || style === 'reckless' || style === 'random' || style === 'greedy')) || (style === 'greedy' && T.spotsAvail(id).length));
    const fit = cand.filter(id => style === 'reckless' || style === 'random' || S.burden + ((T.PFX[id] || {}).burden || 0) <= L);
    const nNew = id => T.spotsAvail(id).filter(sp => !sp.repeat && T.needOk(sp.need) && !deadly(sp.fx)).length;
    const id = fit[0]; if (!id) return false;
    T.enterPlace(id);
    for (let k = 0; k < 4 && T.S.place && !T.S.place.acted && !T.S.dead; k++) { const rem = style !== 'reckless' && style !== 'random' && T.spotsAvail(id).find(sp => !sp.repeat && T.isLethal(sp) && sp.fx.death && (S.remember || {})[typeof sp.fx.death === 'string' ? sp.fx.death : sp.fx.death.id] && T.needOk(sp.need) && S.burden + 2 <= L); if (rem) { T.explore(rem.id, true); continue; } const sp = spotPick(style, id); if (!sp) break; T.explore(sp.id); }
    if (T.S.dead) return true;
    if (T.S.phase === 'place' && T.S.place.steps && T.ascentRisk() > 0 && style !== 'reckless' && style !== 'random' && T.dropCands().length) T.dropHeavy();
    if (T.S.phase === 'place') { if (!T.S.place.steps) T.watchPlace(); T.leavePlace(); }
    return true;
  }
  function town(style) {
    const S = T.S;
    if (T.relicLots().length && T.relicLots().some(l => !S.flags['studied_' + l.item] || style === 'greedy') && T.placeOpen('school') === true && style !== 'reckless') {
      T.enterPlace('school');
      for (const l of [...T.relicLots()]) { if (!S.flags['studied_' + l.item]) T.linAct('study', l.id); else if (style === 'greedy') T.linAct('sell', l.id); }
      if (T.S.phase === 'place') { T.S.place.did = true; T.leavePlace(); } return true;
    }
    if ((style === 'ledger' || style === 'careful') && T.accuseList().length && T.placeOpen('office') === true) {
      T.enterPlace('office'); for (const a of T.accuseList()) if (['a_daoren', 'a_scar', 'a_xiangke'].includes(a.id) || style === 'ledger') T.accuse(a.id);
      if (T.held('xuechan')) T.turnIn('xuechan', 'entrust');
      if (T.S.phase === 'place') { T.S.place.did = true; T.leavePlace(); } return true;
    }
    // 聚落裡的怪事（第一批外稿）：追故事、探索、謹慎的人會順路看
    if (style !== 'reckless' && style !== 'greedy') for (const id of ['school', 'tea', 'office', 'homes']) {
      if (T.placeOpen(id) !== true || !T.spotsAvail(id).some(sp => !sp.repeat && T.needOk(sp.need) && !deadly(sp.fx))) continue;
      if (style !== 'lamp' && style !== 'explorer' && Math.random() < 0.5) continue;
      T.enterPlace(id);
      for (let k = 0; k < 3 && T.S.place && !T.S.place.acted && !T.S.dead; k++) { const sp = spotPick(style, id); if (!sp) break; T.explore(sp.id); }
      if (T.S.phase === 'place') { T.S.place.did = true; T.leavePlace(); } return true;
    }
    if (style === 'random' && Math.random() < 0.4) for (const id of ['school', 'tea', 'office', 'homes']) {
      if (T.placeOpen(id) !== true || !T.spotsAvail(id).length) continue;
      T.enterPlace(id); for (let k = 0; k < 3 && T.S.place && !T.S.place.acted && !T.S.dead; k++) { const sp = spotPick(style, id); if (!sp) break; T.explore(sp.id); }
      if (T.S.phase === 'place') { T.S.place.did = true; T.leavePlace(); } return true;
    }
    if (M() === 3 && S.stones > 400 && T.placeOpen('pawn') === true && style !== 'reckless' && !S.redeemedSim) { S.redeemedSim = 1; T.enterPlace('pawn'); T.redeem(); if (T.S.phase === 'place') { T.S.place.did = true; T.leavePlace(); } return true; }
    return false;
  }
  function slotAct(style) {
    const S = T.S;
    if ((style === 'explorer' || style === 'lamp') && S.slot > 0 && ['stair', 'lampst', 'platform'].some(id => T.D.places[id] && S.level >= (T.D.places[id].minLevel || 0) && T.spotsAvail(id).some(sp => !sp.repeat && T.needOk(sp.need)) && (!T.D.places[id].reveal || [].concat(T.D.places[id].reveal).some(f => S.flags[f])))) { if (!town(style)) T.goNight(); return; }
    const exploreFirst = style === 'explorer' || style === 'reckless' || style === 'greedy' || (style === 'lamp' && S.slot !== 1) || (style === 'random' && Math.random() < 0.6) || ((style === 'careful' || style === 'ledger') && S.slot === 0);
    if (exploreFirst ? (goExplore(style) || town(style)) : (town(style) || goExplore(style))) return;
    T.goNight();
  }
  function snap(S) { return { rlog: (S.relicLog || []).length, rsave: (S.relicLog || []).filter(x => x.k === 'save').length, rnight: (S.relicLog || []).filter(x => x.k === 'night').length, watched: S.watched || 0, dropped: S.dropped || 0, alt: S.altUsed || 0, carry: (S.carry || []).length, b1: ['sc_roll_seen', 'tea_seat_seen', 'office_overtime', 'homes_house', 'stair_echo', 'lab_plate', 'lamp_kid', 'lab_barefoot', 'pf_reverse', 'branch_sign', 'saw_shell'].filter(f => S.flags[f]).length, b1done: ['lamp_kid', 'lab_barefoot', 'pf_reverse'].filter(f => S.flags[f]).length, b1f: ['sc_roll_seen', 'tea_seat_seen', 'office_overtime', 'homes_house', 'stair_echo', 'lab_plate', 'stop_card', 'lamp_kid', 'lab_barefoot', 'pf_reverse', 'branch_sign', 'lampst_branch', 'saw_shell'].filter(f => S.flags[f]), day: S.dayCount, stones: Math.round(S.stones), lv: S.level, shop: S.shop.total, best: S.shop.best, staff: S.shop.staff.length, upg: Object.keys(S.shop.upg).length, spots: Object.keys(S.explored).length, relics: Object.keys(S.codex).filter(k => T.IT[k].cat === 'relic').length, fin: ['lamp', 'ledger', 'pawn'].find(k => S.flags['finale_' + k]) || '-', deepest: ['platform', 'lampst', 'stair', 'north', 'cliff', 'reservoir', 'tunnel', 'ruin'].find(id => T.spotList(id).some(sp => S.explored[sp.id])) || '-' }; }
  function play(seed, style) {
    T.S = T.newGame(seed, window.__BONUS || []);
    let guard = 0, rewinds = 0, actions = 0;
    while (guard++ < 600) {
      const S = T.S;
      if (S.dead) {
        if (rewinds < REWIND && T.ckptRestore(Math.random() < 0.5 ? 'today' : 'prev')) { rewinds++; continue; }
        return { ...snap(S), dead: S.dead.id, deadM: S.dead.m, rewinds, actions };
      }
      if (S.phase === 'end') return { ...snap(S), dead: null, rewinds, actions };
      if (S.phase === 'morning') { S.cards.forEach((c, ci) => { if (c.choices) { T.driftChoose(ci, driftPick(style, c)); actions++; } }); if (T.S.dead) continue; manage(style); T.openShop(); actions++; doInterrupts(style); continue; }
      if (S.phase === 'day') { if (S.slot >= 3) { T.goNight(); continue; } doInterrupts(style); if (T.S.dead || T.S.phase !== 'day') continue; slotAct(style); actions += 3; continue; }
      if (S.phase === 'enc') { if (!S.enc.done) T.decide(decideFor(style, S)); if (S.enc && !S.enc.done) T.decide('decline'); if (T.S.enc) T.closeEnc(); continue; }
      if (S.phase === 'place') { T.leavePlace(); continue; }
      if (S.phase === 'night') { T.endDay(); actions++; continue; }
      errors.push('stuck phase ' + S.phase); break;
    }
    errors.push('guard ' + style); return { ...snap(T.S), dead: 'guard' };
  }
  const out = {}, deathsAll = {};
  for (const style of (window.__POL || ['careful', 'lamp', 'ledger', 'explorer', 'greedy', 'reckless', 'random'])) {
    const rs = [];
    for (let i = 0; i < N; i++) { try { rs.push(play(1000 + i * 7, style)); } catch (e) { errors.push(style + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')); } }
    const n = rs.length || 1, avg = k => Math.round(rs.reduce((a, x) => a + (x[k] || 0), 0) / n * 10) / 10, pct = f => Math.round(rs.filter(f).length / n * 100) + '%';
    const dd = {}; rs.filter(x => x.dead).forEach(x => { dd[x.dead] = (dd[x.dead] || 0) + 1; deathsAll[x.dead] = (deathsAll[x.dead] || 0) + 1; });
    const deep = {}; rs.forEach(x => { deep[x.deepest] = (deep[x.deepest] || 0) + 1; }); const b1f = {}; rs.forEach(x => (x.b1f || []).forEach(f => { b1f[f] = (b1f[f] || 0) + 1; }));
    out[style] = { n: rs.length, rlog: avg('rlog'), rsave: avg('rsave'), rnight: avg('rnight'), watched: avg('watched'), dropped: avg('dropped'), alt: avg('alt'), carry: avg('carry'), b1: avg('b1'), b1done: avg('b1done'), b1f, died: pct(x => x.dead), finale: ['lamp', 'ledger', 'pawn'].map(k => k + ':' + pct(x => !x.dead && x.fin === k)).join(' '), days: avg('day'), stones: avg('stones'), lv: avg('lv'), shopTotal: avg('shop'), best: avg('best'), staff: avg('staff'), upg: avg('upg'), spots: avg('spots'), relics: avg('relics'), actions: avg('actions'), rewinds: avg('rewinds'), deaths: dd, deepest: deep };
  }
  out.deathIdsSeen = Object.keys(deathsAll).length;
  out.errors = [...new Set(errors)].slice(0, 20);
  return out;
})()
