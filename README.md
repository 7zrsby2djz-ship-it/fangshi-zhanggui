# 坊市掌櫃

修仙坊市的店鋪推理遊戲。主角許衡（人稱許半兩）壽元只剩十八個月，靠看穿來客的真假、讀懂消息做生意，把靈石換成修為。

目前進度：**兩個月可玩**。第一個月 6 天、20 筆交易；第二個月 6 天、19 筆交易（跨月延續貨物、人情、消息、債務）。另有消息簿、執事堂告發、墨線物品圖示、NPC 墨線表情。

> ⚠️ 劇透警告：`content/deals.yaml` 裡寫著每筆交易的真相，`content/intel.yaml` 寫著每則消息的真假與後果。只想玩的人請不要先看。

## 怎麼玩

用瀏覽器打開 `dist/game.html`（單一檔案，手機直式為主）。

## 檔案結構

| 路徑 | 內容 |
| --- | --- |
| `content/meta.yaml` | 開局數值、目標、結局文字、真相標籤、考據頁 |
| `content/items.yaml` | 物品：性能欄、敘述欄、隱藏句 |
| `content/npcs.yaml` | 人物：境界、隱藏性情、稱呼、住處 |
| `content/news.yaml` | 晨報、聽雨樓消息單、偷聽、散客閒話 |
| `content/deals.yaml` | 二十筆交易（真相三層、台詞、線索、處置與後果） |
| `content/places.yaml` | 地點、回春堂、藥田、鐵老蔫、散客 |
| `content/events.yaml` | 早晨事件（釣魚、告發、退貨等） |
| `content/events.yaml` 的 `monthStart` | 每個月初一依上個月的事出現的卡片 |
| `content/intel.yaml` | 消息簿：每則消息怎麼得知、值多少、真假、賣出後的反應；坊市注意度；執事堂告發 |
| `game.js` / `style.css` / `template.html` | 遊戲程式與介面 |
| `build.py` | 把 content 與程式合成 `dist/game.html` |
| `dist/data.json` | 合併後的完整資料，方便閱讀或審核 |
| `tools/sim.js`, `tools/harness.py` | 自動試玩與數值模擬（Playwright） |

## 寫內容的慣例

- 交易、晨報、消息單、偷聽、攤位、藥田加 `month: 2` 就只在第二個月出現；`month: all` 每個月都在。
- 台詞可以加 `f:` 指定表情（neutral smile laugh cold angry shock sad cry uneasy think sweat smug）。說謊的人在沒有境界門檻的台詞上不要用會洩題的表情；微表情放在 `tells` 裡。
- 人物外觀在 `npcs.yaml` 的 `look`。

## 重新產生遊戲

```
pip install pyyaml
python3 build.py
```

## 協作流程（Claude 與 GPT 共用）

1. 先 pull 最新版本
2. 修改
3. commit（訊息寫清楚改了什麼）
4. push

只改 `content/` 的文字不需要動程式；改完執行 `build.py` 重新產生 `dist/`。

## 線索規則（審核用）

- 非誠實交易：3～5 條線索，分佈在至少 3 種管道（話術、數字、物品文本、消息、第三方、身體反應、鑑定）。
- 單一線索不能直接定案；每個破綻都有一個無辜的解釋。
- 誠實交易也帶 1～2 條看似可疑、實則無辜的線索。
- 編出來的說法「太完整」；真話有生活感的缺口。
