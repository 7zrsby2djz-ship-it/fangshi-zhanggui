"""卡片版自動試玩：只點畫面上的按鈕。
用法：python3 tools/card_play.py <風格> <局數> [每局最多回到月初幾次] [截圖前綴]
風格：careful（避開紅字、問清楚再決定）、random（亂點）、reckless（專挑危險的）、story（先問、優先點帶遺物的選項）
"""
import json, pathlib, random, sys
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
style = sys.argv[1] if len(sys.argv) > 1 else 'careful'
runs = int(sys.argv[2]) if len(sys.argv) > 2 else 3
maxRestore = int(sys.argv[3]) if len(sys.argv) > 3 else 6
shotp = sys.argv[4] if len(sys.argv) > 4 else ''
OUT = pathlib.Path('/tmp/fs/cardshots'); OUT.mkdir(parents=True, exist_ok=True)
res = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2 if shotp else 1, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    pg.goto((ROOT / 'dist' / 'game.html').as_uri()); pg.evaluate('localStorage.clear()'); pg.reload()
    for run in range(runs):
        rng = random.Random(run * 7 + len(style) + int(__import__('os').environ.get('SEEDX', '0')))
        log = {'run': run, 'deaths': [], 'restores': 0, 'clicks': 0, 'end': None, 'stage': 0, 'kinds': {}}
        pg.click('[data-act=restart]', force=True)
        shots = 0
        for step in range(3000):
            st = pg.evaluate('(()=>{const S=window.__fc.S;return S&&{stage:S.stage,dead:S.dead,phase:S.phase,kind:S.card&&S.card.kind,stones:S.stones,life:S.lifespan,lv:S.level,b:S.burden,ended:S.ended}})()')
            if not st: break
            log['stage'] = st['stage']
            if shotp and shots < 14 and step % 9 == 0:
                pg.screenshot(path=str(OUT / f'{shotp}-{run}-{shots:02d}.png'), full_page=True); shots += 1
            if st['phase'] == 'over':
                log['end'] = st['ended']; log['final'] = st
                if shotp: pg.screenshot(path=str(OUT / f'{shotp}-{run}-end.png'), full_page=True)
                break
            if st['dead'] and pg.locator('[data-act=restore]').count():
                log['deaths'].append((st['stage'], st['dead']))
                if shotp and len(log['deaths']) <= 2: pg.screenshot(path=str(OUT / f'{shotp}-{run}-dead{len(log["deaths"])}.png'), full_page=True)
                if log['restores'] >= maxRestore: log['gaveup'] = True; break
                log['restores'] += 1
                same = sum(1 for x in log['deaths'] if x[0] == st['stage'])
                money = st['dead'] in ('pawn_due', 'shop_sealed', 'unmanaged')
                if money and same >= 2 and pg.locator('#app [data-act=restore][data-v="3"]').count():
                    pg.click('#app [data-act=restore][data-v="3"]', force=True)
                elif same >= 2 and pg.locator('#app [data-act=restore][data-v="1"]').count():
                    pg.click('#app [data-act=restore][data-v="1"]', force=True)
                else:
                    pg.click('#app [data-act=restore]:not([data-v])', force=True)
                continue
            for sel in ('[data-act=die]', '[data-act=next]'):
                if pg.locator(sel).count(): pg.click(sel, force=True); log['clicks'] += 1; break
            else:
                opts = pg.evaluate('''[...document.querySelectorAll('#app .opt:not([disabled])')].map(b=>({k:b.dataset.k,info:b.classList.contains('info'),deadly:b.classList.contains('deadly'),danger:!!b.querySelector('.danger'),mem:!!b.querySelector('.mem'),relic:!!b.querySelector('.relic'),armed:b.classList.contains('armed'),disabled:!!b.disabled}))''')
                if not opts:
                    if pg.locator('#app .go').count(): pg.click('#app .go', force=True); continue
                    log['stuck'] = st; break
                kind = st['kind']; log['kinds'][kind] = log['kinds'].get(kind, 0) + 1
                armed = [o for o in opts if o['armed']]
                if armed: k = armed[0]['k']  # 確認會死人的第二下
                else:
                    info = [o for o in opts if o['info']]; real = [o for o in opts if not o['info']]
                    if style == 'careful':
                        if info and rng.random() < 0.6: k = info[0]['k']
                        elif kind == 'dues':
                            pay = [o for o in real if o['k'] == 'pay' and not o.get('disabled')]
                            soft = [o for o in real if o['k'] in ('sellbag', 'split', 'beg', 'beg2') and not o.get('disabled') and not o.get('deadly')]
                            if pay: k = pay[0]['k']
                            elif soft: k = soft[0]['k']
                            else:
                                safe = [o for o in real if not o['danger'] and not o['deadly']] or real
                                k = safe[0]['k']
                        elif kind == 'pawn':
                            red = [o for o in real if o['k'] == 'redeem' and not o.get('disabled')]
                            leave_dead = [o for o in real if o['k'] == 'leave' and o.get('deadly')]
                            if (leave_dead or st['life'] <= 6) and red: k = red[0]['k']
                            else: k = ([o for o in real if o['k'] in ('no', 'leave')] or real)[-1]['k']
                        elif kind in ('smith', 'upgrade') and st['stones'] < 320:
                            k = [o for o in real if o['k'] in ('no', 'leave')][0]['k'] if [o for o in real if o['k'] in ('no', 'leave')] else real[-1]['k']
                        else:
                            safe = [o for o in real if not o['danger'] and not o['mem']] or real  # 只看畫面上看得到的警告
                            if kind == 'out': safe = [o for o in safe if o['k'] != 'stay'] if rng.random() < 0.7 else [o for o in safe if o['k'] == 'stay'] or safe
                            k = rng.choice(safe)['k']
                    elif style == 'story':
                        rel = [o for o in real if o['relic'] and not o['danger']]
                        if info and rng.random() < 0.8: k = info[0]['k']
                        elif kind == 'dues':
                            pay = [o for o in real if o['k'] == 'pay' and not o.get('disabled')]
                            soft = [o for o in real if o['k'] in ('sellbag', 'split', 'beg') and not o.get('disabled') and not o.get('deadly')]
                            if pay: k = pay[0]['k']
                            elif soft: k = soft[0]['k']
                            else: k = ([o for o in real if not o['deadly']] or real)[0]['k']
                        elif kind == 'pawn':
                            red = [o for o in real if o['k'] == 'redeem' and not o.get('disabled')]
                            if st.get('life', 99) <= 8 and red: k = red[0]['k']
                            else: k = ([o for o in real if o['k'] == 'leave'] or [o for o in real if not o['deadly']] or real)[0]['k']
                        elif rel: k = rel[0]['k']
                        else:
                            safe = [o for o in real if not o['mem'] and not o['danger']] or real
                            if kind == 'out': safe = [o for o in safe if o['k'] == 'far'] or safe
                            k = safe[0]['k'] if kind in ('deal',) and rng.random() < 0.5 else rng.choice(safe)['k']
                    elif style == 'reckless':
                        dz = [o for o in real if o['deadly'] or o['danger']]
                        k = (dz or real)[0]['k'] if rng.random() < 0.7 else rng.choice(real)['k']
                        if kind == 'out': k = 'far'
                    else:
                        k = rng.choice(opts)['k']
                pg.click(f'#app .opt[data-k="{k}"]', force=True); log['clicks'] += 1
        log['errors'] = errs[:]; errs.clear()
        res.append(log)
        print(json.dumps(log, ensure_ascii=False))
    b.close()
ends = [r['end'] for r in res]; d = sum(len(r['deaths']) for r in res)
print('SUMMARY', style, 'runs', runs, 'ends', ends, 'deaths', d, 'perRun', round(d / max(1, runs), 1))
