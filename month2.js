/* W08：公開來源、三案循環；O202以不可存檔改寫的資料gate隔離。 */
const M2_IDS = ['O201', 'O202', 'O203', 'O204'];
const M2_REPLACED = ['m218', 'm220'];
function freshMonthTwo() { return { s07: 'pending', s09: 'pending', s11: 'pending', tieAddress: false, taoAddress: false, plan: null, oreSale: null, legacy: { m218: null, m220: null }, knowledge: { jug: false, lunchbox: false } }; }
function m2Offer(id, candidate = S) {
  const base = D.month2.offers[id]; if (!base) throw new Error('未知商案');
  if (id !== 'O202' || candidate.monthTwo.plan !== 'overnight') return base;
  return { ...base, quantity: 2, cost: 12, sale: 18, assetValue: 8 };
}
function freshM2Record(id) {
  const o = D.month2.offers[id];
  return { id, state: 'unavailable', discoveredAt: null, preparedAt: null, soldAt: null, dueAbs: null, quote: { cost: o.cost, sale: o.sale, assetValue: o.assetValue }, source: null, stock: { item: o.item, qty: 0, cost: 0, owner: 'player', batch: o.batch }, receipts: {}, inbox: { delivered: false, read: false }, fitConfirmed: false, revision: 0 };
}
function migrateMonthTwo(candidate) {
  if (candidate.monthTwoVersion !== undefined || candidate.monthTwo !== undefined) return candidate;
  if (Object.keys(candidate.opportunities).join(',') !== 'O101') throw new Error('舊進度商案集合不完整');
  candidate.monthTwoVersion = 1; candidate.monthTwo = freshMonthTwo();
  const m = candidate.monthTwo;
  for (const [id, scene] of [['m218', 's07'], ['m220', null]]) {
    if (candidate.enc && candidate.enc.deal === id) m.legacy[id] = 'active';
    else if (candidate.done[id] && !['missed', 'na'].includes(candidate.done[id])) m.legacy[id] = 'completed';
    if (scene && m.legacy[id]) m[scene] = 'legacy';
  }
  for (const [scene, day] of [['s07', 1], ['s09', 3], ['s11', 5]]) if (m[scene] === 'pending' && (candidate.month > 2 || candidate.month === 2 && candidate.day > day)) m[scene] = 'unseen';
  for (const id of M2_IDS) candidate.opportunities[id] = freshM2Record(id);
  return candidate;
}
function validateMonthTwo(c) {
  if (c.monthTwoVersion !== 1) throw new Error('第二月場景版本不支援');
  const m = c.monthTwo;
  exactKeys(m, ['s07', 's09', 's11', 'tieAddress', 'taoAddress', 'plan', 'oreSale', 'legacy', 'knowledge'], '第二月場景');
  exactKeys(m.legacy, M2_REPLACED, '舊第二月來訪'); exactKeys(m.knowledge, ['jug', 'lunchbox'], '刻文觀察');
  for (const k of ['s07', 's09', 's11']) if (!['pending', 'heard', 'declined', 'stopped', 'unseen', 'legacy'].includes(m[k])) throw new Error('第二月場景狀態無效');
  for (const k of ['tieAddress', 'taoAddress']) if (typeof m[k] !== 'boolean') throw new Error('工坊地址無效');
  for (const k of ['jug', 'lunchbox']) if (typeof m.knowledge[k] !== 'boolean') throw new Error('刻文觀察無效');
  for (const id of M2_REPLACED) if (![null, 'active', 'completed'].includes(m.legacy[id]) || m.legacy[id] === 'active' && (!c.enc || c.enc.deal !== id)) throw new Error('舊來訪記錄無效');
  if (m.legacy.m218 && m.s07 !== 'legacy') throw new Error('舊來訪不能補新試架記憶');
  if (![null, 'short', 'overnight'].includes(m.plan) || m.plan && !D.month2.offers.O202.gate) throw new Error('此版尚未開放這個行程方案');
  if (m.oreSale !== null) {
    exactKeys(m.oreSale, ['id', 'at', 'lotId', 'quantity', 'cash'], '普通原礦收據');
    if (m.oreSale.id !== 'S08:ore_sale' || m.oreSale.at !== 8 || !integer(m.oreSale.lotId) || m.oreSale.lotId < 1 || m.oreSale.quantity !== 2000 || m.oreSale.cash !== 20) throw new Error('普通原礦收據無效');
  }
  for (const id of M2_IDS) {
    const o = m2Offer(id, c), r = c.opportunities[id]; validateRecord(r, o);
    if (r.discoveredAt !== null && (r.discoveredAt < (id === 'O201' ? 7 : o.sourceDay) || r.discoveredAt > o.sourceDay) || r.soldAt !== null && r.soldAt !== o.saleDay || r.receipts.decline && (r.receipts.decline.at < 7 || r.receipts.decline.at > o.sourceDay) || id === 'O201' && r.fitConfirmed && !r.receipts.prepare) throw new Error('第二月商案期限／試裝不一致');
    if (!o.gate && (r.state !== 'unavailable' || r.discoveredAt !== null || Object.keys(r.receipts).length || r.source !== null || r.fitConfirmed)) throw new Error('未開放方案不可有成交進度');
    if (r.receipts.prepare && id === 'O201' && m.s07 !== 'heard' || r.receipts.prepare && id === 'O204' && m.s11 !== 'heard') throw new Error('未承接需求不能有備貨');
    if (r.receipts.prepare && !o.requiredIntel.every(i => c.intel[i]) || r.inbox.read && !c.intel[o.returnIntel]) throw new Error('第二月商案消息與階段矛盾');
    if (r.receipts.prepare && (o.place === 'tie_workshop' ? !m.tieAddress : id === 'O204' && !m.taoAddress)) throw new Error('沒有地址不能取得工坊批次');
    const fallback = c.lots.filter(l => l.reservationOrigin === id + ':disposition');
    if (fallback.length > 1 || fallback.length && (!r.receipts.disposition || r.receipts.sale || fallback[0].item !== o.item || fallback[0].qty > o.quantity || fallback[0].totalCost !== o.cost)) throw new Error('第二月轉貨與收據矛盾');
    if (M2_REPLACED.includes(o.replaces) && m.legacy[o.replaces] && r.state !== 'unavailable' && r.state !== 'expired') throw new Error('舊單與新商案不能同局重播');
  }
  if (c.opportunities.O202.receipts.prepare && c.opportunities.O204.receipts.prepare) throw new Error('兩次阿蘅行程不能同時接');
  if (m.knowledge.jug !== !!c.intel.i_jug_literal || m.knowledge.lunchbox !== !!c.opportunities.O204.inbox.read) throw new Error('刻文觀察與實讀記錄矛盾');
  for (const scene of ['s07','s09','s11']) if (m[scene] === 'heard' && !(scene === 's07' ? c.intel.i_opp201_spec && m.tieAddress : scene === 's09' ? c.intel.i_opp202_constraints && m.plan : c.intel.i_opp204_scope && c.intel.i_opp204_old_sample && m.taoAddress)) throw new Error('已聽需求與來源不一致');
  const e = c.enc;
  if (e && e.m2scene) {
    exactKeys(e, ['m2scene', 'npc', 'from', 'th', 'step', 'done'], '第二月相遇');
    if (!['s07', 's09', 's11'].includes(e.m2scene) || e.from !== 'shop' || !Array.isArray(e.th) || !integer(e.step) || e.step > 3 || !e.done && m[e.m2scene] !== 'pending') throw new Error('第二月相遇內容無效');
  }
  if (e && e.m2offer) {
    exactKeys(e, ['m2offer', 'from', 'done'], '第二月試裝');
    if (e.m2offer !== 'O201' || e.from !== 'shop' || typeof e.done !== 'boolean' || !e.done && c.opportunities.O201.state !== 'prepared') throw new Error('第二月試架無效');
  }
  if (e && M2_REPLACED.includes(e.deal) && m.legacy[e.deal] !== 'active') throw new Error('新故事不接受舊收購入口');
}
function m2Receipt(r, kind) { r.receipts[kind] = { id: r.id + ':' + kind, at: absDay() }; r.revision++; }
function m2Scan() {
  if (!S || !S.monthTwo || S.phase === 'end') return;
  for (const id of M2_IDS) {
    const o = m2Offer(id), r = S.opportunities[id];
    if (!o.gate || o.replaces && S.monthTwo.legacy[o.replaces] || r.state !== 'unavailable' || absDay() > o.sourceDay || id === 'O202' && !S.monthTwo.plan || id === 'O204' && S.opportunities.O202.receipts.prepare) continue;
    if (o.requiredIntel.every(i => S.intel[i])) { r.state = 'available'; r.discoveredAt = absDay(); r.revision++; }
  }
}
function m2SourceValid(id) {
  const o = m2Offer(id), r = S.opportunities[id];
  return o.gate && S.phase === 'place' && S.place && S.place.id === o.place && absDay() === o.sourceDay && S.slot < 3 && r.source && r.source.session === S.place.session;
}
function m2AtSupplier(id) { const o = m2Offer(id); return o.gate && S.phase === 'place' && S.place && S.place.id === o.place && absDay() === o.sourceDay && S.slot < 3; }
function m2Source(id) {
  if (!m2AtSupplier(id)) return;
  const o = m2Offer(id), r = S.opportunities[id];
  if (id === 'O202' && !S.monthTwo.plan || id === 'O204' && S.monthTwo.s11 !== 'heard') return;
  if (!r.receipts.prepare) { if (id !== 'O201') r.fitConfirmed = false; r.source = { batch: o.batch, session: S.place.session, day: o.sourceDay, item: o.item, quantity: o.quantity, cost: o.cost }; }
  S.place['source' + id] = true; S.met[o.supplier] = true; m2Scan();
}
function m2Prepare(id) {
  const o = m2Offer(id), r = S.opportunities[id]; if (r.receipts.prepare) return;
  if (!o.gate || r.state !== 'available' || !m2SourceValid(id) || id !== 'O201' && !r.fitConfirmed || S.stones < o.cost || !o.requiredIntel.every(i => S.intel[i]) || r.receipts.disposition || id === 'O204' && S.opportunities.O202.receipts.prepare || id === 'O202' && S.opportunities.O204.receipts.prepare) throw new Error('先確認需求、當場現貨和資金，這筆尚未備貨');
  S.stones -= o.cost; r.stock.qty = o.quantity; r.stock.cost = o.cost; r.state = 'prepared'; r.preparedAt = absDay(); m2Receipt(r, 'prepare'); S.codex[o.item] = true;
}
function m2Fit(id) {
  const o = m2Offer(id), r = S.opportunities[id];
  if (!(r.state === 'prepared' || id !== 'O201' && r.state === 'available') || absDay() !== o.saleDay || (id === 'O201' ? !S.enc || S.enc.m2offer !== id || S.enc.done : !m2AtSupplier(id) || !m2SourceValid(id))) return;
  r.fitConfirmed = true; r.revision++;
}
function m2Sale(id) {
  const o = m2Offer(id), r = S.opportunities[id]; if (r.receipts.sale) return;
  if (!o.gate || r.state !== 'prepared' || !r.fitConfirmed || absDay() !== o.saleDay || r.stock.qty !== o.quantity || (id === 'O201' ? !S.enc || S.enc.m2offer !== id || S.enc.done : !m2AtSupplier(id) || !m2SourceValid(id))) throw new Error('這筆還沒當場試合、確認付款');
  S.stones += o.sale; r.stock.qty = 0; r.stock.cost = 0; r.state = 'sold'; r.soldAt = absDay(); r.dueAbs = absDay() + o.returnDelay; m2Receipt(r, 'sale');
  if (id === 'O201') S.enc.done = true; else S.place['sold' + id] = true;
}
function m2Dispose(id, status) {
  const o = m2Offer(id), r = S.opportunities[id]; if (r.receipts.sale || r.receipts.disposition || !r.receipts.prepare) return;
  if (S.lots.some(l => l.reservationOrigin === id + ':disposition')) throw new Error('轉貨已有記錄，不能再發');
  const lot = addLot({ item: o.item, qty: o.quantity, cost: o.cost / o.quantity, known: true, label: '未成交的' + IT[o.item].name });
  if (!lot) throw new Error('轉貨物品不存在'); lot.totalCost = o.cost; lot.reservationOrigin = id + ':disposition';
  r.stock.qty = 0; r.stock.cost = 0; r.state = status; m2Receipt(r, 'disposition');
}
function m2Decline(id) { const r = S.opportunities[id]; if (!m2Offer(id).gate || !['available', 'unavailable'].includes(r.state)) return; r.state = 'declined'; m2Receipt(r, 'decline'); }
function m2Reject(id) {
  const r = S.opportunities[id]; if (r.state !== 'prepared' || (id === 'O201' ? !S.enc || S.enc.m2offer !== id || S.enc.done : !m2AtSupplier(id))) return;
  m2Dispose(id, 'failed'); if (id === 'O201') S.enc.done = true;
}
function m2Tick(close = false) {
  if (!S || !S.monthTwo || S.phase === 'end' || S.day > M.days) return;
  for (const id of M2_IDS) {
    const o = m2Offer(id), r = S.opportunities[id]; if (!o.gate) continue;
    if (r.state === 'prepared' && (absDay() > o.saleDay || close && absDay() === o.saleDay)) m2Dispose(id, 'expired');
    else if (['available', 'unavailable'].includes(r.state) && (absDay() > o.sourceDay || close && absDay() === o.sourceDay)) { r.state = 'expired'; r.revision++; }
    if (r.state === 'sold' && absDay() >= r.dueAbs && !r.receipts.return_deliver) { r.state = 'return_due'; r.inbox.delivered = true; m2Receipt(r, 'return_deliver'); }
  }
  if (close && MON() === 2) for (const [scene, day] of [['s07', 1], ['s09', 3], ['s11', 5]]) if (S.day === day && S.monthTwo[scene] === 'pending') S.monthTwo[scene] = 'unseen';
}
function m2ReadReturn(id) {
  const r = S.opportunities[id]; if (!r || !r.inbox.delivered || !r.receipts.sale || absDay() < r.dueAbs) return;
  UI.sheet = { type: 'm2return', id }; if (r.inbox.read) return;
  r.inbox.read = true; r.state = 'settled'; m2Receipt(r, 'return_read'); learnTrigger('opp:' + id + ':return_read');
  if (id === 'O204') S.monthTwo.knowledge.lunchbox = true;
}
function m2StartEncounter() {
  if (MON() !== 2 || S.phase !== 'day' || S.slot >= 3) return false;
  if (S.day === 2 && S.opportunities.O201.state === 'prepared') { S.enc = { m2offer: 'O201', from: 'shop', done: false }; S.phase = 'enc'; return true; }
  const scene = ({ 1: 's07', 3: 's09', 5: 's11' })[S.day], next = nextShopDeal();
  if (!scene || S.monthTwo[scene] !== 'pending' || !(scene === 's11' && S.monthTwo.taoAddress && S.slot < 2 && !S.opportunities.O202.receipts.prepare) && next && next.days[0] === next.days[1] && next.days[1] === S.day) return false;
  // 最後一格仍可聽需求，但不能承諾免費多跑一格。
  if (scene === 's11' && S.opportunities.O202.receipts.prepare) { S.monthTwo.s11 = 'unseen'; return false; }
  const data = D.month2[scene], npc = scene === 's07' ? 'kuang' : 'aheng'; S.met[npc] = true;
  if (S.stance === '外放') S.wind++;
  S.enc = { m2scene: scene, npc, from: 'shop', th: [{ k: 'narr', t: data.open }], step: 0, done: null };
  if (scene !== 's11') S.enc.th.push({ k: 'narr', t: S.opportunities.O101.inbox.read ? data.reputation : data.public });
  S.phase = 'enc'; return true;
}
function m2SceneAction(k) {
  const e = S.enc; if (!e || !e.m2scene || e.done) return;
  const name = e.m2scene, d = D.month2[name], m = S.monthTwo;
  if (k === 'decline' || k === 'stop') {
    e.th.push({ k: 'narr', t: k === 'stop' && d.stop ? d.stop : d.decline }); m[name] = k === 'stop' ? 'stopped' : 'declined'; e.done = { key: m[name] };
    if (name !== 's09') m2Decline(name === 's07' ? 'O201' : 'O204'); return;
  }
  if (k === 'next') {
    if (name === 's07') {
      if (e.step === 0) { e.th.push({ k: 'narr', t: d.spec }); learnTrigger('scene:S07:spec_read'); }
      else if (e.step === 1) { e.th.push({ k: 'narr', t: d.address }); m.tieAddress = true; }
      else return;
    } else if (name === 's09') {
      if (e.step === 0) { e.th.push({ k: 'narr', t: d.constraints }); learnTrigger('scene:S09:constraints_read'); }
      else if (e.step === 1) e.th.push({ k: 'narr', t: d.compare }); else return;
    } else if (e.step === 0) { e.th.push({ k: 'narr', t: d.scope }); learnTrigger('scene:S11:scope_read'); } else return;
    e.step++; m2Scan(); return;
  }
  if (k === 'accept' && name !== 's09' && e.step === (name === 's07' ? 2 : 1)) {
    if (name === 's11' && (!m.taoAddress || S.slot >= 2 || S.opportunities.O202.receipts.prepare)) throw new Error(S.slot >= 2 ? '只剩一格，今天來不及再去陶師傅那裡' : '還沒實際聽到陶師傅的入口，這次先不接');
    e.th.push({ k: 'narr', t: d.accept }); m[name] = 'heard'; e.done = { key: 'heard' }; m2Scan(); return;
  }
  if (name === 's09' && ['short', 'overnight'].includes(k) && e.step === 2 && D.month2.offers.O202.gate) {
    if (!m.tieAddress || S.slot >= 2 || S.opportunities.O204.receipts.prepare) throw new Error('今天需要已知工坊與另一個時段，兩趟阿蘅行程只能選一趟');
    m.plan = k; const r = S.opportunities.O202, o = m2Offer('O202'); r.quote.cost = o.cost; r.quote.sale = o.sale; r.quote.assetValue = o.assetValue;
    e.th.push({ k: 'narr', t: '阿蘅自己選了' + (k === 'short' ? '熟草坡當日回，沒採到也回頭' : '山坳過夜，保暖衣和兩包乾糧都帶') + '。同去鐵師傅看新批布繩，合用才各付款；這次不接另一趟取樣。' }); m.s09 = 'heard'; e.done = { key: k }; m2Scan();
  }
}
function m2OreSale(lotId) {
  if (S.monthTwo.oreSale || MON() !== 2 || S.day !== 2 || S.phase !== 'place' || S.place.id !== 'tie_workshop') return;
  const l = lotById(+lotId); if (protectedLot(l) || l.item !== 'hantie' || l.qty < 2000 || l.q < .95 || l.flags.some(f => ['contraband', 'sect', 'stolen', 'sting'].includes(f))) throw new Error('這次只收已知普通原礦兩公斤，沒有動其他貨');
  if (!l.known) throw new Error('先確認這批普通原礦');
  const costBefore = l.totalCost; l.qty -= 2000;
  if (costBefore !== undefined) l.totalCost = costBefore * l.qty / (l.qty + 2000);
  S.lots = S.lots.filter(x => x.qty > 0); S.stones += 20;
  S.monthTwo.oreSale = { id: 'S08:ore_sale', at: 8, lotId: +lotId, quantity: 2000, cash: 20 }; S.met.tie = true;
  S.place.oreSay = '鐵師傅翻幾塊，放上自己的秤：「這兩公斤可以，二十。」他當面付錢，把石料搬到台下。這是獨立普通買賣，不算四個扣子的錢，也不證新礦或許可。';
}
function m2JugAction(k) {
  if (!m2AtSupplier('O203') || S.monthTwo.legacy.m220) return;
  if (k === 'need') { S.place.jugNeed = true; learnTrigger('scene:S10:need_read'); S.met.han = true; }
  if (k === 'literal' && S.place.jugNeed) { S.place.jugLiteral = true; S.monthTwo.knowledge.jug = true; learnTrigger('scene:S10:literal_read'); }
  if (k === 'address') { S.place.taoAddressRead = true; S.monthTwo.taoAddress = true; S.met.tao = true; }
  m2Scan();
}
function m2Button(k, id, label, disabled = false) { return `<button class="btn quiet" data-act="m2" data-k="${k}" data-id="${id}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`; }
function m2Card(id) {
  const o = m2Offer(id), r = S.opportunities[id]; if (!o.gate || ['unavailable', 'declined', 'settled', 'return_due'].includes(r.state)) return '';
  let text = '', controls = '';
  if (r.state === 'available') {
    text = o.service + ` 投入${o.cost}，合用成交收${o.sale}。期限是第2月第${o.sourceDay - 6}天；備貨後未成交，${o.quantity}${IT[o.item].unit}轉普通庫存，退款0。${id === 'O202' ? '轉普通布繩後可看當時行情，後續出售另算，不保證賣得掉。' : '後續售價和買家未定。'}`;
    controls = (id !== 'O201' && m2SourceValid(id) && !r.fitConfirmed ? m2Button('fit', id, '先用實物試合，不合就不買') : '') + m2Button('prepare', id, `備貨，投入${o.cost}靈石`, !m2SourceValid(id) || id !== 'O201' && !r.fitConfirmed || S.stones < o.cost) + m2Button('defer', id, '先不做') + m2Button('decline', id, '這次不做');
    if (id !== 'O201') text += ' 這次在現場完成付款交物；已買卻離場就不能再接同單，材料日末轉普通，現金不退。';
    text += !m2SourceValid(id) ? ' 要在本次現場看過這批現貨，離場不能遠端買。' : S.stones < o.cost ? ' 目前資金不足。' : ' 當場備貨不另占時段。';
  } else if (r.state === 'prepared') {
    text = `已付${o.cost}，專用${o.quantity}${IT[o.item].unit}。` + (id === 'O201' ? '回店仍要顧店一格，讓阿岳試空架，合用才收24。' : (m2SourceValid(id) ? '先前已試合，請在這次現場確認買方付款交物；離場後不能再接同單，材料日末轉普通，退款0。' : '已離開購貨那次現場，不能再接同單。這批材料日末轉普通貨，退款0。'));
    if (id !== 'O201' && m2AtSupplier(id) && m2SourceValid(id)) controls = !r.fitConfirmed ? m2Button('fit', id, '用實物試合、調固定') : m2Button('sale', id, `確認收${o.sale}靈石、交付`);
    if (id !== 'O201' && m2AtSupplier(id)) controls += m2Button('reject', id, '不合用，不成交');
  } else if (r.state === 'sold') text = `已收${o.sale}，貨交給${NP[o.customer].name}。回報還沒到，沒有另一筆獎金。`;
  else text = r.receipts.prepare ? `${o.quantity}${IT[o.item].unit}未售貨已轉普通庫存，退款0，${id === 'O202' ? '可查看當時普通布繩行情，後續出售另算。' : '後續價與買家未定。'}` : '備貨期限已過，沒有買貨或付款。';
  const shownFit = r.fitConfirmed ? `<p>${esc(o.fit)}</p>` : '';
  return `<section class="card stack opp"><h3>${esc(o.title)}</h3><p>${esc(text)}</p>${shownFit}${r.receipts.sale ? `<p>${esc(o.sold)}</p>` : ''}<p class="small muted">需求：${o.requiredIntel.map(i => esc(IN[i].short)).join('、')}。${r.source ? '已實看本批來源與報價；' : '本批來源未看；'}回報不會把他人的物品送進庫存。</p>${controls}</section>`;
}
function m2ReservedStockValue() { return M2_IDS.reduce((sum,id) => sum + (S.opportunities[id].state === 'prepared' ? S.opportunities[id].quote.assetValue : 0), 0); }
function m2HTML(summary = false) {
  if (!S.monthTwo) return ''; let h = '';
  for (const id of [...M2_IDS].sort((a,b) => (S.opportunities[a].dueAbs || 1000) - (S.opportunities[b].dueAbs || 1000) || a.localeCompare(b))) {
    const r = S.opportunities[id], o = m2Offer(id); if (!o.gate) continue;
    if (summary) { if (r.state !== 'unavailable') h += `<div class="truth"><b>${esc(o.title)}</b><p>${r.receipts.sale ? `已收${o.sale}；` + (r.inbox.read ? '已讀回報。' : r.inbox.delivered ? '回報待讀。' : '回報未到。') : r.receipts.disposition ? '未成交，轉普通貨，退款0。' : r.receipts.prepare ? `已付${o.cost}備貨，尚未成交。` : '沒有備貨扣款或收入。'}</p>${r.inbox.delivered ? m2Button('return', id, r.inbox.read ? '再看回報' : '讀保留的回報（不占時段）') : ''}</div>`; continue; }
    if (r.inbox.delivered) h += `<section class="card stack"><h3>${esc(o.title)}｜用後回報</h3><p class="small muted">保留第2月第${r.receipts.return_deliver.at - 6}天收到的回報，沒有再次出門。</p>${m2Button('return', id, r.inbox.read ? '再看回報' : '讀回報（不占時段）')}</section>`;
    if (MON() === 2) h += m2Card(id);
  }
  return h;
}
function m2PlaceHTML() {
  if (MON() !== 2) return ''; const p = S.place; let h = '';
  if (p.id === 'market' && S.day === 4 && !S.monthTwo.legacy.m220) {
    const d = D.month2.jug;
    h += `<section class="card stack"><h3>修水壺的攤位</h3>${p.jugNeed ? `<p>${esc(d.need)}</p>` : m2Button('jug_need', 'O203', '問韓九袋子怎麼卡住了')}${p.jugNeed ? p.jugLiteral ? `<p>${esc(d.literal)}</p>` : m2Button('jug_literal', 'O203', '翻壺底量寬，看修補片') : ''}${p.taoAddressRead ? `<p>${esc(d.address)}</p>` : m2Button('jug_address', 'O203', '問陶師傅平日在哪裡工作')}</section>`;
  }
  for (const id of M2_IDS) {
    const o = m2Offer(id), r = S.opportunities[id]; if (!m2AtSupplier(id) || id === 'O202' && !S.monthTwo.plan || id === 'O204' && S.monthTwo.s11 !== 'heard' || o.replaces && S.monthTwo.legacy[o.replaces]) continue;
    h += `<section class="card stack"><h3>${esc(NP[o.supplier].name)}的現貨</h3>${p['source' + id] ? `<p>${esc(o.source)}</p>` : m2Button('source', id, '看這批現貨、尺寸與報價')}</section>` + m2Card(id);
  }
  if (p.id === 'tie_workshop' && S.day === 2) {
    h += `<section class="card stack"><h3>獨立普通買賣：原礦兩公斤</h3><p>鐵師傅這次收普通鐵礦石2000公克，付20；不加工成扣子、不要求先賣才能買扣。</p>${S.monthTwo.oreSale ? `<p>${esc(p.oreSay || '本次已售兩公斤，收20；四扣另帳。')}</p>` : S.lots.filter(l => l.item === 'hantie' && !protectedLot(l)).map(l => m2Button('ore', String(l.id), l.label + '：售2000公克，收20', l.qty < 2000 || !l.known || l.q < .95 || l.flags.some(f => ['contraband','sect','stolen','sting'].includes(f)))).join('')}</section>`;
  }
  return h;
}
function m2EncounterHTML() {
  const e = S.enc; if (e.m2offer) { const r = S.opportunities.O201, o = m2Offer('O201'); return `<section class="card stack"><h2>阿岳帶空背架來了</h2><p>${esc(r.fitConfirmed ? o.fit : '阿岳放下刷乾淨的空架，用腳撐住，四個舊扣放在旁邊。先對孔、裝好、試布罩。')}</p>${e.done ? `<p>${esc(r.receipts.sale ? o.sold : '沒有成交，新扣轉普通庫存，退款0；架子與舊扣由阿岳帶走。')}</p>` : ''}</section>`; }
  return `<div class="who">${portrait(e.npc,'neutral','big')}<div><div class="nm">${esc(NP[e.npc].name)}</div></div></div><div class="thread">${e.th.map(x => `<div class="ln narr"><span class="tx">${esc(x.t)}</span></div>`).join('')}</div>`;
}
function m2BarHTML() {
  const e = S.enc; if (e.done) return '<button class="btn primary wide" data-act="close">送客（占一個時段）</button>';
  if (e.m2offer) { const r = S.opportunities.O201; return (r.fitConfirmed ? m2Button('sale','O201','確認收24靈石、交付鋼扣') : m2Button('fit','O201','對孔裝扣、試布罩')) + m2Button('reject','O201','不合用，不成交'); }
  const name = e.m2scene, max = name === 's11' ? 1 : 2;
  let h = e.step < max ? m2Button('scene_next', name, name === 's07' ? e.step === 0 ? '量舊扣，問用途' : '問鐵師傅的入口' : name === 's09' ? e.step === 0 ? '問行程和回家的負擔' : '分兩欄比較，還不接單' : '看布角，問只從哪裡取') : name === 's09' ? m2Button('scene_decline',name,'今天先不接，原物帶回') : m2Button('scene_accept',name,name === 's07' ? '明天先看現貨，再帶架試' : '同去陶師傅確認（還需一格）', name === 's11' && (!S.monthTwo.taoAddress || S.slot >= 2));
  if (name === 's09' && e.step === 2 && D.month2.offers.O202.gate) h += m2Button('plan_short',name,'選短程；今天再去工坊一格，與取樣案擇一',!S.monthTwo.tieAddress || S.slot >= 2) + m2Button('plan_overnight',name,'選過夜；今天再去工坊一格，與取樣案擇一',!S.monthTwo.tieAddress || S.slot >= 2);
  if (!(name === 's09' && e.step === max)) h += m2Button('scene_decline', name, name === 's09' ? '今天先不談' : '這次不接');
  if (name === 's11') h += `<p class="small muted">${!S.monthTwo.taoAddress ? '還沒實際問到陶師傅的平日入口。' : S.slot >= 2 ? '只剩一格，今天來不及再出門。' : '先顧店一格，再去供應點一格；合用才買。'}</p>`;
  return h;
}
function m2ReturnHTML(id) { const o = m2Offer(id); return `<h2>${esc(o.title)}｜回報</h2><p>${esc(o.report)}</p>${id === 'O202' ? `<p>本次是${S.monthTwo.plan === 'short' ? '短程，當天回，沒採到也沒有加走' : '過夜，隔天回，保暖衣沒有省掉'}；不是另一條行程也發生。</p>` : ''}${id === 'O204' && S.monthTwo.knowledge.jug && S.monthTwo.knowledge.lunchbox ? '<p>許衡想起親眼看過的壺底：「那個舊壺也是這一年，寫十二月換內膽，沒寫幾號。」只能比同年同月，不知道兩件是不是同一批，也不知道災變原因。</p>' : ''}<p class="small muted">回報0靈石、0新增玩家貨；他人的展示物都由本人帶走。</p>`; }
function m2Action(k, id) {
  if (k.startsWith('scene_')) return m2SceneAction(k.slice(6) === 'decline' && S.enc && S.enc.m2scene === 's09' && S.enc.step < 2 ? 'stop' : k.slice(6));
  if (k.startsWith('plan_')) return m2SceneAction(k.slice(5));
  if (k.startsWith('jug_')) return m2JugAction(k.slice(4));
  if (k === 'ore') return m2OreSale(id);
  if (!M2_IDS.includes(id)) return;
  if (k === 'source') m2Source(id); if (k === 'prepare') m2Prepare(id); if (k === 'fit') m2Fit(id); if (k === 'sale') m2Sale(id); if (k === 'reject') m2Reject(id); if (k === 'decline') m2Decline(id); if (k === 'return') m2ReadReturn(id);
  if (k === 'defer') toast('先不做。仍要在明示期限內到現場看這批供貨，離場不能遠端備貨。');
}
