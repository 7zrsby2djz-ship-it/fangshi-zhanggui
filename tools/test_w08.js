#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const {boot,act,state,reload,rejectCustomer,finishDay:oldFinishDay,toDay:oldToDay,clone,KEY} = require('./test_o101');
const m2=(e,k,id,ui=true)=>act(e,'m2',{k,id},ui);
function decide(e,k){act(e,'decidesheet');act(e,'decide',{k});}
function finishDay(e){
 if(e.T.S.phase==='morning')act(e,'open');
 while(e.T.S.slot<3){act(e,'shop');if(e.T.S.enc.deal==='m207' && e.T.S.intel.i_xuechan){decide(e,'deal');act(e,'close');}else rejectCustomer(e);}
 if(e.T.S.phase==='enc')rejectCustomer(e);
 if(!e.T.S.night)act(e,'meditate');act(e,'sleep');
}
function toDay(e,day){while(e.T.S.day<day)finishDay(e);}
function normalMonth1(){
 let e=boot();act(e,'new');act(e,'readnews',{id:'n_vein'});act(e,'closesheet');act(e,'open');act(e,'shop');for(let i=0;i<3;i++)decide(e,'decline');act(e,'close');finishDay(e);
 act(e,'readnews',{id:'n_rain'});act(e,'closesheet');act(e,'open');act(e,'shop');for(let i=0;i<3;i++)act(e,'m1scene',{k:'next'});act(e,'close');finishDay(e);
 act(e,'open');act(e,'enter',{id:'market'});act(e,'opptrip');act(e,'oppsource');act(e,'oppprepare');act(e,'leave');act(e,'shop');assert.equal(e.T.S.enc.deal,'d21');rejectCustomer(e);finishDay(e);
 act(e,'open');act(e,'shop');act(e,'oppfit');act(e,'oppsale');act(e,'close');act(e,'shop');assert.equal(e.T.S.enc.deal,'d11');act(e,'verify');act(e,'verifyw',{id:'bai'});decide(e,'decline');act(e,'close');finishDay(e);
 act(e,'open');act(e,'shop');assert.equal(e.T.S.enc.deal,'d12');rejectCustomer(e);act(e,'shop');for(const k of ['inspect','haggle','all'])act(e,'m1scene',{k});act(e,'close');finishDay(e);
 act(e,'oppreturn');act(e,'closesheet');finishDay(e);assert.equal(e.T.S.stones,39);act(e,'nextmonth');assert.equal(e.T.S.month,2);assert.equal(e.T.S.stones,39);return e;
}
function s07(e,accept=true){act(e,'open');act(e,'shop');assert.equal(e.T.S.enc.m2scene,'s07');m2(e,'scene_next','s07');m2(e,'scene_next','s07');m2(e,accept?'scene_accept':'scene_decline','s07');act(e,'close');}
function o201Supply(e,ore=true){act(e,'open');act(e,'enter',{id:'tie_workshop'});if(ore)m2(e,'ore',String(e.T.S.lots.find(l=>l.item==='hantie').id));m2(e,'source','O201');m2(e,'prepare','O201');}
function o201Sale(e){act(e,'leave');assert.equal(e.T.S.slot,1);act(e,'shop');assert.equal(e.T.S.enc.m2offer,'O201');m2(e,'fit','O201');m2(e,'sale','O201');act(e,'close');assert.equal(e.T.S.slot,2);}
function s09(e){act(e,'open');act(e,'shop');assert.equal(e.T.S.enc.deal,'m207');decide(e,'deal');act(e,'close');act(e,'shop');assert.equal(e.T.S.enc.m2scene,'s09');m2(e,'scene_next','s09');m2(e,'scene_next','s09');m2(e,'scene_decline','s09');act(e,'close');}
function o203(e,look=true){act(e,'open');act(e,'enter',{id:'market'});m2(e,'jug_need','O203');if(look)m2(e,'jug_literal','O203');m2(e,'jug_address','O203');m2(e,'source','O203');m2(e,'fit','O203');m2(e,'prepare','O203');m2(e,'sale','O203');act(e,'leave');}
function s11(e,accept=true){act(e,'open');act(e,'shop');assert.equal(e.T.S.enc.m2scene,'s11');m2(e,'scene_next','s11');m2(e,accept?'scene_accept':'scene_decline','s11');act(e,'close');}
function o204(e){act(e,'enter',{id:'tao_workshop'});m2(e,'source','O204');m2(e,'fit','O204');m2(e,'prepare','O204');m2(e,'sale','O204');act(e,'leave');assert.equal(e.T.S.slot,2);}
function checkpoint(e){const next=reload(e);act(next,'continue');const a=state(next),b=state(e);delete a.saveRevision;delete b.saveRevision;assert.deepEqual(a,b);return next;}
let e=normalMonth1();s07(e);e=checkpoint(e);assert.ok(e.T.S.monthTwo.tieAddress);assert.equal(e.T.S.stones,39);finishDay(e);
o201Supply(e);assert.equal(e.T.S.stones,43);assert.equal(e.T.held('hantie'),4000);assert.equal(e.T.held('cover_steel_buckle'),0);e=checkpoint(e);o201Sale(e);assert.equal(e.T.S.stones,67);e=checkpoint(e);finishDay(e);
assert.equal(e.T.S.opportunities.O201.state,'return_due');assert.equal(e.T.S.intel.i_opp201_return,undefined);m2(e,'return','O201');act(e,'closesheet');assert.equal(e.T.S.stones,67);assert.ok(e.T.S.intel.i_opp201_return);s09(e);assert.equal(e.T.S.monthTwo.plan,null);assert.equal(e.T.S.opportunities.O202.state,'unavailable');e=checkpoint(e);finishDay(e);
o203(e);assert.equal(e.T.S.stones,77);assert.ok(e.T.S.monthTwo.knowledge.jug);assert.ok(e.T.S.monthTwo.taoAddress);e=checkpoint(e);finishDay(e);
s11(e);assert.equal(e.T.S.slot,1);assert.equal(e.T.S.monthTwo.knowledge.lunchbox,false);assert.equal(e.T.S.intel.i_opp204_return,undefined);o204(e);assert.equal(e.T.S.stones,89);e=checkpoint(e);act(e,'shop');assert.equal(e.T.S.enc.deal,'m214');rejectCustomer(e);finishDay(e);
assert.equal(e.T.S.monthTwo.knowledge.lunchbox,false);assert.equal(e.T.S.opportunities.O203.state,'return_due');assert.equal(e.T.S.opportunities.O204.state,'return_due');
const inventory=clone(e.T.S.lots),cash=e.T.S.stones;
for(const id of ['O203','O204']){m2(e,'return',id);if(id==='O204')assert.match(e.nodes['#sheet'].innerHTML,/2029\/12\/31.*那個舊壺/s);act(e,'closesheet');m2(e,'return',id);act(e,'closesheet');}
assert.deepEqual(clone(e.T.S.lots),inventory);assert.equal(e.T.S.stones,cash);assert.equal(e.T.S.monthTwo.knowledge.lunchbox,true);finishDay(e);assert.equal(e.T.S.stones,9);assert.equal(e.T.S.dues.amount,80);assert.equal(e.T.S.phase,'end');
for(const id of ['m218','m220'])assert.equal(e.T.S.done[id],undefined);
assert.equal(e.T.S.events.some(x=>String(x.id).includes('O20')),false);
console.log('通過：正常未鎖UI兩月120→39→67→77→89→9；S07實量/地址、兩格S08、m207先/S09拒接、一次市場S10、兩格S11/m214仍可接；回報0、原物不入庫、兩刻文實見才比較、逐階存讀');

