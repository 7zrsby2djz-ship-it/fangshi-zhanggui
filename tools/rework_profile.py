"""新局hantie採公克數量、每600公克計價；不遷移舊key。"""
def apply_rework_profile(data):
    def visit(node):
        if isinstance(node, list):
            for value in node:
                visit(value)
        elif isinstance(node, dict):
            if node.get('item') == 'hantie':
                for key in ['qty', 'lot']:
                    if type(node.get(key)) is int:
                        node[key] *= 600
            if node.get('needItem') == 'hantie':
                node['needQty'] *= 600
            if isinstance(node.get('has'), dict) and 'hantie' in node['has']:
                node['has']['hantie'] *= 600
            for value in node.values():
                visit(value)
    visit(data)
    data['items']['hantie']['unit'] = '公克'
    data['items']['hantie']['priceQty'] = 600
    data['items']['hantie']['priceUnit'] = '600公克'
    data['items']['hantie']['name'] = '鐵礦石'
    for row in data['meta']['startLots']:
        if row['item'] == 'hantie':
            row['label'] = '鐵礦石（父親留下的）'
    # 只改目前交易敘述的明確量詞，帳紙引用原文不改；其原單位只留歷史引文。
    replacements = {'十二塊一斤': '每六百公克十二塊', '十塊一斤': '每六百公克十塊', '九塊一斤': '每六百公克九塊', '八塊一斤': '每六百公克八塊', '六塊一斤': '每六百公克六塊', '四塊一斤': '每六百公克四塊', '二十斤': '十二公斤', '十斤': '六公斤', '五斤': '三公斤', '三斤': '一點八公斤'}
    for deal in data['deals']:
        if deal.get('item') != 'hantie':
            continue
        def text_visit(node):
            if isinstance(node, list):
                return [text_visit(v) for v in node]
            if isinstance(node, dict):
                return {k: text_visit(v) for k, v in node.items()}
            if isinstance(node, str):
                for old, new in replacements.items():
                    node = node.replace(old, new)
            return node
        deal.update(text_visit(deal))
    # 具體當下敘述／供應台詞；帳冊引文保持原文，不全域替換重量。
    for key in ['d12']:
        deal = next(d for d in data['deals'] if d['id'] == key)
        deal['opts']['special']['text'] = deal['opts']['special']['text'].replace('裡面是二十斤沒有印記的寒鐵', '裡面是十二公斤沒有印記的鐵礦石')
    data['events']['e_pkg']['cases'][0]['text'] = data['events']['e_pkg']['cases'][0]['text'].replace('是二十斤沒有印記的寒鐵', '是十二公斤沒有印記的鐵礦石')
    data['places']['smith']['commission']['say'] = data['places']['smith']['commission']['say'].replace('五斤寒鐵', '三公斤鐵礦石')
    data['items']['hantie']['text'] = data['items']['hantie']['text'].replace('每一斤都', '每一批都')
    for key in ['i_pkg_page', 'i2_iron']:
        data['intel'][key]['text'] = data['intel'][key]['text'].replace('二十斤', '十二公斤')
    # 當期盤點是現況；帳冊／往事引文仍保留舊單位。
    for row in data['news']['news']:
        if row['id'] == 'n2_iron':
            row['text'] = row['text'].replace('三百斤', '一百八十公斤')
    mine = next(d for d in data['deals'] if d['id'] == 'm218')
    mine['ask']['a'] = mine['ask']['a'].replace('一斤都不能動', '一點都不能動').replace('點貨少了三百斤', '點貨少了一百八十公斤')
    return data
