(() => {
  const T = window.__fs;
  const D = T.D;
  // itineraries: per day, three slots. 'shop' or a place id.
  const ROUTE = {
    1: ['herb', 'shop', 'shop'], 2: ['shop', 'shop', 'shop'], 3: ['market', 'office', 'shop'],
    4: ['shop', 'shop', 'shop'], 5: ['shop', 'market', 'tea'], 6: ['shop', 'shop', 'huichun']
  };
  const errors = [];
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
    // wise: oracle that knows the verdicts
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
  function placeActs(policy, S) {
    const id = S.place.id;
    if (id === 'herb') { const dd = T.DEALS.d05; if (!S.done.d05 && S.day <= 2) { T.startDeal('d05', 'herb'); talk(policy); T.decide(decideFor(policy, T.S)); T.closeEnc(); } }
    if (id === 'market') {
      for (const s of D.places.market.stalls) {
        if (S.day < s.days[0] || S.day > s.days[1] || !s.deal) continue;
        const d = T.DEALS[s.deal]; if (T.S.done[s.deal]) continue;
        if (d.need && !(d.need.has ? Object.entries(d.need.has).every(([k, v]) => T.held(k) >= v) : true)) continue;
        T.startDeal(s.deal, 'market'); talk(policy); T.decide(decideFor(policy, T.S)); T.closeEnc();
      }
      if (policy === 'wise') for (const l of [...T.S.lots]) if (['langya', 'lingsui', 'duandao'].includes(l.item)) T.sellToSmith(l.id);
    }
    if (id === 'office' && policy === 'wise') { if (T.held('xuechan')) T.turnIn('xuechan', 'entrust'); if (T.S.lots.some(l => l.flags.includes('sting'))) T.turnIn('sting'); }
    if (id === 'tea') { if (!T.S.done.d20 && S.day >= 5) { T.startDeal('d20', 'tea'); T.decide(policy === 'naive' && T.encOptions().some(o => o.key === 'sellhot') ? 'sellhot' : 'decline'); T.closeEnc(); } }
    if (id === 'huichun' && policy !== 'cautious') for (const l of [...T.S.lots]) { const o = T.S.lots.includes(l); if (o && ['chiyan', 'liaoshang', 'lingsui'].includes(l.item)) T.sellToHuichun(l.id); }
  }
  function play(seed, policy) {
    T.S = T.newGame(seed);
    let guard = 0;
    while (T.S.phase !== 'end' && guard++ < 400) {
      const S = T.S;
      if (S.phase === 'morning') { T.openShop(); continue; }
      if (S.phase === 'day') {
        if (S.slot >= 3) { S.phase = 'night'; continue; }
        const where = ROUTE[S.day][S.slot];
        const open = where !== 'shop' && D.places[where] && D.places[where].hours.includes(S.slot) && !(D.places[where].closed || []).includes(S.day);
        if (where === 'shop' || !open) { T.onAct('shop', { dataset: {} }); }
        else { T.enterPlace(where); placeActs(policy, S); if (T.S.phase === 'place') T.leavePlace(); }
        continue;
      }
      if (S.phase === 'enc') {
        if (!S.enc.done) { if (!S.enc.generic) talk(policy); T.decide(decideFor(policy, S)); }
        if (!S.enc.done) T.decide('decline');
        if (!S.enc.done && S.enc.deal === 'd18') { T.decide('goods'); if (!S.enc.done) T.decide('pay'); }
        T.closeEnc(); continue;
      }
      if (S.phase === 'place') { T.leavePlace(); continue; }
      if (S.phase === 'night') {
        const reserve = S.day >= 6 ? 0 : 90;
        const inv = Math.max(0, Math.min(30, Math.floor(S.stones - reserve)));
        T.meditate(policy === 'cautious' ? Math.min(inv, 10) : inv, T.held('dingshen') > 0 && policy === 'wise', T.held('yangqi') > 0);
        T.endDay(); continue;
      }
      errors.push('stuck phase ' + S.phase); break;
    }
    const S = T.S;
    return { stones: Math.round(S.stones), nw: Math.round(T.netWorth(true)), lv: S.level, debt: S.debt, saw: S.stats.saw, fooled: S.stats.fooled, wronged: S.stats.wronged, seen: Object.keys(S.done).filter(k => !['missed', 'na'].includes(S.done[k])).length };
  }
  const out = {};
  for (const policy of (window.__POL || ['wise', 'naive', 'cautious', 'random'])) {
    const rs = [];
    for (let i = 0; i < 120; i++) { try { rs.push(play(1000 + i * 7, policy)); } catch (e) { errors.push(policy + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } }
    const avg = k => Math.round(rs.reduce((a, r) => a + r[k], 0) / Math.max(1, rs.length) * 10) / 10;
    out[policy] = { n: rs.length, stones: avg('stones'), networth: avg('nw'), level: avg('lv'), debtRate: Math.round(rs.filter(r => r.debt > 0).length / Math.max(1, rs.length) * 100) + '%', lv5Rate: Math.round(rs.filter(r => r.lv >= 5).length / Math.max(1, rs.length) * 100) + '%', saw: avg('saw'), fooled: avg('fooled'), wronged: avg('wronged'), dealsSeen: avg('seen'), top: Math.round(rs.filter(r => !r.debt && r.lv >= 5 && r.fooled + r.wronged <= 1).length / Math.max(1, rs.length) * 100) + '%' };
  }
  out.errors = [...new Set(errors)].slice(0, 12);
  return out;
})()