module.exports={normalMonth1,s07,o201Supply,o201Sale,s09,o203,s11,o204,m2,checkpoint};
function sameEconomic(a,b){delete a.saveRevision;delete b.saveRevision;assert.deepEqual(a,b);}
function m2Start(){const e=normalMonth1();s07(e);finishDay(e);return e;}
// Independent ordinary ore sale; refusing the replacement order does not spend its money.
let oreOnly=normalMonth1();s07(oreOnly,false);finishDay(oreOnly);act(oreOnly,'open');act(oreOnly,'enter',{id:'tie_workshop'});const lid=String(oreOnly.T.S.lots.find(l=>l.item==='hantie').id);
m2(oreOnly,'ore',lid);assert.equal(oreOnly.T.S.stones,59);assert.equal(oreOnly.T.held('hantie'),4000);m2(oreOnly,'ore',lid,false);assert.equal(oreOnly.T.S.stones,59);assert.equal(oreOnly.T.S.opportunities.O201.receipts.prepare,undefined);
// Supplier session is a current visit, not a month-wide flag; missing supply and insufficient cash do nothing.
let missing=m2Start();act(missing,'open');act(missing,'enter',{id:'tie_workshop'});let before=state(missing);m2(missing,'prepare','O201',false);sameEconomic(state(missing),before);
m2(missing,'source','O201');act(missing,'leave');before=state(missing);m2(missing,'prepare','O201',false);sameEconomic(state(missing),before);
act(missing,'enter',{id:'tie_workshop'});before=state(missing);m2(missing,'prepare','O201',false);sameEconomic(state(missing),before);m2(missing,'source','O201');
missing.T.S.stones=15;before=state(missing);m2(missing,'prepare','O201',false);sameEconomic(state(missing),before);
// Atomic write failures cover both independent ore and prepare/sale/read/disposition.
let atomic=m2Start();act(atomic,'open');act(atomic,'enter',{id:'tie_workshop'});const lot=String(atomic.T.S.lots[0].id);before=state(atomic);const raw=atomic.storage.get(KEY);atomic.faults.set=true;m2(atomic,'ore',lot);assert.deepEqual(state(atomic),before);assert.equal(atomic.storage.get(KEY),raw);atomic.faults.set=false;m2(atomic,'ore',lot);m2(atomic,'source','O201');before=state(atomic);atomic.faults.set=true;m2(atomic,'prepare','O201');assert.deepEqual(state(atomic),before);atomic.faults.set=false;m2(atomic,'prepare','O201');m2(atomic,'prepare','O201',false);assert.equal(atomic.T.S.stones,43);
act(atomic,'leave');act(atomic,'shop');m2(atomic,'fit','O201');before=state(atomic);atomic.faults.set=true;m2(atomic,'sale','O201');assert.deepEqual(state(atomic),before);atomic.faults.set=false;m2(atomic,'sale','O201');m2(atomic,'sale','O201',false);assert.equal(atomic.T.S.stones,67);act(atomic,'close');finishDay(atomic);before=state(atomic);atomic.faults.set=true;m2(atomic,'return','O201');assert.deepEqual(state(atomic),before);atomic.faults.set=false;m2(atomic,'return','O201');assert.equal(atomic.T.S.stones,67);
let fail=m2Start();o201Supply(fail,false);act(fail,'leave');act(fail,'shop');before=state(fail);fail.faults.set=true;m2(fail,'reject','O201');assert.deepEqual(state(fail),before);fail.faults.set=false;m2(fail,'reject','O201');m2(fail,'reject','O201',false);assert.equal(fail.T.S.stones,23);assert.equal(fail.T.held('cover_steel_buckle'),4);assert.equal(fail.T.S.opportunities.O201.state,'failed');assert.equal(fail.T.S.opportunities.O201.receipts.sale,undefined);assert.equal(fail.T.S.lots.find(l=>l.item==='cover_steel_buckle').totalCost,16);
let expiry=m2Start();o201Supply(expiry,false);act(expiry,'leave');act(expiry,'enter',{id:'market'});act(expiry,'leave');act(expiry,'enter',{id:'market'});act(expiry,'leave');finishDay(expiry);assert.equal(expiry.T.S.opportunities.O201.state,'expired');assert.equal(expiry.T.held('cover_steel_buckle'),4);assert.equal(expiry.T.S.stones,23);assert.equal(expiry.T.S.opportunities.O201.inbox.delivered,false);
console.log('通過：原礦獨立售20/連點、無供貨/離場/新session/15不足零變化；備貨/成交/回報/不合轉貨落盤失敗回滾，失約與不合區分、4扣轉普通無退款');
// No O101 common memory; address must actually be heard. A last-slot S11 may listen but cannot take a free workshop slot.
let noAddress=normalMonth1();act(noAddress,'open');act(noAddress,'shop');m2(noAddress,'scene_next','s07');m2(noAddress,'scene_decline','s07');act(noAddress,'close');finishDay(noAddress);act(noAddress,'open');before=state(noAddress);act(noAddress,'enter',{id:'tie_workshop'},false);sameEconomic(state(noAddress),before);assert.equal(noAddress.T.S.monthTwo.tieAddress,false);
let late=normalMonth1();s07(late);toDay(late,4);o203(late);finishDay(late);act(late,'open');for(let i=0;i<2;i++){act(late,'enter',{id:'market'});act(late,'leave');}const lateFixture=state(late);act(late,'shop');assert.equal(late.T.S.enc.deal,'m214','只剩申且m214尚未見，先保留唯一日舊客');rejectCustomer(late);
lateFixture.done.m214='decline'; // labeled save probe: prior m214 already handled, only listening S11 remains
late=boot(JSON.stringify(lateFixture));act(late,'continue');act(late,'shop');assert.equal(late.T.S.enc.m2scene,'s11');m2(late,'scene_next','s11');before=state(late);m2(late,'scene_accept','s11',false);sameEconomic(state(late),before);assert.equal(late.T.S.opportunities.O204.receipts.prepare,undefined);m2(late,'scene_decline','s11');act(late,'close');
let oneDate=normalMonth1();s07(oneDate);toDay(oneDate,4);o203(oneDate,false);finishDay(oneDate);s11(oneDate);o204(oneDate);finishDay(oneDate);m2(oneDate,'return','O204');assert.match(oneDate.nodes['#sheet'].innerHTML,/2029\/12\/31/);assert.doesNotMatch(oneDate.nodes['#sheet'].innerHTML,/那個舊壺也是/);assert.equal(oneDate.T.S.monthTwo.knowledge.jug,false);
let observedDecline=normalMonth1();s07(observedDecline);toDay(observedDecline,4);act(observedDecline,'open');act(observedDecline,'enter',{id:'market'});m2(observedDecline,'jug_need','O203');m2(observedDecline,'jug_literal','O203');m2(observedDecline,'source','O203');m2(observedDecline,'fit','O203');m2(observedDecline,'decline','O203');assert.ok(observedDecline.T.S.intel.i_jug_literal);assert.equal(observedDecline.T.S.opportunities.O203.receipts.prepare,undefined);assert.equal(observedDecline.T.S.stones,39);assert.equal(observedDecline.T.held('jug_frame_sleeve'),0);
console.log('通過：未實聽地址不可工坊；S11申格禁止免費兩格；未見壺字只有盒字不比較；看壺字/試套後拒買0款，刻文知識仍保留');
// Previous W07 v2 fixtures: retain original active prices, lots, due dirty events and completed history without granting new story memories.
const previous=normalMonth1(), prior=state(previous);delete prior.monthTwo;delete prior.monthTwoVersion;for(const id of ['O201','O202','O203','O204'])delete prior.opportunities[id];
let migrated=boot(JSON.stringify(prior));assert.ok(migrated.T.S);assert.equal(migrated.writes.length,0);assert.equal(migrated.T.S.monthTwo.s07,'pending');assert.equal(migrated.T.S.stones,39);
for(const id of ['m218','m220']){
 const old=clone(prior),isOre=id==='m218';old.day=isOre?2:5;old.slot=0;old.phase='enc';old.events=[{id:isOre?'e_kuang_dirty':'e_han_cut',day:6}];old.enc={deal:id,npc:isOre?'kuang':'han',side:'buy',item:isOre?'hantie':'dingshen',qty:isOre?2000:1,price:isOre?10:38,tea:5,teaMax:5,th:[],press:0,haggle:0,asked:false,silent:false,appraised:false,verified:[],cold:false,done:null,from:'shop',lot:isOre?1:2};
 const restored=boot(JSON.stringify(old));assert.ok(restored.T.S);assert.equal(restored.writes.length,0);assert.equal(restored.T.S.events[0].id,old.events[0].id);act(restored,'continue');assert.match(restored.nodes['#app'].innerHTML,/上版已開始/);decide(restored,'deal');const payment=isOre?10*2000/600:38;assert.equal(restored.T.S.stones,39+payment);assert.equal(restored.T.held(isOre?'hantie':'dingshen'),isOre?4000:0);act(restored,'close');assert.equal(restored.T.S.monthTwo.legacy[id],'completed');assert.equal(restored.T.S.opportunities[isOre?'O201':'O203'].receipts.sale,undefined);assert.equal(restored.T.S.intel[isOre?'i_opp201_spec':'i_opp203_jug_need'],undefined);
 const done=clone(prior);done.day=5;done.done[id]='deal';const loaded=boot(JSON.stringify(done));assert.equal(loaded.T.S.monthTwo.legacy[id],'completed');assert.equal(loaded.T.S.stones,39);assert.equal(loaded.T.S.intel.i_jug_literal,undefined);
}
for(const mutate of [c=>delete c.monthTwo.s09,c=>c.opportunities.O201.state='bogus',c=>c.opportunities.O202.gate=true,c=>c.monthTwo.plan='short',c=>c.opportunities.O204.quote.cost=true,c=>c.monthTwo.knowledge.lunchbox=true,c=>c.opportunities.O201.receipts.sale={id:'O201:sale',at:8}]){const bad=clone(state(previous));mutate(bad);const invalid=boot(JSON.stringify(bad));assert.equal(invalid.T.S,null);assert.equal(invalid.writes.length,0);assert.equal(invalid.storage.get(KEY),JSON.stringify(bad));}
console.log('通過：W07v2唯讀補預設；active m218/m220保原款貨/舊事件續完、completed不補新記憶；partial/未知state/approval偽造/布林報價/刻文與收據矛盾拒讀留raw');
// Clearly labeled isolated candidate data fixtures. Real built data remains gate=false on every ordinary boot.
for(const plan of ['short','overnight']){
 const fixture=clone(prior);fixture.month=2;fixture.day=3;fixture.slot=1;fixture.phase='day';fixture.done.m207='deal';
 let candidate=boot(JSON.stringify(fixture),'原版原文保留',{o202Candidate:true});assert.ok(candidate.T.S);act(candidate,'continue');candidate.T.S.monthTwo.tieAddress=true; // explicit address fixture for candidate-only route
 act(candidate,'shop');m2(candidate,'scene_next','s09');m2(candidate,'scene_next','s09');m2(candidate,'plan_'+plan,'s09');act(candidate,'close');assert.equal(candidate.T.S.slot,2);act(candidate,'enter',{id:'tie_workshop'});m2(candidate,'source','O202');m2(candidate,'fit','O202');m2(candidate,'prepare','O202');m2(candidate,'sale','O202');assert.equal(candidate.T.S.stones,39+(plan==='short'?4:6));assert.equal(candidate.T.S.opportunities.O202.stock.qty,0);act(candidate,'leave');assert.equal(candidate.T.S.slot,3);
 assert.equal(candidate.T.S.opportunities.O204.receipts.prepare,undefined);finishDay(candidate);finishDay(candidate);finishDay(candidate);assert.equal(candidate.T.S.opportunities.O202.inbox.delivered,true);m2(candidate,'return','O202');assert.match(candidate.nodes['#sheet'].innerHTML,plan==='short'?/短程，當天回/:/過夜，隔天回/);assert.equal(candidate.T.S.monthTwo.knowledge.lunchbox,false);
 assert.equal(boot(candidate.storage.get(KEY)).T.S,null,'一般版本拒讀候選已成交存檔，不接受存檔開gate');
}
assert.equal(boot().T.D.month2.offers.O202.gate,false);
console.log('通過：明標人工immutable-data gate fixture短6/10與過夜12/18、兩格/各自回報0/與O204互斥；一般存檔與一般UI沒有批准開關，正常O202仍只核准拒接');
// Each on-site offer keeps the purchase visit strict; costs do not reappear in its sale command.
for(const id of ['O203','O204']){
 let route=normalMonth1();s07(route);{finishDay(route);o201Supply(route);o201Sale(route);finishDay(route);}
 s09(route);finishDay(route);
 if(id==='O204'){o203(route);finishDay(route);s11(route);act(route,'enter',{id:'tao_workshop'});}
 else {act(route,'open');act(route,'enter',{id:'market'});m2(route,'jug_need',id);}
 m2(route,'source',id);m2(route,'fit',id);const cost=route.T.m2Offer(id).cost, money=route.T.S.stones;before=state(route);route.faults.set=true;m2(route,'prepare',id);assert.deepEqual(state(route),before);route.faults.set=false;m2(route,'prepare',id);assert.equal(route.T.S.stones,money-cost);route=checkpoint(route);
 before=state(route);route.faults.set=true;m2(route,'sale',id);assert.deepEqual(state(route),before);route.faults.set=false;
 act(route,'leave');act(route,'enter',{id:id==='O203'?'market':'tao_workshop'});before=state(route);m2(route,'sale',id,false);sameEconomic(state(route),before);assert.equal(route.T.S.opportunities[id].receipts.sale,undefined);assert.match(route.nodes['#app'].innerHTML,/不能再接同單/);act(route,'leave');finishDay(route);assert.equal(route.T.S.opportunities[id].state,'expired');assert.equal(route.T.held(route.T.m2Offer(id).item),route.T.m2Offer(id).quantity);assert.equal(route.T.S.stones,money-cost);
}
let unreadReturn=normalMonth1();s07(unreadReturn);finishDay(unreadReturn);o201Supply(unreadReturn);o201Sale(unreadReturn);finishDay(unreadReturn);s09(unreadReturn);finishDay(unreadReturn);o203(unreadReturn);finishDay(unreadReturn);s11(unreadReturn);o204(unreadReturn);finishDay(unreadReturn);finishDay(unreadReturn);assert.equal(unreadReturn.T.S.phase,'end');assert.equal(unreadReturn.T.S.stones,9);assert.equal(unreadReturn.T.S.monthTwo.knowledge.lunchbox,false);m2(unreadReturn,'return','O204');assert.equal(unreadReturn.T.S.stones,9);assert.equal(unreadReturn.T.S.monthTwo.knowledge.lunchbox,true);
console.log('通過：O203/O204逐案備貨/成交落盤失敗、存讀本次來源；已買離場重訪不能再售，日末轉普通0退款；M2月結未讀回報仍可實讀且不再發款');
