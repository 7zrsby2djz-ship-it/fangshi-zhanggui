"""冒煙測試：iPhone 尺寸，點過開張→早上→店面→找上門的事→探索→日報→店務→謎題→死亡→回到前一天。截圖到 /workspace/shots/"""
import pathlib, sys, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/workspace/shots'); OUT.mkdir(exist_ok=True)
URL = (ROOT / 'dist' / 'game.html').as_uri()
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_timeout(300)
    def shot(n, full=True): pg.wait_for_timeout(250); pg.screenshot(path=str(OUT / f'{n}.png'), full_page=full)
    def click(sel):
        loc = pg.locator(sel + ':not([disabled])')
        if loc.count(): loc.first.click(); pg.wait_for_timeout(120); return True
        return False
    shot('01-title')
    click('[data-act=setup]'); shot('02-setup', False)
    click('.sheet [data-act=new]'); shot('03-morning')
    # 處理早上卡片
    for _ in range(4):
        if not click('[data-act=dchoice]'): break
    click('[data-act=open]'); shot('04-hub')
    if click('[data-act=inter]'): shot('05-interrupt'); click('[data-act=decide]'); shot('06-decided'); click('[data-act=close]')
    click('[data-act=tab][data-v=shop]'); shot('07-shop')
    click('[data-act=hire]'); click('[data-act=pol][data-k=price][data-v=low]'); shot('08-shop-after')
    click('[data-act=tab][data-v=main]')
    click('[data-act=enter][data-id=ruin]'); shot('09-place')
    click('[data-act=explore]'); shot('10-explore')
    click('[data-act=leave]'); shot('11-hub2')
    click('[data-act=evening]'); shot('12-night')
    click('[data-act=tab][data-v=threads]'); shot('13-threads')
    click('[data-act=tab][data-v=main]')
    click('[data-act=sleep]'); shot('14-day2')
    # 強制一次死亡，測回到前一天
    pg.evaluate("(()=>{const T=window.__fs; T.die('cliff_jump'); T.render();})()"); shot('15-dead')
    click('[data-act=deathsheet]'); shot('16-deathbook', False); click('.sheet button[data-act=closesheet]')
    ok = click('[data-act=restore][data-v=prev]') or click('[data-act=restore][data-v=today]')
    st = pg.evaluate("(()=>{const S=window.__fs.S;return {phase:S.phase,day:S.day,dead:S.dead}})()")
    shot('17-restored')
    pg.reload(); pg.wait_for_timeout(300)
    st2 = pg.evaluate("(()=>{const S=window.__fs.S;return S&&{phase:S.phase,day:S.day}})()")
    click('[data-act=achsheet]'); shot('18-ach', False)
    print(json.dumps({'restored': ok, 'state': st, 'afterReload': st2, 'errors': errs}, ensure_ascii=False))
