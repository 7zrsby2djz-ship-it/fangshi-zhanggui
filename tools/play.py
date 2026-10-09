"""像真人一樣在 iPhone 尺寸下點完整局：只點畫面上看得到、可以按的按鈕。
用法：python3 tools/play.py <風格> <種子> [最多回溯次數]
風格：cautious 謹慎、greedy 貪心、explorer 探索、story 追故事、reckless 莽撞"""
import json, pathlib, random, sys, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/workspace/shots/play'); OUT.mkdir(parents=True, exist_ok=True)
style, seed = sys.argv[1], int(sys.argv[2]); maxRewind = int(sys.argv[3]) if len(sys.argv) > 3 else 3
rng = random.Random(seed)
log = {'style': style, 'seed': seed, 'clicks': 0, 'deaths': [], 'rewinds': 0, 'friction': [], 'days': 0, 'interrupts': 0, 'spots': 0, 'maxPage': 0, 'shots': []}
def fr(t):
    if t not in log['friction']: log['friction'].append(t)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto((ROOT / 'dist' / 'game.html').as_uri()); pg.wait_for_timeout(200)
    pg.evaluate("localStorage.clear()")
    if seed % 5 != 0:  # 回鍋玩家：已經有幾個成就與死法
        pg.evaluate("""(()=>{const now=Date.now();localStorage.setItem('fangshi-ach-v1',JSON.stringify({a_first_death:now,a_asc:now,a_tunnel:now,a_stair:now,a_relics8:now}));localStorage.setItem('fangshi-deaths-v1',JSON.stringify({asc_ruin:{n:1,first:now},cliff_jump:{n:1,first:now}}));})()""")
    pg.reload(); pg.wait_for_timeout(200)
    def S(expr): return pg.evaluate("(()=>{const T=window.__fs,S=T.S;return " + expr + "})()")
    def btns(sel):
        return pg.locator(sel + ':not([disabled]):visible')
    def click(loc, why=''):
        loc.scroll_into_view_if_needed(); loc.click(); log['clicks'] += 1; pg.wait_for_timeout(30)
        h = pg.evaluate('document.body.scrollHeight'); log['maxPage'] = max(log['maxPage'], h)
    def confirm_if(allow=True):
        c = pg.locator('.confirm')
        if c.count():
            log.setdefault('confirms', 0); log['confirms'] += 1
            if allow: click(c.first); return True
            log.setdefault('backedOff', 0); log['backedOff'] += 1
        return False
    def shot(n):
        f = OUT / f'{style}-{seed}-{n}.png'; pg.screenshot(path=str(f)); log['shots'].append(str(f))
    # 開張
    click(btns('[data-act=setup]').first)
    picks = btns('.sheet [data-act=bpick]')
    for i in range(min(picks.count(), 4)):
        l = btns('.sheet [data-act=bpick]')
        if l.count(): click(l.first)
    click(btns('.sheet [data-act=new]').first)
    # 開局：先調方針
    def manage():
        click(btns('[data-act=tab][data-v=shop]').first)
        if S('S.dayCount') == 0:
            if style == 'greedy':
                for k, v in [('price', 'high'), ('buy', 'generous'), ('sign', '張揚'), ('cult', 'half')]: click(btns(f'[data-act=pol][data-k={k}][data-v="{v}"]').first)
                if not S('S.shop.pol.cats.shady'): click(btns('[data-act=cat][data-k=shady]').first)
            elif style == 'cautious': click(btns('[data-act=pol][data-k=buy][data-v=strict]').first)
            elif style in ('explorer', 'story'): click(btns('[data-act=pol][data-k=cult][data-v=full]').first)
            elif style == 'reckless': click(btns('[data-act=pol][data-k=cult][data-v=full]').first); click(btns('[data-act=cat][data-k=shady]').first)
        sm = pg.locator('details:not([open]) > summary')
        for i in range(sm.count()):
            l = pg.locator('details:not([open]) > summary')
            if l.count(): click(l.first)
        res = 60 if not (S('S.month') == 2 and not S('S.dues')) else 140
        for sel in ['[data-act=gear]', '[data-act=hire]', '[data-act=upg]']:
            if style == 'reckless' and sel != '[data-act=hire]': continue
            if style == 'greedy' and sel == '[data-act=gear]': continue
            for _ in range(3):
                l = btns(sel); n = l.count(); bought = False
                for i in range(n):
                    el = l.nth(i); t = el.inner_text()
                    cost = int(''.join(c for c in t if c.isdigit()) or 0)
                    if S('S.stones') - cost > res:
                        click(el); bought = True; break
                if not bought: break
        click(btns('[data-act=tab][data-v=main]').first)
    def deadly_choice(ci, vi):
        return S(f"(()=>{{const c=S.cards[{ci}],e=T.ALLEV[c.drift];const ch=(e&&(e.choices||[]).filter(x=>T.needOk(x.need||{{}})))||[];const fx=(ch[{vi}]||{{}}).fx;return !!(fx&&fx.death&&!(fx.death.unless&&T.needOk(fx.death.unless)))}})()")
    def decide_btn():
        opts = btns('[data-act=decide]'); keys = [opts.nth(i).get_attribute('data-k') for i in range(opts.count())]
        if not keys: return None
        did = S('S.enc.deal')
        if did and did.startswith('m309'):
            pref = {'story': ['special', 'special2', 'deal'], 'cautious': ['special2', 'special', 'deal'], 'greedy': ['deal'], 'explorer': ['special', 'special2', 'deal']}.get(style)
            if pref:
                for k in pref:
                    if k in keys: return k
            return rng.choice(keys)
        if did == 'm307' and style == 'story': return 'decline'
        if style == 'reckless': return rng.choice(keys)
        if style in ('story', 'explorer') and 'special' in keys: return 'special'
        verdict = S("T.DEALS[S.enc.deal].verdict||[]"); neutral = S("!!T.DEALS[S.enc.deal].neutral")
        if style == 'greedy' and 'deal' in keys and rng.random() < 0.5: return 'deal'
        if neutral: return 'special' if 'special' in keys else ('decline' if 'decline' in keys else keys[0])
        for k in verdict:
            if k in keys: return k
        return 'decline' if 'decline' in keys else keys[0]
    def handle_interrupts():
        for _ in range(8):
            l = btns('[data-act=inter]')
            if not l.count() or S('S.dead'): return
            click(l.first); log['interrupts'] += 1
            if style in ('cautious', 'story') and btns('[data-act=appraise]').count() and S('S.spirit') > 0 and rng.random() < 0.5: click(btns('[data-act=appraise]').first)
            k = decide_btn()
            if k is None: fr('找上門的事沒有任何可選的決定'); click(btns('[data-act=later]').first); continue
            click(btns(f'[data-act=decide][data-k="{k}"]').first)
            if S('S.dead'): return
            click(btns('[data-act=close]').first)
    def explore_trip():
        lim = S('T.burdenLimit()'); places = btns('[data-act=enter]')
        ids = [places.nth(i).get_attribute('data-id') for i in range(places.count())]
        ex = [i for i in ids if i in ('ruin', 'tunnel', 'reservoir', 'cliff', 'north', 'stair', 'lampst', 'platform')]
        if not ex: return False
        if style == 'cautious': ex = ex[:3]
        order = list(reversed(ex)) if style in ('explorer', 'reckless', 'greedy', 'story') else ex
        cand = []
        for pid in order:
            new = S(f"T.spotsAvail('{pid}').filter(sp=>!sp.repeat&&T.needOk(sp.need)).length")
            pb = S(f"(T.PFX['{pid}']||{{}}).burden||0")
            if (new or style in ('greedy', 'reckless')) and (style == 'reckless' or S('S.burden') + pb <= lim): cand.append(pid)
        if not cand: return False
        click(btns(f'[data-act=enter][data-id={cand[0]}]').first)
        for _ in range(4):
            if S('S.dead') or S('S.phase') != 'place': break
            sp = btns('[data-act=explore]'); n = sp.count(); choice = None
            opts = []
            for i in range(n):
                el = sp.nth(i); t = el.inner_text(); warn = el.locator('.warn').count() > 0; over = '會超過上限' in t
                opts.append((el, t, warn, over))
            rng.shuffle(opts)
            if style == 'reckless': choice = opts[0] if opts else None
            else:
                for o in opts:
                    if o[3] and not (style == 'greedy' and rng.random() < 0.3): continue
                    if o[2] and not ((style == 'greedy' and rng.random() < 0.35) or (style == 'explorer' and rng.random() < 0.15)): continue
                    if '沒去過' in o[1] or style == 'greedy': choice = o; break
            if not choice: break
            click(choice[0]); log['spots'] += 1
            if pg.locator('.confirm').count():
                if not confirm_if(style == 'reckless' or (style == 'greedy' and rng.random() < 0.3)): break
        if S('S.dead'): return True
        if S('S.phase') == 'place' and not S('S.place.steps'):
            w = btns('[data-act=watch]')
            if w.count(): click(w.first); log['watched'] = log.get('watched', 0) + 1
        if S('S.phase') == 'place' and S('S.place.steps') and S('T.ascentRisk()') > 0 and style != 'reckless':
            d = btns('[data-act=drop]')
            if d.count(): click(d.first); log['dropped'] = log.get('dropped', 0) + 1
        if S('S.phase') == 'place':
            lb = btns('[data-act=leave]').first; t = lb.inner_text()
            if '負擔超過上限' in t: fr('離開按鈕變紅，提示回程風險（好事：有預警）')
            free = not S('S.place.steps') and not S('S.place.did') and not S('S.place.watched')
            click(lb)
            if S('S.phase') == 'place' and btns('[data-act=leave]').count(): log['leaveConfirm'] = log.get('leaveConfirm', 0) + 1; click(btns('[data-act=leave]').first)
            if free: return False
        return True
    def town():
        if S('T.relicLots().some(l=>!S.flags["studied_"+l.item])') and btns('[data-act=enter][data-id=school]').count() and style != 'reckless':
            click(btns('[data-act=enter][data-id=school]').first)
            for _ in range(5):
                l = btns('[data-act=lin][data-k=study]')
                if not l.count(): break
                click(l.first)
            click(btns('[data-act=leave]').first); return True
        if style in ('story', 'explorer', 'cautious'):
            hot = pg.locator('.place.hot:not([disabled]):visible[data-id]')
            tids = [hot.nth(i).get_attribute('data-id') for i in range(hot.count())]
            tids = [t for t in tids if t in ('school', 'tea', 'office', 'homes', 'pawn')]
            if tids and (style == 'story' or rng.random() < 0.6):
                click(btns(f'[data-act=enter][data-id={tids[0]}]').first); log['townSpots'] = log.get('townSpots', 0)
                for _ in range(3):
                    sp = btns('[data-act=explore]'); pick = None
                    for i in range(sp.count()):
                        el = sp.nth(i)
                        if el.locator('.warn').count() and not (style == 'explorer' and rng.random() < 0.2): continue
                        pick = el; break
                    if not pick: break
                    click(pick); log['townSpots'] += 1
                    if pg.locator('.confirm').count() and not confirm_if(False): break
                    if S('S.dead') or S('S.phase') != 'place': break
                did = S('!!(S.place && (S.place.steps || S.place.did))')
                if S('S.phase') == 'place': click(btns('[data-act=leave]').first)
                if did: return True
        if style == 'cautious' and btns('[data-act=enter][data-id=office]').count() and S('T.accuseList().length'):
            click(btns('[data-act=enter][data-id=office]').first)
            l = btns('[data-act=accusesheet]')
            if l.count(): click(l.first); click(btns('.sheet [data-act=accusego]').first); pg.keyboard.press('Escape')
            click(btns('[data-act=leave]').first); return True
        return False
    t0 = time.time(); guard = 0; lastDay = None; shotDone = set()
    while guard < 1500:
        guard += 1
        ph = S('S.phase')
        if ph == 'dead' or S('!!S.dead'):
            d = S('S.dead.id'); log['deaths'].append({'id': d, 'm': S('S.dead.m'), 'day': S('S.dead.day')})
            if 'dead' not in shotDone: shot('dead'); shotDone.add('dead')
            if log['rewinds'] < maxRewind:
                which = 'prev' if rng.random() < 0.5 and btns('[data-act=restore][data-v=prev]').count() else 'today'
                l = btns(f'[data-act=restore][data-v={which}]')
                if not l.count(): l = btns('[data-act=restore]')
                if l.count(): click(l.first); log['rewinds'] += 1; continue
            break
        if ph == 'end': shot('end'); break
        if ph == 'morning':
            if lastDay != (S('S.month'), S('S.day')): lastDay = (S('S.month'), S('S.day')); log['days'] += 1
            cards = S('S.cards.map(c=>!!c.choices)')
            for ci, has in enumerate(cards):
                if not has: continue
                n = S(f'S.cards[{ci}].choices.length')
                if style == 'reckless': vi = rng.randrange(n)
                else:
                    safe = [v for v in range(n) if not deadly_choice(ci, v)]
                    vi = rng.choice(safe) if safe else 0
                    if style == 'greedy' and rng.random() < 0.2: vi = rng.randrange(n)
                click(btns(f'[data-act=dchoice][data-id="{ci}"][data-v="{vi}"]').first)
                if pg.locator('.confirm').count() and not confirm_if(style == 'reckless' and rng.random() < 0.7):
                    safe = [v for v in range(n) if not deadly_choice(ci, v)] or [0]
                    click(btns(f'[data-act=dchoice][data-id="{ci}"][data-v="{safe[0]}"]').first); confirm_if(True)
                if S('!!S.dead'): break
            if S('!!S.dead'): continue
            if not btns('[data-act=open]').count(): fr('早上「開門」被卡住'); break
            if S('S.dayCount') % 2 == 0: manage()
            click(btns('[data-act=open]').first)
            if 'hub' not in shotDone: shot('hub'); shotDone.add('hub')
            handle_interrupts(); continue
        if ph == 'day':
            handle_interrupts()
            if S('!!S.dead') or S('S.phase') != 'day': continue
            if S('S.slot') >= 3: click(btns('[data-act=evening]').first); continue
            exfirst = style in ('explorer', 'reckless', 'greedy') or S('S.slot') == 0
            did = (explore_trip() or town()) if exfirst else (town() or explore_trip())
            if not did: click(btns('[data-act=evening]').first); confirm_if(True)
            continue
        if ph == 'enc':
            if btns('[data-act=close]').count(): click(btns('[data-act=close]').first)
            else: click(btns('[data-act=later]').first)
            continue
        if ph == 'place': click(btns('[data-act=leave]').first); continue
        if ph == 'night':
            if 'night' not in shotDone: shot('night'); shotDone.add('night')
            click(btns('[data-act=sleep]').first); continue
        fr('卡在未知畫面 ' + ph); break
    st = S("({rlog:(S.relicLog||[]).reduce((m,x)=>(m[x.k]=(m[x.k]||0)+1,m),{}), held:T.heldRelics().length, b1:['sc_roll_seen','tea_seat_seen','office_overtime','homes_house','stair_echo','lab_plate','lamp_kid','lab_barefoot','pf_reverse','branch_sign','saw_shell'].filter(f=>S.flags[f]), fin:['lamp','ledger','pawn'].find(k=>S.flags['finale_'+k])||null, stones:Math.round(S.stones), lv:S.level, shop:S.shop.total, staff:S.shop.staff.length, upg:Object.keys(S.shop.upg).length, ach:Object.keys(T.achBook()).length, deathBook:Object.keys(JSON.parse(localStorage.getItem('fangshi-deaths-v1')||'{}')).length, threads:T.THREADS.map(t=>T.threadState(t).done).reduce((a,b)=>a+b,0)})")
    log.update(st); log['secs'] = round(time.time() - t0); log['errors'] = errs
    print(json.dumps(log, ensure_ascii=False))
