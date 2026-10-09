#!/usr/bin/env python3
"""Build the single-file game: merge content YAML into data, inline CSS/JS into the template."""
import json, pathlib, sys, yaml
root = pathlib.Path(__file__).parent
c = root / 'content'
L = lambda n: yaml.safe_load((c / f'{n}.yaml').read_text(encoding='utf-8'))
meta = L('meta')
data = {
    'meta': meta['meta'], 'intro': meta['intro'], 'kaozheng': meta['kaozheng'], 'endings': meta['endings'],
    'items': L('items'), 'npcs': L('npcs'), 'news': L('news'), 'deals': L('deals')['deals'],
    'places': {**L('places')['places'], **{k: v for k, v in L('places').items() if k != 'places'}},
    'events': {**L('events')['events'], 'monthStart': L('events').get('monthStart', {}), 'drift': L('events').get('drift', [])},
    'intel': L('intel')['intel'], 'heat': L('intel')['heat'], 'accuse': L('intel')['accuse'],
    'shop': L('shop'), 'deaths': L('deaths')['deaths'], 'threads': L('deaths')['threads'],
}
# 擴充：探索地點的新地方、第六／七層、散事
more = L('places_more')
data['placeFx'] = more['placeFx']
for pid, sps in more['spots'].items():
    data['places'][pid]['spots'] = data['places'][pid].get('spots', []) + sps
data['places'].update(more['places'])
data['events']['drift'] = data['events']['drift'] + L('events_more')['drift']
# 檢查：所有 death id 都有定義
import re as _re
_txt = json.dumps(data, ensure_ascii=False)
_found = set(_re.findall(r'"death": ?\{"id": ?"(\w+)"', _txt))
print('deaths defined', len(data['deaths']), 'referenced', len(_found | set(v['ascent'] for v in data['placeFx'].values())))
for _id in _found | set(v['ascent'] for v in data['placeFx'].values()):
    assert _id in data['deaths'], 'missing death ' + _id
_ids = [e['id'] for e in data['events']['drift']] + [e['id'] for e in data['shop']['events']]
assert len(_ids) == len(set(_ids)), 'duplicate event id'
data['meta']['truthLabels'] = meta['truthLabels']
payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
js = (root / 'game.js').read_text(encoding='utf-8').replace('__GAME_DATA__', payload)
html = (root / 'template.html').read_text(encoding='utf-8').replace('/*__CSS__*/', (root / 'style.css').read_text(encoding='utf-8')).replace('/*__JS__*/', js)
(root / 'dist' / 'data.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / 'game.html'
out.write_text(html, encoding='utf-8')
print(out, len(html.encode('utf-8')), 'bytes')
