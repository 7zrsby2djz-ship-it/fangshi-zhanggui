# 坊市掌櫃

> 災後台灣版本正在工作分支 `rework/taiwan-m1m2-sol` 製作。協作者先讀 [docs/rework/START_HERE.md](docs/rework/START_HERE.md)，再完整讀主企劃與補充A；下方說明仍是原版遊戲。十二幕原型已通過，後續實作依工作包逐一驗收，不從聊天自行續寫。

工作分支已完成W07第一月移植：`dist/game.html`可開新故事，亦內附原版入口，新舊進度分開保存。第二天讀報及生活相遇、第三天市場確認需求與現貨、第四天O101試包成交、第五至第六天薄荷驗貨議價、第六天實讀回報。保留拒絕與查證分支；第五天行程排滿時薄荷可延第六天。第二月仍待W08，核心測試通過不代表瀏覽器畫面或平衡已驗收，詳見 [W07交付](docs/rework/W07_IMPLEMENTATION.md)。

下載本分支的`dist/game.html`後，可用Chrome開啟單檔遊戲；GitHub檔案頁顯示的是原碼，點Raw／下載後再開啟。

修仙坊市的店鋪推理遊戲。主角許衡（人稱許半兩）壽元只剩十八個月，靠看穿來客的真假、讀懂消息做生意，把靈石換成修為。

目前進度：**兩個月可玩**。第一個月 6 天、20 筆計分交易；第二個月 6 天、20 筆計分交易（跨月延續貨物、人情、消息、債務）。另有消息簿、執事堂告發、墨線物品圖示、NPC 墨線表情。

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
| `content/deals.yaml` | 42筆交易資料列（兩月各20筆計分，另有額外路由）（真相三層、台詞、線索、處置與後果） |
| `content/places.yaml` | 地點、回春堂、藥田、鐵老蔫、散客 |
| `content/events.yaml` | 早晨事件（釣魚、告發、退貨等） |
| `content/month1.yaml` | 新故事第一月S02生活與S05薄荷的分段文字 |
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
