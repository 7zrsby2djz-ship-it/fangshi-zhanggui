#!/usr/bin/env python3
"""Build the single-file game: merge content YAML into data, inline CSS/JS into the template."""
import json, pathlib, re, sys, yaml
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
# 第一批外稿（改寫後）
b1 = L('batch1')
for pid, sps in b1['spots'].items():
    data['places'][pid]['spots'] = data['places'][pid].get('spots', []) + sps
data['events']['drift'] += b1['drift']
for k in ('staff',):
    assert not set(b1[k]) & set(data['shop'][k]), 'dup ' + k
    data['shop'][k].update(b1[k])
assert not set(b1['items']) & set(data['items']); data['items'].update(b1['items'])
assert not set(b1['deaths']) & set(data['deaths']); data['deaths'].update(b1['deaths'])
data['threads'] += b1['threads']
data['shop']['achievements'] += b1['achievements']
data['shop']['bonuses'].update(b1['bonuses'])
# 遺物接回事件（第二輪）
hk = L('relic_hooks')
for pid, sps in hk['spots'].items():
    data['places'][pid]['spots'] = data['places'][pid].get('spots', []) + sps
data['events']['drift'] += hk['drift']
_evAll = {e['id']: e for e in data['events']['drift'] + data['shop']['events']}
for eid, chs in hk['addChoices'].items():
    assert eid in _evAll and _evAll[eid].get('choices'), 'addChoices target missing ' + eid
    _evAll[eid]['choices'] += chs
_spAll = {sp['id']: sp for pl in data['places'].values() if isinstance(pl, dict) for sp in pl.get('spots', [])}
for sid, pt in hk['patchSpots'].items():
    d = _spAll[sid]['fx']['death']
    if isinstance(d, str): d = _spAll[sid]['fx']['death'] = {'id': d}
    d['unless'] = {'anyOf': [d['unless'], pt['deathUnless']]} if d.get('unless') else pt['deathUnless']
    if pt.get('saved'): d['savedIf'] = d.get('savedIf', []) + [{'need': pt['deathUnless'], 'text': pt['saved']}]
# 遺物不是鑰匙：成對反應、自己引來的事、數量門檻
data['relicReact'] = hk.get('reactions', {})
for p in data['relicReact'].get('pairs', []): assert p['a'] in data['items'] and p['b'] in data['items'], 'pair ' + p['id']
for a in data['relicReact'].get('attract', []): assert a['item'] in data['items'], 'attract ' + a['id']
# 遺物效果：每一件遺物都要有
rfx = L('relic_fx')
for rid, e in rfx.items():
    assert rid in data['items'], 'relic_fx unknown ' + rid
    for d in (e.get('carry') or {}).get('protect', {}): assert d in data['deaths'], 'relic protect unknown death ' + d
    data['items'][rid]['eff'] = e
_noeff = [k for k, v in data['items'].items() if v.get('cat') == 'relic' and 'eff' not in v]
assert not _noeff, 'relics without effect: ' + ','.join(_noeff)
print('relics with effects', sum(1 for v in data['items'].values() if v.get('eff')))
# 遺物防呆：每件都要「真的有作用」、保護的死法要真的會發生、要拿得到
_txt0 = json.dumps({k: v for k, v in data.items() if k != 'items'}, ensure_ascii=False)
_deathIds = set(re.findall(r'"death": ?\{"id": ?"(\w+)"', _txt0)) | set(re.findall(r'"death": ?"(\w+)"', _txt0)) | set(v['ascent'] for v in data['placeFx'].values())
_needHas = set(k for blk in re.findall(r'"has": ?\{([^}]*)\}', _txt0) for k in re.findall(r'"(\w+)"', blk))
_given = set(re.findall(r'"item": ?"(\w+)"', _txt0)) | set(b.get('give') for b in data['shop']['bonuses'].values() if isinstance(b, dict))
_SPECIAL = {'extraStep', 'safeReturn', 'reveal', 'lessStep', 'erase', 'truth', 'noSkim', None}
_onlyRandom = []
for rid, it in data['items'].items():
    e = it.get('eff')
    if not e: continue
    mech = any(e.get(k) for k in ('passive', 'carry', 'warn', 'night', 'use')) or rid in _needHas
    assert mech, 'relic has no mechanical effect: ' + rid
    for d in (e.get('carry') or {}).get('protect', {}): assert d in _deathIds, 'relic %s protects death that never happens: %s' % (rid, d)
    u = e.get('use')
    if u:
        assert u.get('special') in _SPECIAL, 'bad use.special ' + rid
        assert u.get('where', 'any') in ('any', 'out', 'shop') and u.get('once') in ('day', 'consume'), 'bad use ' + rid
        assert u.get('label') and u.get('desc'), 'use needs label/desc ' + rid
    if rid not in _given: _onlyRandom.append(rid)
_unref = [k for k, v in data['items'].items() if v.get('eff') and k not in _needHas]
print('relics not read by any event:', len(_unref), _unref)
print('relics: usable', sum(1 for v in data['items'].values() if (v.get('eff') or {}).get('use')), 'unlock something', len([k for k in data['items'] if k in _needHas and data['items'][k].get('eff')]), 'only random source', _onlyRandom)
_sp = [sp['id'] for pl in data['places'].values() if isinstance(pl, dict) for sp in pl.get('spots', [])]
assert len(_sp) == len(set(_sp)), 'duplicate spot id'
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
