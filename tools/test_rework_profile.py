#!/usr/bin/env python3
"""W06 公制數字逐項對照及 O101 schema 最小正反例；不是遊戲流程測試。"""
import copy
import json
from pathlib import Path
from check_content import load_yaml
from opportunity_schema import validate_opportunities
from rework_profile import apply_rework_profile

ROOT = Path(__file__).resolve().parents[1]
L = lambda name: load_yaml(ROOT / 'content' / f'{name}.yaml')
meta = L('meta')
raw = {'meta': meta['meta'], 'intro': meta['intro'], 'kaozheng': meta['kaozheng'], 'endings': meta['endings'],
       'items': L('items'), 'npcs': L('npcs'), 'news': L('news'), 'deals': L('deals')['deals'],
       'places': {**L('places')['places'], **{k: v for k, v in L('places').items() if k != 'places'}},
       'events': {**L('events')['events'], 'monthStart': L('events').get('monthStart', {})},
       'intel': L('intel')['intel'], 'heat': L('intel')['heat'], 'accuse': L('intel')['accuse'],
       'opportunities': L('opportunities')['opportunities']}
raw['month1'] = L('month1')
raw['meta']['truthLabels'] = meta['truthLabels']
converted = apply_rework_profile(copy.deepcopy(raw))
assert json.loads(json.dumps(converted)) == json.loads((ROOT / 'dist/data.json').read_text()), '建置D須等於profile產物'
changed = []

def numeric_check(before, after, trail='', scale=False):
    if isinstance(before, dict):
        for key, value in before.items():
            quantity = before.get('item') == 'hantie' and key in ('qty', 'lot') or before.get('needItem') == 'hantie' and key == 'needQty' or scale and key == 'hantie'
            numeric_check(value, after[key], trail + '.' + str(key), quantity if isinstance(value, (int, float)) else key == 'has')
    elif isinstance(before, list):
        assert len(before) == len(after)
        for index, value in enumerate(before): numeric_check(value, after[index], trail + f'[{index}]')
    elif type(before) in (int, float):
        assert after == before * (600 if scale else 1), (trail, before, after)
        if scale: changed.append(trail)

numeric_check(raw, converted)
assert len(changed) >= 10
assert converted['meta']['startLots'][0]['qty'] == 6000
assert converted['items']['hantie']['priceQty'] == 600 and converted['items']['hantie']['base'] == raw['items']['hantie']['base']
assert converted['places']['smith']['commission']['needQty'] == 3000
assert converted['places']['smith']['commission']['fee'] == raw['places']['smith']['commission']['fee'] == 10
# 歷史引文保留；當下盤點與包裹消息改成一致公制。
assert '三百斤' in converted['items']['zhangce']['text']
assert '十二公斤' in converted['intel']['i_pkg_page']['text']
assert '一百八十公斤' in next(n for n in converted['news']['news'] if n['id'] == 'n2_iron')['text']
print(f'通過：{len(changed)}個hantie qty／lot／needQty／has數值逐項×600；其餘所有原有數值包含價、cost、fee、罰款均相同；公制D同步')

validate_opportunities(raw['opportunities'], raw)
mutations = [lambda o: o.update(extra=True), lambda o: o.update(id=[]), lambda o: o.update(customer={}),
             lambda o: o.update(item='bishui'), lambda o: o.update(requiredIntel=['i_opp_rain', 'i_opp_rain']),
             lambda o: o.update(requiredIntel=['i_opp_rain', 'i_vein_false']), lambda o: o.update(cost=25),
             lambda o: o['predicates']['prepare'].append('unimplemented'), lambda o: o['predicates'].update(prepare=[{}]),
             lambda o: o['predicates'].update(sale=[]), lambda o: o.update(returnIntel='i_vein_false')]
for mutate in mutations:
    bad = copy.deepcopy(raw['opportunities']); mutate(bad[0])
    try: validate_opportunities(bad, raw)
    except ValueError: pass
    else: raise AssertionError('未知／錯型別／契約不符資料應拒絕')
print('通過：11種O101未知欄位／predicate／型別／錯參照／缺條件／重複消息均明確拒絕')
