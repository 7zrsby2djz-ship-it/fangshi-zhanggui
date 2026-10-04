"""O101第一個切片的嚴格建置契約；不接受未實作欄位或predicate。"""
FIELDS = {'id', 'title', 'customer', 'supplier', 'item', 'quantity', 'cost', 'sale', 'assetValue', 'sourceDay', 'saleDay', 'returnDelay', 'requiredIntel', 'returnIntel', 'replaces', 'batch', 'predicates', 'trip', 'source', 'service', 'fit', 'sold', 'report'}
PREDICATES = {'intelHeld', 'sourceSnapshotValid', 'fundsAtLeast', 'stateIs', 'withinWindow', 'stockOwned', 'receiptAbsent'}


def validate_opportunities(rows, data):
    if not isinstance(rows, list):
        raise ValueError('opportunities必須是清單')
    seen = set()
    for i, row in enumerate(rows):
        label = f'opportunities[{i}]'
        if not isinstance(row, dict) or set(row) != FIELDS:
            raise ValueError(f'{label}未知或缺少欄位')
        if type(row['id']) is not str or row['id'] != 'O101' or row['id'] in seen:
            raise ValueError(f'{label}非本包支援ID或重複ID')
        seen.add(row['id'])
        references = {'customer': 'han', 'supplier': 'tie', 'item': 'wax_wrap_set', 'returnIntel': 'i_opp101_return', 'replaces': 'd13', 'batch': 'O101_tie_M1D3_batch1'}
        for key, required in references.items():
            if type(row[key]) is not str or row[key] != required:
                raise ValueError(f'{label}.{key}不符合本輪契約')
        for key in ['quantity', 'cost', 'sale', 'assetValue', 'sourceDay', 'saleDay', 'returnDelay']:
            if type(row[key]) is not int or row[key] <= 0:
                raise ValueError(f'{label}.{key}須為正整數')
        for key in ['title', 'batch', 'trip', 'source', 'service', 'fit', 'sold', 'report']:
            if not isinstance(row[key], str) or not row[key]:
                raise ValueError(f'{label}.{key}須為非空字串')
        if row['customer'] not in data['npcs'] or row['supplier'] not in data['npcs'] or row['item'] not in data['items']:
            raise ValueError(f'{label}人物／物品參照不存在')
        if not isinstance(row['requiredIntel'], list) or len(row['requiredIntel']) != 2 or any(type(k) is not str for k in row['requiredIntel']) or set(row['requiredIntel']) != {'i_opp_rain', 'i_opp101_trip'} or any(k not in data['intel'] for k in row['requiredIntel']) or row['returnIntel'] not in data['intel']:
            raise ValueError(f'{label}消息參照不存在')
        if row['replaces'] not in {d['id'] for d in data['deals']}:
            raise ValueError(f'{label}替換交易不存在')
        predicates = row['predicates']
        if not isinstance(predicates, dict) or set(predicates) != {'prepare', 'sale'}:
            raise ValueError(f'{label}.predicates未知／缺欄位')
        expected = {'prepare': {'intelHeld', 'sourceSnapshotValid', 'fundsAtLeast', 'stateIs', 'withinWindow', 'receiptAbsent'}, 'sale': {'stateIs', 'withinWindow', 'stockOwned', 'receiptAbsent'}}
        for command, required in expected.items():
            values = predicates[command]
            if not isinstance(values, list) or any(type(p) is not str or p not in PREDICATES for p in values) or len(values) != len(set(values)) or set(values) != required:
                raise ValueError(f'{label}.predicates.{command}未知predicate或缺少必要保護')
        if (row['sourceDay'], row['saleDay'], row['returnDelay'], row['quantity'], row['cost'], row['sale'], row['assetValue']) != (3, 4, 2, 4, 24, 36, 16):
            raise ValueError(f'{label}偏離本輪核准O101規格')
