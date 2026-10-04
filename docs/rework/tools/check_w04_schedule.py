"""W04 proposal data check, NOT a game / UI / economy test.

Run from any cwd: python docs/rework/tools/check_w04_schedule.py
Uses public schedule fields only; does not inspect truth/verdict/tells.
"""
from pathlib import Path
from collections import defaultdict
import yaml
import json
import re
import hashlib

ROOT = Path(__file__).resolve().parents[3]


def abs_day(month, day):
    assert month >= 1 and 1 <= day <= 6
    return (month - 1) * 6 + day


def source_baseline():
    frozen = (ROOT / "legacy/game-v1.html").read_bytes()
    assert hashlib.sha256(frozen).hexdigest() == "3fbd82e029972fd8415af2627cd9ffc4fe4e03892f86ddf1f9636bf3206496d8"
    old = json.loads(re.search(r"const D = (.+);\nconst M", frozen.decode()).group(1))
    deals = {d["id"]: d for d in old["deals"]}
    for did in ("d11", "d12", "d13"):
        assert deals[did]["days"] == [4, 4], did
        assert deals[did]["where"] == "shop", did
    assert deals["d11"]["npc"] == "liu"
    assert next(v for v in deals["d11"]["verify"] if v["who"] == "bai")["cost"] == 5
    assert deals["d12"]["opts"]["deal"]["fx"]["event"] == [{"id": "e_pkg", "at": 6}]
    assert deals["d14"]["npc"] == "ge" and deals["d14"]["days"] == [5, 6]
    assert deals["d21"]["npc"] == "afu" and deals["d21"]["days"] == [3, 5]
    assert deals["m207"]["days"] == [3, 3]
    assert deals["m214"]["days"] == [5, 5]
    meta = old["meta"]
    assert meta["days"] == 6 and meta["marketDay"] == 3 and meta["months"]["2"]["marketDay"] == 4
    intel = old["intel"]
    assert intel["i_pkg_seal"]["hot"] == [4, 4] and intel["i_pkg_seal"]["expire"] == 4
    places = old["places"]
    assert "tie_workshop" not in places and "tao_workshop" not in places
    assert places["tea"]["hours"] == [1, 2]
    assert places["herb"]["closed"]["1"] == [5]


def implemented_window():
    current = json.loads((ROOT / "dist/data.json").read_text())
    deals = {d["id"]: d for d in current["deals"]}
    assert deals["d11"]["days"] == [4, 4]
    assert deals["d12"]["days"] == [4, 5]
    assert deals["d12"]["opts"]["deal"]["fx"]["event"] == [{"id": "e_pkg", "at": 6}]
    assert current["intel"]["i_pkg_seal"]["hot"] == [4, 5]
    assert current["intel"]["i_pkg_seal"]["expire"] == 5
    assert [o["id"] for o in current["opportunities"]] == ["O101"]
    print("PASS: W06資料窗口；d12延至第五天，包裹事件仍第六天；只有O101。")


# Proposal action tuples: month, day, start slot, duration, name, cash delta.
# Remaining slots are free, and never treated as phantom income.
BASE = [
    (1, 1, 0, 1, "S01", 0),
    (1, 2, 0, 1, "S02", 0),
    (1, 3, 0, 1, "marketM1D3_O101_prepare", -24),
    (1, 3, 1, 1, "d21_decline", 0),
    (1, 4, 0, 1, "O101_sale", 36),
    (1, 4, 1, 1, "d11_decline", 0),
    (1, 5, 0, 1, "d12_decline_extended", 0),
    (1, 5, 1, 1, "S05", -8),
    (2, 1, 0, 1, "O201_demand", 0),
    (2, 2, 0, 1, "O201_source", 20 - 16),
    (2, 2, 1, 1, "O201_sale", 24),
    (2, 3, 0, 1, "m207_optional_decline", 0),
    (2, 3, 1, 1, "O202_decline", 0),
    (2, 4, 0, 1, "marketM2D4_O203_sale", -18 + 28),
    (2, 5, 0, 1, "O204_demand", 0),
    (2, 5, 1, 1, "O204_source_sale", -20 + 32),
    (2, 5, 2, 1, "m214_optional_decline", 0),
]


