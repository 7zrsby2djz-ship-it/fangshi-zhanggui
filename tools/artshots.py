"""美術截圖：python3 tools/artshots.py <前綴>  → /workspace/shots/art/<前綴>-*.png（390×844）"""
import pathlib, sys, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path('/workspace/shots/art'); OUT.mkdir(parents=True, exist_ok=True)
pre = sys.argv[1] if len(sys.argv) > 1 else 'after'
scheme = sys.argv[2] if len(sys.argv) > 2 else 'light'
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme=scheme)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text else None)
    pg.goto((ROOT / 'dist' / 'game.html').as_uri()); pg.wait_for_timeout(200)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    def ev(js): return pg.evaluate("(()=>{const T=window.__fs;" + js + "})()")
    def shot(n, full=False): pg.wait_for_timeout(700); pg.screenshot(path=str(OUT / f'{pre}-{n}.png'), full_page=full)
    # 先解鎖幾個成就與死法，讓圖鑑/設定畫面有東西
    ev("localStorage.setItem('fangshi-deaths-v1', JSON.stringify({cliff_jump:{n:2,first:1},asc_ruin:{n:1,first:1},fog_lamp:{n:1,first:1}})); localStorage.setItem('fangshi-ach-v1', JSON.stringify({a_first:1,a_dead3:1}))")
    pg.reload(); pg.wait_for_timeout(300)
    shot('01-title')
    pg.locator('[data-act=setup]').first.click(); shot('02-setup')
    pg.locator('.sheet [data-act=new]').first.click(); pg.wait_for_timeout(50)
    ev("const S=T.newGame(4242,[]); T.S=S; T.UI.view='game'; T.UI.tab='main'; T.UI.sheet=null; T.render();")
    shot('03-morning')
    ev("T.S.cards.forEach((c,i)=>{if(c.choices)T.driftChoose(i,0)}); T.openShop(); T.render();")
    shot('04-hub')
    ev("const l=T.interruptsAvail(); if(l.length) T.openInterrupt(l[0].id); T.render();")
    shot('05-visitor')
    ev("T.S.enc=null; T.S.phase='day'; T.UI.tab='shop'; T.render();"); shot('06-shop')
    ev("T.UI.tab='main'; T.enterPlace('ruin'); const a=T.spotsAvail('ruin'); T.explore(a[0].id); T.render();"); shot('07-explore')
    ev("T.leavePlace(); T.S.level=7; T.S.flags.rode_bus=true; T.S.flags.saw_from_below=true; T.S.slot=0; T.S.burden=9; T.enterPlace('lampst'); T.render();"); shot('08-deep')
    ev("T.leavePlace(); T.goNight(); T.render();"); shot('09-report')
    ev("T.UI.tab='threads'; T.render();"); shot('10-threads')
    ev("T.UI.tab='main'; T.die('fog_lamp'); T.render();"); shot('11-death')
    pg.locator('[data-act=deathsheet]').first.click(); shot('12-deathbook')
    ev("T.UI.sheet={type:'ach'}; T.render();"); shot('13-achievements')
    ev("T.UI.sheet=null; window.__POL=['lamp']; window.__N=1;")
    pg.evaluate((ROOT / 'tools' / 'sim.js').read_text())
    ev("T.UI.view='game'; T.UI.tab='main'; T.render(); window.scrollTo(0,0);"); shot('14-ending')
    print(json.dumps({'errors': errs}))
