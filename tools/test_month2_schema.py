#!/usr/bin/env python3
import copy
from check_content import ROOT, load_yaml
from month2_schema import validate_month2
content=ROOT/'content'
d=load_yaml(content/'month2.yaml')
data={'items':load_yaml(content/'items.yaml'),'npcs':load_yaml(content/'npcs.yaml'),'intel':load_yaml(content/'intel.yaml')['intel'],'deals':load_yaml(content/'deals.yaml')['deals'],'places':load_yaml(content/'places.yaml')['places']}
validate_month2(d,data)
for mutate in [
 lambda x:x['offers']['O201'].update(requiredIntel=['i_vein_false']),
 lambda x:x['offers']['O204'].update(requiredIntel=['i_opp204_scope']),
 lambda x:x['offers']['O202'].update(gate=True),
 lambda x:x['offers']['O201'].update(cost=True),
 lambda x:x['offers']['O204'].update(requiredIntel=[{}]),
 lambda x:x['offers']['O201'].update(batch='O101_tie_M1D3_batch1'),
 lambda x:x['offers']['O203'].update(unhandled=True),
 lambda x:x['s11'].pop('scope'),
]:
 bad=copy.deepcopy(d);mutate(bad)
 try:validate_month2(bad,data)
 except ValueError:pass
 else:raise AssertionError('month2錯誤資料未被拒絕')
print('通過：精確四案schema；已存在卻錯案intel/缺scope樣片一項/gate偷開/布林金額/非字串線頭/舊批次/未知欄位/缺正文均拒絕')
