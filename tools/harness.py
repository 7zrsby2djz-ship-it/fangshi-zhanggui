"""Playwright harness: wrap like the artifact host, play scripted flows, take phone screenshots."""
import json, pathlib, sys
from playwright.sync_api import sync_playwright
SP = pathlib.Path('/tmp/fs'); SP.mkdir(parents=True, exist_ok=True)
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = (ROOT / 'dist' / 'game.html').read_text(encoding='utf-8')
WRAP = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style>'
        '</head><body>' + GAME + '</body></html>')
page_file = SP / 'wrapped.html'; page_file.write_text(WRAP, encoding='utf-8')
shots = pathlib.Path('/workspace/shots'); shots.mkdir(exist_ok=True)
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
        if len(sys.argv) > 4: pg.evaluate(f'window.__N = {int(sys.argv[4])}')
        if len(sys.argv) > 5: pg.evaluate(f'window.__REWIND = {int(sys.argv[5])}')
        res = pg.evaluate((ROOT / 'tools' / 'sim.js').read_text())
        print(json.dumps(res, ensure_ascii=False, indent=1))
    elif mode == 'late':
        pg.evaluate("(()=>{window.__POL=['wise'];})()")
        js = (ROOT / 'tools' / 'sim.js').read_text()
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
    elif mode == 'v2':
        ev = lambda js: pg.evaluate("(()=>{const T=window.__fs; const S=()=>T.S; const day=d=>{while(S().day<d){S().phase='night';T.meditate(0);T.endDay();}}; " + js + "; T.UI.view='game'; T.render();})()")
        ev("T.S=T.newGame(21); T.UI.tab='main'"); shot('40-morning-d1', True)
        ev("T.openShop()"); shot('41-hub-d1', True)
        ev("T.startDeal('d02','shop'); T.decide('deal'); T.closeEnc(); S().slot=0; T.enterPlace('homes'); T.visitHome('yao'); T.leavePlace(); T.startDeal('d06','shop'); T.actAsk(); T.actPress(); T.actPress()"); shot('42-deal-notes', True)
        ev("T.decide('deal'); T.closeEnc(); day(2); T.UI.tab='main'"); shot('43-morning-d2', True)
        ev("T.openShop(); T.startDeal('d04','shop'); T.actAsk(); T.decide('decline'); T.closeEnc(); S().slot=1; T.enterPlace('tea')"); shot('44-tea', True)
        click('[data-act=intelsheet]'); shot('45-sell-sheet')
        click('.sheet [data-act=sellintel]'); shot('46-sold', True)
        ev("T.leavePlace(); day(3); T.openShop()"); shot('47-hub-d3-market', True)
        ev("S().slot=0; const l=S().lots.find(l=>l.item==='yujian'); T.appraiseLot(l.id); T.enterPlace('office')"); shot('48-office', True)
        click('[data-act=accusesheet]'); shot('49-accuse-sheet')
        click('.sheet [data-act=accusego]'); shot('50-accused', True)
        ev("T.leavePlace(); T.UI.tab='intel'"); shot('51-ledger', True)
        ev("S().flags.gave_knife=true; S().flags.daoren_caught=true; S().flags.yao_closed=true; S().phase='end'; T.UI.tab='main'"); shot('52-end', True)
    elif mode == 'end':
        pol = sys.argv[3] if len(sys.argv) > 3 else 'mid'
        pg.evaluate(f"window.__POL=['{pol}']")
        js = (ROOT / 'tools' / 'sim.js').read_text()
        pg.evaluate(js.replace("for (let i = 0; i < 120; i++)", "for (let i = 0; i < 1; i++)"))
        pg.evaluate("(()=>{const T=window.__fs; T.UI.view='game'; T.UI.tab='main'; T.render();})()"); shot('60-end-' + pol, True)
        if pg.locator('tr.tap').count():
            pg.locator('tr.tap').last.click(); pg.wait_for_timeout(200); shot('61-stat-' + pol)
    elif mode == 'eval':
        print(pg.evaluate(sys.argv[3]))
    elif mode == 'js':
        print(json.dumps(pg.evaluate(pathlib.Path(sys.argv[3]).read_text()), ensure_ascii=False, indent=1))
    print('ERRORS:', errors if errors else 'none')
    b.close()