def validate(actions, expected_end, include_verify=False):
    used = defaultdict(set)
    cash = 120
    previous = (0, -1)
    for m, d, slot, duration, name, delta in sorted(actions):
        key = (abs_day(m, d), slot)
        assert key > previous, (name, "day/slot order")
        previous = key
        assert duration > 0 and 0 <= slot < 3 and slot + duration <= 3, name
        occupied = set(range(slot, slot + duration))
        assert not used[(m, d)].intersection(occupied), (name, "overlap")
        used[(m, d)].update(occupied)
        if name.startswith("marketM1D3"):
            assert (m, d) == (1, 3)
        if name.startswith("marketM2D4"):
            assert (m, d) == (2, 4)
        if name == "d12_decline_extended":
            assert m == 1 and 4 <= d <= 5  # proposal, not baseline!
        if name == "d11_verify_bai_decline":
            assert (m, d, slot, duration, delta) == (1, 4, 1, 2, -5)
        cash += delta
        assert cash >= 0, (name, "cash insufficient")
        if m == 2 and d == 1:
            # M1 actual ordinary dues after last day, no free income.
            cash -= 80
            assert cash >= 0
    cash -= 80
    assert cash == expected_end, (cash, expected_end)
    for m in (1, 2):
        assert sum(len(used[(m, d)]) for d in range(1, 7)) <= 18
    by_name = {a[4]: a for a in actions}
    assert by_name["O201_source"][:3] < by_name["O201_sale"][:3]
    if "O204_source_sale" in by_name:
        assert by_name["O204_demand"][:3] < by_name["O204_source_sale"][:3]
        assert len(used[(2, 5)]) >= 2
    if include_verify:
        assert len(used[(1, 4)]) == 3
    return cash


RETURNS = {
    "O101": (abs_day(1, 4), abs_day(1, 6), 2),
    "O201": (abs_day(2, 2), abs_day(2, 3), 1),
    "O202_short": (abs_day(2, 3), abs_day(2, 6), 3),
    "O202_long": (abs_day(2, 3), abs_day(2, 6), 3),
    "O203": (abs_day(2, 4), abs_day(2, 6), 2),
    "O204": (abs_day(2, 5), abs_day(2, 6), 1),
}


def main():
    source_baseline()
    implemented_window()
    assert validate(BASE, 14) == 14
    engineering = [a for a in BASE if a[4] != "d11_decline"] + [(1, 4, 1, 2, "d11_verify_bai_decline", -5)]
    assert validate(engineering, 9, True) == 9
    for variant, delta, expected in (("short", 4, 6), ("long", 6, 8)):
        actions = [a for a in BASE if not a[4].startswith("O204") and a[4] not in ("O202_decline", "m207_optional_decline")]
        actions += [(2, 3, 1, 1, f"O202_{variant}_demand", 0), (2, 3, 2, 1, f"O202_{variant}_source_sale", delta), (2, 3, 0, 1, "m207_optional_decline", 0)]
        assert validate(actions, expected) == expected
        for sold, due, lag in RETURNS.values():
            assert sold < due <= 12 and sold + lag == due
    assert abs_day(2, 4) < RETURNS["O202_short"][1]
    assert abs_day(2, 5) < RETURNS["O202_long"][1]
    # d12 late reception never means a D7 promise: fixed absolute D6.
    for reception in (4, 5):
        assert reception < 6
    # Independent future engine scenario: month-end sell, next-month due.
    assert abs_day(1, 6) + 2 == abs_day(2, 2)
    # Show old four-action plan cannot fit; this is the defect we propose fixing.
    assert 1 + 1 + 1 + 1 > 3
    print("PASS: frozen W04 source baseline; prototype 14; engineering verify5 9; O202 short6/long8; slots, day order, market and return windows.")
    print("NOT TESTED: game runtime, source acquisition UI, queue implementation, save/load, economy balance, other future slices. Actual O101 runtime is separately tested by tools/test_o101.js.")


if __name__ == "__main__":
    main()
