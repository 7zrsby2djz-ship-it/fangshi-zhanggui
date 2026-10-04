#!/usr/bin/env python3
"""檢查 content YAML 重複鍵及各 ID 命名空間的唯一性。"""
import argparse
import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent


class UniqueKeyLoader(yaml.SafeLoader):
    def construct_mapping(self, node, deep=False):
        self.flatten_mapping(node)
        seen = {}
        for key_node, _ in node.value:
            key = self.construct_object(key_node, deep=deep)
            if key in seen:
                raise yaml.constructor.ConstructorError(
                    '第一次出現的鍵', seen[key], f'重複 YAML 鍵：{key}', key_node.start_mark)
            seen[key] = key_node.start_mark
        return super().construct_mapping(node, deep=deep)


def load_yaml(path):
    with pathlib.Path(path).open(encoding='utf-8') as stream:
        return yaml.load(stream, Loader=UniqueKeyLoader)


def check_ids(rows, label):
    seen = set()
    for index, row in enumerate(rows):
        ident = row.get('id') if isinstance(row, dict) else None
        if not isinstance(ident, str) or not ident.strip():
            raise ValueError(f'{label}[{index}] 缺少非空字串 ID')
        if ident in seen:
            raise ValueError(f'{label}[{index}] 重複 ID：{ident}')
        seen.add(ident)
    return len(seen)


def check_content(root=ROOT):
    content = pathlib.Path(root) / 'content'
    docs = {p.stem: load_yaml(p) for p in sorted(content.glob('*.yaml'))}
    counts = {name: len(docs[name]) for name in ('items', 'npcs')}
    for name, key in [('deals', 'deals'), ('news', 'news'), ('intel', 'accuse')]:
        counts[key] = check_ids(docs[name][key], f'{name}.{key}')
    # 物品／NPC／消息／事件／場所的字典 key 就是 ID，已由 loader 驗唯一。
    for name, key in [('intel', 'intel'), ('events', 'events'), ('places', 'places')]:
        counts[key] = len(docs[name][key])
    if 'opportunities' in docs:
        if __package__:
            from .opportunity_schema import validate_opportunities
        else:
            from opportunity_schema import validate_opportunities
        rows = docs['opportunities']['opportunities']
        counts['opportunities'] = check_ids(rows, 'opportunities')
        validate_opportunities(rows, {'items': docs['items'], 'npcs': docs['npcs'], 'intel': docs['intel']['intel'], 'deals': docs['deals']['deals']})
    if 'month1' in docs:
        scenes = docs['month1']
        expected = {'s02': {'open', 'oreHeld', 'oreGone', 'life', 'drying', 'rainRead', 'end', 'stop'},
                    's05': {'open', 'lifeKnown', 'lifeUnknown', 'inspect', 'haggle', 'all', 'whole', 'rejectUnopened', 'reject'}}
        if not isinstance(scenes, dict) or set(scenes) != {'version', 's02', 's05'} or scenes['version'] != 1:
            raise ValueError('month1 必須明確使用 version 1、s02、s05')
        for scene, fields in expected.items():
            if not isinstance(scenes[scene], dict) or set(scenes[scene]) != fields or any(not isinstance(v, str) or not v.strip() for v in scenes[scene].values()):
                raise ValueError(f'month1.{scene} 段落缺漏／未知欄位／非文字')
        if 'dry_mint_leaf' not in docs['items'] or 'i_opp_han_short_intent' not in docs['intel']['intel']:
            raise ValueError('month1 缺少薄荷品項或實讀生活消息')
    return len(docs), counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=pathlib.Path, default=ROOT)
    parser.add_argument('--yaml', type=pathlib.Path, action='append', default=[], help='另外檢查 YAML 重複鍵；可重複使用')
    args = parser.parse_args()
    try:
        number, counts = check_content(args.root)
        for path in args.yaml:
            load_yaml(path)
    except (yaml.YAMLError, ValueError, OSError) as exc:
        print(exc, file=sys.stderr)
        return 1
    print(f'通過：{number} 份 content YAML，額外 {len(args.yaml)} 份 YAML；ID 數量 {counts}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
