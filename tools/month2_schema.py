"""W08 exact data contract; candidate gate is immutable build data, never a save flag."""
FIELDS = {'id','title','customer','supplier','item','quantity','cost','sale','assetValue','sourceDay','saleDay','returnDelay','requiredIntel','returnIntel','replaces','batch','place','gate','source','service','fit','sold','report'}
SPECS = {
 'O201': ('kuang','tie','cover_steel_buckle',4,16,24,8,8,1,'m218','tie_workshop',True),
 'O202': ('aheng','tie','wax_wrap_set',1,6,10,9,9,3,None,'tie_workshop',False),
 'O203': ('han','tao','jug_frame_sleeve',2,18,28,10,10,2,'m220','market',True),
 'O204': ('aheng','tao','sample_tool_set',1,20,32,11,11,1,None,'tao_workshop',True),
}
REQUIRED = {'O201':['i_opp201_spec'], 'O202':['i_opp202_constraints'], 'O203':['i_opp203_jug_need'], 'O204':['i_opp204_scope','i_opp204_old_sample']}
SCENES = {'s07': {'open','reputation','public','spec','address','accept','decline'}, 's09': {'open','reputation','public','constraints','compare','decline','stop'}, 's11': {'open','scope','accept','decline'}, 'jug': {'need','literal','address'}}
def validate_month2(d, data):
 if not isinstance(d,dict) or set(d) != {'version','offers',*SCENES} or type(d['version']) is not int or d['version'] != 1:
  raise ValueError('month2 未知／缺少欄位或版本')
 if not isinstance(d['offers'],dict) or set(d['offers']) != set(SPECS): raise ValueError('month2 四案集合不完整')
 keys=['customer','supplier','item','quantity','cost','sale','sourceDay','saleDay','returnDelay','replaces','place','gate']
 for id, spec in SPECS.items():
  row=d['offers'][id]
  if not isinstance(row,dict) or set(row) != FIELDS or row['id'] != id: raise ValueError('month2.'+id+' 未知／缺少欄位')
  if tuple(row[k] for k in keys) != spec or type(row['gate']) is not bool or row['assetValue'] != (4 if id == 'O202' else 0): raise ValueError('month2.'+id+' 規格／核准門檻無效')
  for k in ['quantity','cost','sale','assetValue','sourceDay','saleDay','returnDelay']:
   if type(row[k]) is not int: raise ValueError('month2 金額／期限需整數')
  if row['customer'] not in data['npcs'] or row['supplier'] not in data['npcs'] or row['item'] not in data['items'] or row['place'] not in data['places']: raise ValueError('month2 人物／物品／場所參照不存在')
  if row['replaces'] and row['replaces'] not in {r['id'] for r in data['deals']}: raise ValueError('month2 替換交易不存在')
  if row['returnIntel'] != 'i_opp'+id[1:]+'_return' or row['returnIntel'] not in data['intel'] or not isinstance(row['requiredIntel'],list) or any(type(k) is not str for k in row['requiredIntel']) or row['requiredIntel'] != REQUIRED[id] or any(k not in data['intel'] for k in row['requiredIntel']): raise ValueError('month2 消息參照錯誤')
  if row['batch'] != id+'_'+row['supplier']+'_M2D'+str(row['sourceDay']-6)+'_batch1': raise ValueError('month2 批次錯誤')
  for k in ['title','source','service','fit','sold','report']:
   if not isinstance(row[k],str) or not row[k].strip(): raise ValueError('month2 文字不得缺少')
 for scene, fields in SCENES.items():
  if not isinstance(d[scene],dict) or set(d[scene]) != fields or any(not isinstance(v,str) or not v.strip() for v in d[scene].values()): raise ValueError('month2.'+scene+' 段落錯誤')
