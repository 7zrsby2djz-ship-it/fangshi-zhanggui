"""Playwright harness: wrap like the artifact host, play scripted flows, take phone screenshots."""
import json, pathlib, sys
from playwright.sync_api import sync_playwright
SP = pathlib.Path('/tmp/claude-0/-home-claude/dc256064-7031-54f3-af6e-c29f959e9f5a/scratchpad/fs')
GAME = pathlib.Path('/home/claude/fangshi/dist/game.html').read_text(encoding='utf-8')
WRAP = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style>'
        '</head><body>' + GAME + '</body></html>')
page_file = SP / 'wrapped.html'; page_file.write_text(WRAP, encoding='utf-8')
shots = SP / 'shots'; shots.mkdir(exist_ok=True)
mode = sys.argv[1] if len(sys.argv) > 1 else 'flow'
scheme = sys.argv[2] if len(sys.argv) > 2 else 'light'
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 402, 'height': 874}, device_scale_factor=2, color_scheme=scheme, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errors = []
    pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    pg.goto(page_file.as_uri()); pg.wait_for_timeout(300)
    def shot(name, full=False):
        pg.wait_for_timeout(350); pg.screenshot(path=str(shots / f'{scheme}-{name}.png'), full_page=full)
    def click(sel):
        pg.locator(sel).first.click(); pg.wait_for_timeout(100)
    if mode == 'flow':
        shot('00-title', True)
        pg.evaluate("window.__fs.onAct('new', {dataset:{}})")
        # deterministic seed
        pg.evaluate("(()=>{const T=window.__fs; T.S=T.newGame(12345); T.UI.view='game'; T.render();})()")
        shot('01-morning', True)
        click('[data-act=open]'); shot('02-hub', True)
        click('[data-act=shop]'); shot('03-deal-open', True)
        for a in ['ask', 'press', 'silence', 'haggle', 'appraise']:
            if pg.locator(f'[data-act={a}]:not([disabled])').count(): click(f'[data-act={a}]')
        shot('04-deal-talk', True)
        click('[data-act=verify]'); shot('05-verify-sheet')
        click('[data-act=verifyw]'); shot('06-after-verify', True)
        click('[data-act=decidesheet]'); shot('07-decide-sheet')
        click('[data-act=decide][data-k=decline]'); shot('08-decided', True)
        click('[data-act=close]'); shot('09-hub2', True)
        click('[data-act=enter][data-id=market]') if pg.locator('[data-act=enter][data-id=market]:not([disabled])').count() else None
        shot('10-place', True)
        click('[data-act=tab][data-v=store]'); shot('11-store', True)
        click('[data-act=tab][data-v=people]'); shot('12-people', True)
        click('[data-act=tab][data-v=codex]'); shot('13-codex', True)
        click('[data-act=lore]'); shot('14-lore')
        click('.sheet [data-act=closesheet]')
        click('[data-act=tab][data-v=main]')
        pg.evaluate("(()=>{const T=window.__fs; T.S.phase='night'; T.S.slot=3; T.render();})()")
        shot('15-night', True)
    elif mode == 'sim':
        pol = sys.argv[3] if len(sys.argv) > 3 else None
        if pol: pg.evaluate(f'window.__POL = {json.dumps(pol.split(","))}')
        res = pg.evaluate(pathlib.Path('/home/claude/fangshi/sim.js').read_text())
        print(json.dumps(res, ensure_ascii=False, indent=1))
    elif mode == 'late':
        pg.evaluate("(()=>{window.__POL=['wise'];})()")
        js = pathlib.Path('/home/claude/fangshi/sim.js').read_text()
        # play a full wise month but stop at the dues scene
        pg.evaluate(js.replace("out.errors", "out.x").replace("for (let i = 0; i < 120; i++)", "for (let i = 0; i < 1; i++)"))
        pg.evaluate("(()=>{const T=window.__fs; T.UI.view='game'; T.UI.tab='main'; T.render();})()"); shot('20-end', True)
        pg.evaluate("(()=>{const T=window.__fs; T.S=T.newGame(777); T.UI.view='game'; T.S.day=6; T.S.stones=60; T.S.slot=2; T.openShop(); T.advanceSlot(); T.render();})()"); shot('21-dues', True)
        click('[data-act=decidesheet]'); shot('22-dues-sheet')
        pg.evaluate("(()=>{const T=window.__fs; T.UI.sheet=null; T.S=T.newGame(31); T.UI.view='game'; T.S.day=2; T.openShop(); T.startDeal('d04','shop'); T.actAsk(); T.actPress(); T.actSilence(); T.actAppraise(); T.render();})()"); shot('23-xuechan', True)
        click('[data-act=decidesheet]'); shot('24-xuechan-sheet')
        click('.sheet [data-act=decide][data-k=deal]'); shot('25-xuechan-done', True)
    elif mode == 'places':
        pg.evaluate("(()=>{const T=window.__fs; T.S=T.newGame(99); T.UI.view='game'; T.S.day=3; T.beginDay(); T.openShop(); T.render();})()"); shot('30-day3-hub', True)
        pg.evaluate("(()=>{const T=window.__fs; T.enterPlace('huichun'); T.render();})()"); shot('31-huichun', True)
        pg.evaluate("(()=>{const T=window.__fs; T.S.slot=1; T.S.place=null; T.enterPlace('tea'); T.onAct('tbuy',{dataset:{i:'0'}}); T.onAct('overhear',{dataset:{}}); T.render();})()"); shot('32-tea', True)
        pg.evaluate("(()=>{const T=window.__fs; T.S.slot=0; T.enterPlace('office'); T.render();})()"); shot('33-office', True)
        pg.evaluate("(()=>{const T=window.__fs; T.enterPlace('market'); T.render();})()"); shot('34-market-day', True)
        pg.evaluate("(()=>{const T=window.__fs; T.S.place=null; T.S.phase='day'; T.startWalkin(); T.render();})()"); shot('35-walkin', True)
    elif mode == 'eval':
        print(pg.evaluate(sys.argv[3]))
    print('ERRORS:', errors if errors else 'none')
    b.close()
