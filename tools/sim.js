(() => {
  const T = window.__fs;
  const D = T.D;
  // itineraries: per month, per day, three slots. 'shop' or a place id.
  const ROUTES = {
    1: { 1: ['herb', 'shop', 'shop'], 2: ['shop', 'shop', 'shop'], 3: ['market', 'office', 'shop'], 4: ['shop', 'shop', 'shop'], 5: ['shop', 'market', 'tea'], 6: ['shop', 'shop', 'huichun'] },
    2: { 1: ['herb', 'shop', 'shop'], 2: ['shop', 'shop', 'tea'], 3: ['shop', 'office', 'shop'], 4: ['market', 'office', 'shop'], 5: ['shop', 'shop', 'tea'], 6: ['shop', 'shop', 'shop'] }
  };
  const errors = [];
  const M = () => T.S.month || 1;
  function decideFor(policy, S) {
    const e = S.enc, opts = T.encOptions().filter(o => !o.disabled);
    if (e.generic) return opts.find(o => o.key === 'sell') ? 'sell' : 'decline';
    const d = T.DEALS[e.deal];
    if (e.deal === 'd18') return opts.some(o => o.key === 'goods') ? 'goods' : 'pay';
    const has = k => opts.some(o => o.key === k);
    if (policy === 'naive') return has('deal') ? 'deal' : opts[0].key;
    if (policy === 'cautious') return has('decline') ? 'decline' : opts[opts.length - 1].key;
    if (policy === 'random') return opts[Math.floor(Math.random() * opts.length)].key;
    if (policy === 'mid' && !d.neutral && has('deal') && Math.random() < 0.35) return 'deal';
    if (d.neutral) return has('deal') && d.side === 'buy' ? 'deal' : has('decline') ? 'decline' : opts[0].key;
    for (const k of ['special', ...(d.verdict || [])]) if (has(k) && (k !== 'special' || (d.verdict || []).includes('special'))) return k;
    return has('decline') ? 'decline' : opts[0].key;
  }
  function talk(policy) {
    if (policy === 'naive' || policy === 'cautious') return;
    if (policy === 'mid' && Math.random() < 0.5) return;
    for (const a of ['ask', 'press', 'press', 'silence', 'appraise']) if (T.canAct(a)) ({ ask: T.actAsk, press: T.actPress, silence: T.actSilence, appraise: T.actAppraise })[a]();
    if (policy === 'wise' && T.canAct('haggle') && T.DEALS[T.S.enc.deal].side === 'sell') T.actHaggle();
  }
  function runDeal(policy, id, where) { T.startDeal(id, where); talk(policy); T.decide(decideFor(policy, T.S)); if (!T.S.enc.done) T.decide('decline'); T.closeEnc(); }
  function placeActs(policy, S) {
    const id = S.place.id;
    if (id === 'herb' || id === 'tea') for (const d of D.deals.filter(d => d.where === id && T.dealAvail(d))) runDeal(policy, d.id, id);
    if (id === 'market') {
      for (const s of T.stallsToday()) { const d = s.deals || s.deal ? T.stallDeal(s) : null; if (d && T.dealAvail(d)) runDeal(policy, d.id, 'market'); }
      if (policy === 'wise') for (const l of [...T.S.lots]) if (['langya', 'lingsui', 'duandao', 'luopan'].includes(l.item) && l.q > 0.5 && !l.flags.includes('contraband')) T.sellToSmith(l.id);
    }
    if (id === 'office') {
      if (policy === 'wise') { if (T.held('xuechan')) T.turnIn('xuechan', 'entrust'); if (T.S.lots.some(l => l.flags.includes('sting'))) T.turnIn('sting'); }
      if (policy !== 'cautious') for (const a of T.accuseList()) if (policy !== 'wise' || ['a_daoren', 'a_scar', 'a_xiangke'].includes(a.id)) T.accuse(a.id);
    }
    if (id === 'tea' && policy !== 'cautious') {
      const ids = Object.keys(T.S.intel).filter(i => T.IN[i]).filter(i => policy !== 'wise' || (T.IN[i].truth !== false && !T.IN[i].leak)).sort((a, b) => T.intelOffer(b).price - T.intelOffer(a).price);
      for (const i of ids.slice(0, 2)) if (T.intelOffer(i).price) T.sellAtTea(i);
    }
    if (id === 'huichun' && policy !== 'cautious') for (const l of [...T.S.lots]) { if (T.S.lots.includes(l) && ['chiyan', 'liaoshang', 'lingsui'].includes(l.item)) T.sellToHuichun(l.id); }
  }
  function snap() { const S = T.S; return { stones: Math.round(S.stones), nw: Math.round(T.netWorth(true)), lv: S.level, debt: S.debt, fooled: S.stats.fooled, wronged: S.stats.wronged, saw: S.stats.saw, grade: T.gradeOf(), score: T.scoreTotal(), heat: S.heat, sold: Object.keys(S.isold).length }; }
  function play(seed, policy) {
    T.S = T.newGame(seed);
    let guard = 0; const res = {};
    while (guard++ < 900) {
      const S = T.S;
      if (S.phase === 'end') { res[M()] = snap(); if (M() < 2) { T.nextMonth(); continue; } break; }
      if (S.phase === 'morning') { T.openShop(); continue; }
      if (S.phase === 'day') {
        if (S.slot >= 3) { S.phase = 'night'; continue; }
        const where = ROUTES[M()][S.day][S.slot];
        const P = D.places[where];
        const open = where !== 'shop' && P && P.hours.includes(S.slot) && !(Array.isArray(P.closed) ? (M() === 1 ? P.closed : []) : ((P.closed || {})[M()] || [])).includes(S.day);
        if (where === 'shop' || !open) { T.onAct('shop', { dataset: {} }); }
        else { T.enterPlace(where); placeActs(policy, S); if (T.S.phase === 'place') T.leavePlace(); }
        continue;
      }
      if (S.phase === 'enc') {
        if (!S.enc.done) { if (!S.enc.generic) talk(policy); T.decide(decideFor(policy, S)); }
        if (!S.enc.done) T.decide('decline');
        if (!S.enc.done && S.enc.deal === 'd18') { T.decide('goods'); if (!S.enc.done) T.decide('pay'); }
        if (!S.enc.done) { errors.push('stuck enc ' + S.enc.deal + ' ' + T.encOptions().map(o => o.key).join(',')); S.enc.done = { key: 'x' }; }
        T.closeEnc(); continue;
      }
      if (S.phase === 'place') { T.leavePlace(); continue; }
      if (S.phase === 'night') {
        const reserve = S.day >= 6 ? (M() === 1 ? (window.__R6 ?? 40) : 0) : (window.__R ?? 90);
        const inv = Math.max(0, Math.min(30, Math.floor(S.stones - reserve)));
        T.meditate(policy === 'cautious' ? Math.min(inv, 10) : inv, T.held('dingshen') > 0 && policy === 'wise', T.held('yangqi') > 0);
        T.endDay(); continue;
      }
      errors.push('stuck phase ' + S.phase); break;
    }
    return res;
  }
  const out = {};
  for (const policy of (window.__POL || ['wise', 'mid', 'naive', 'cautious', 'random'])) {
    const rs = [];
    for (let i = 0; i < 120; i++) { try { rs.push(play(1000 + i * 7, policy)); } catch (e) { errors.push(policy + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } }
    for (const m of [1, 2]) {
      const r = rs.map(x => x[m]).filter(Boolean);
      const avg = k => Math.round(r.reduce((a, x) => a + x[k], 0) / Math.max(1, r.length) * 10) / 10;
      const pct = f => Math.round(r.filter(f).length / Math.max(1, r.length) * 100) + '%';
      out[policy + ' m' + m] = { n: r.length, stones: avg('stones'), nw: avg('nw'), lv: avg('lv'), debt: pct(x => x.debt > 0), top: pct(x => x.grade === '上'), low: pct(x => x.grade === '下'), saw: avg('saw'), fooled: avg('fooled'), wronged: avg('wronged'), score: avg('score'), heat: avg('heat'), sold: avg('sold') };
    }
  }
  out.errors = [...new Set(errors)].slice(0, 15);
  return out;
})()
