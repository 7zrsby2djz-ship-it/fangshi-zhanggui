#!/usr/bin/env python3
"""Build the single-file game: merge content YAML into data, inline CSS/JS into the template."""
import json, pathlib, sys
from tools.check_content import check_content, load_yaml
from tools.opportunity_schema import validate_opportunities
from tools.rework_profile import apply_rework_profile
root = pathlib.Path(__file__).parent
c = root / 'content'
check_content(root)  # 在寫出產物前拒絕重複鍵／ID。
L = lambda n: load_yaml(c / f'{n}.yaml')
meta = L('meta')
data = {
    'meta': meta['meta'], 'intro': meta['intro'], 'kaozheng': meta['kaozheng'], 'endings': meta['endings'],
    'items': L('items'), 'npcs': L('npcs'), 'news': L('news'), 'deals': L('deals')['deals'],
    'places': {**L('places')['places'], **{k: v for k, v in L('places').items() if k != 'places'}},
    'events': {**L('events')['events'], 'monthStart': L('events').get('monthStart', {})},
    'intel': L('intel')['intel'], 'heat': L('intel')['heat'], 'accuse': L('intel')['accuse'],
}
data['meta']['truthLabels'] = meta['truthLabels']
data['opportunities'] = L('opportunities')['opportunities'] if (c / 'opportunities.yaml').exists() else []
data['month1'] = L('month1')
validate_opportunities(data['opportunities'], data)
apply_rework_profile(data)
payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', chr(92) + 'u003c')
legacy_html = (root / 'legacy/game-v1.html').read_text(encoding='utf-8')
legacy_payload = json.dumps(legacy_html, ensure_ascii=False).replace('<', chr(92) + 'u003c')
js = (root / 'game.js').read_text(encoding='utf-8').replace('/*__OPPORTUNITY_ENGINE__*/', (root / 'opportunity.js').read_text(encoding='utf-8')).replace('__GAME_DATA__', payload).replace('__LEGACY_HTML__', legacy_payload)
html = (root / 'template.html').read_text(encoding='utf-8').replace('/*__CSS__*/', (root / 'style.css').read_text(encoding='utf-8')).replace('/*__JS__*/', js)
(root / 'dist' / 'data.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / 'game.html'
out.write_text(html, encoding='utf-8')
print(out, len(html.encode('utf-8')), 'bytes')
