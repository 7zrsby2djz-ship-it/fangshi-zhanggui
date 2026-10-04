#!/usr/bin/env python3
"""W05 最小正反例：解析等值、重複鍵／ID拒絕、失敗build不覆寫產物。"""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

import yaml
from check_content import ROOT, check_ids, load_yaml


def rejects(action):
    try:
        action()
    except (yaml.YAMLError, ValueError):
        return
    raise AssertionError('錯誤資料應被拒絕')


def digest(value):
    # YAML 1.1 可將 off 等鍵解析成布林；先沿 build 的 JSON 轉換統一鍵型別。
    value = json.loads(json.dumps(value, ensure_ascii=False))
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--compare-baseline', action='store_true', help='僅W05使用：比較固定施工基底；後續內容移植自然會改變資料')
args = parser.parse_args()
if args.compare_baseline:
    baseline = json.loads((ROOT / 'tools/fixtures/w05_content_sha256.json').read_text(encoding='utf-8'))
    for path in sorted((ROOT / 'content').glob('*.yaml')):
        assert digest(load_yaml(path)) == baseline['content'][str(path.relative_to(ROOT))], path.name
data = json.loads((ROOT / 'dist/data.json').read_text(encoding='utf-8'))
if args.compare_baseline:
    assert digest(data) == baseline['data'], '完整 D 與 W05 基底必須等值'
assert next(d for d in data['deals'] if d['id'] == 'd19')['opts']['special']['seal'] == '還刀'
payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', chr(92) + 'u003c')
legacy_html = (ROOT / 'legacy/game-v1.html').read_text(encoding='utf-8')
legacy_payload = json.dumps(legacy_html, ensure_ascii=False).replace('<', chr(92) + 'u003c')
js = (ROOT / 'game.js').read_text(encoding='utf-8').replace('/*__OPPORTUNITY_ENGINE__*/', (ROOT / 'opportunity.js').read_text(encoding='utf-8') + '\n' + (ROOT / 'month2.js').read_text(encoding='utf-8')).replace('__GAME_DATA__', payload).replace('__LEGACY_HTML__', legacy_payload)
expected = (ROOT / 'template.html').read_text(encoding='utf-8').replace('/*__CSS__*/', (ROOT / 'style.css').read_text(encoding='utf-8')).replace('/*__JS__*/', js)
assert (ROOT / 'dist/game.html').read_text(encoding='utf-8') == expected, 'dist HTML 須與資料／JS／CSS完全同步'
if args.compare_baseline:
    print('通過：8份YAML解析等值，完整D與W05基底一致')
print('通過：還刀值保留，dist與原碼同步')

with tempfile.TemporaryDirectory(prefix='fangshi-w05-') as directory:
    temporary = pathlib.Path(directory)
    duplicate = temporary / 'duplicate.yaml'
    duplicate.write_text('nested:\n  seal: 舊值\n  seal: 新值\n', encoding='utf-8')
    rejects(lambda: load_yaml(duplicate))
    rejects(lambda: check_ids([{'id': 'same'}, {'id': 'same'}], 'deals.deals'))
    shutil.copy(ROOT / 'build.py', temporary)
    (temporary / 'tools').mkdir()
    shutil.copy(ROOT / 'tools/check_content.py', temporary / 'tools')
    for name in ['opportunity_schema.py', 'month2_schema.py', 'rework_profile.py']:
        shutil.copy(ROOT / 'tools' / name, temporary / 'tools')
    shutil.copytree(ROOT / 'content', temporary / 'content')
    (temporary / 'dist').mkdir()
    for name in ['game.html', 'data.json']:
        (temporary / 'dist' / name).write_bytes(b'W05 preserve artifact')
    deals = (ROOT / 'content/deals.yaml').read_text(encoding='utf-8')
    for invalid, message in [(deals + '\n  duplicate: 1\n  duplicate: 2\n', '重複 YAML 鍵'), (deals + '\n- id: d01\n', '重複 ID')]:
        (temporary / 'content/deals.yaml').write_text(invalid, encoding='utf-8')
        result = subprocess.run([sys.executable, str(temporary / 'build.py')], capture_output=True, text=True)
        assert result.returncode != 0, '錯誤build必須失敗'
        assert message in result.stderr, '必須由重複鍵／ID檢查拒絕，不是其他故障'
        for name in ['game.html', 'data.json']:
            assert (temporary / 'dist' / name).read_bytes() == b'W05 preserve artifact'
print('通過：巢狀重複鍵／重複deal ID均拒絕，兩種失敗build皆未覆寫產物')
