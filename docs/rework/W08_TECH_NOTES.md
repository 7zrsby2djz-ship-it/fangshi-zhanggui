# W08 技術交付記錄

2026-10-04。6.1 SOL 實作方記錄；配合統籌的 W08_IMPLEMENTATION 使用。核心已建置到 `dist/game.html`；本文件不授權 O202 候選正文，不代表真人遊玩或經濟平衡驗收。本輪實作方未 commit／push。

## 資料與接入

`content/month2.yaml` 存四案契約、來源／服務／試合／成交／回報文字及 S07、S09、S11 分段文字。`month2.js` 由 `build.py` 接在 `opportunity.js` 後，與 `game.js` 共用 closure。`game.js` 接入新局、載入、店內相遇、場所、按鈕及摘要；`opportunity.js` 保留 O101 行為，將 `validateRecord(record, offer)` 泛化，並接第二月 scan／tick／summary／專用貨資產估值。

`content/items.yaml` 新增三項普通商品；`intel.yaml` 的新消息以指定閱讀 trigger 取得。`places.yaml` 新增兩工坊，但 UI 仍須本人實聽地址才能進入。第二月舊案及相連消息／回流只改必要語感、角色／機構稱呼與觀察口徑；原真假、前提、答案、效果、數值及旗標保留。

| 案 | 正常版本 | 成本／收入 | 行動與實際試合 |
| --- | --- | --- | --- |
| O201 | 開放；替 m218 | 16／24 | S07 實量並問地址；M2D2 工坊一格先買四扣，再顧店一格用阿岳空架試；不合不售、已買不退款 |
| O202 | 關閉；S09 正式可比較及拒接 | 候選短程 6／10；過夜 12／18 | 隔離測試才啟用；需求一格＋工坊一格；先短試再買，與 O204 擇一 |
| O203 | 開放；替 m220 | 18／28 | M2D4 同次市場一格；先用兩壺試套，合用才買並成交 |
| O204 | 開放 | 20／32 | M2D5 店內需求一格＋陶工坊一格；先試普通 40 公分木夾與 250 毫升罐，再買並成交 |

S08 普通原礦另售 2000 公克／收入 20，是 `m2OreSale(lotId)` 的獨立收據，不抵四扣成本、不加工原礦換扣件。只可售已知、普通、足量、品質符合且非受保護／涉案批次；不將未知原成本算成 20 利潤。

## 來源、交易與期限接口

`m2Scan` 依精確消息前提及日窗開案；`m2Source` 寫本次供貨快照：`batch/session/day/item/quantity/cost`。`m2SourceValid` 要求目前仍在該供應點、正確當日及相同 `place.session`；實聽地址只開入口，不代替看到現貨。O202 新兩份布繩使用自己批次，不借 O101 舊貨或推定玩家曾做那筆買賣。

`m2Fit` 對 O202／O203／O204 可在尚未購買時試合；換訪次會清除未購貨的試合。O201 必須先備貨再回店試架。`m2Prepare` 一次扣成本並填專用 stock；`m2Sale` 一次收買家款、清專用 stock、寫到期日，不在成交文字再付一次成本。資金不足、沒有當次來源、缺消息、未試合、過期或互斥都不付款。

O202／O203／O204 採同訪付款交物。備貨前與後有明示：買後離場不能接回同單，當日重訪也不能沿用原購貨 session 成交；日末未售轉普通、退款 0。在現場存讀仍可繼續。這是本包明確限制，未擴成跨訪重新承接交易。

`m2Reject`／`m2Dispose` 區分不合與失約。未售只轉普通 lot 一次，保留 `totalCost`、`reservationOrigin`，清專用 stock、不返現。新三項商品 `base: 0` 且無普通買家清單，表示行情與買家未定；不保證再售或虛增資產。候選布轉普通後沿既有普通蠟布參考值，短程 4、過夜 8；prepared 專用報價目前短程 assetValue 為 0、過夜為 8，屬待平衡工作估值。參考值不是新增現金，專用與普通貨不重算。

`m2Tick` 在日末處理未售、在到期日送持久 inbox；`m2ReadReturn` 須 sale、到期且已送達，實讀才 settled／記消息。回報 0 款、0 新貨，重讀不重領。第二月月結摘要仍可實讀尚未讀的回報。

## 相遇、知識與行動格

`m2StartEncounter` 保留 M2D3 單日 m207 優先；正常驗收依第一月實際所知如實回答，不以「沒見過」略掉舊 50 後果。S11 僅在已知陶工坊地址、至少剩兩格且未接候選 O202 時先排；最後一格且 m214 尚未服務時保留單日舊客。m214 已處理後最後格可聽 S11，但不能答應免費外出。

S07 規格／地址、S09 比較／拒接、S11 範圍／舊樣片均逐步實讀。未做或未讀 O101 回報的玩家使用公開需求入口，不補共同經驗或口碑。m213 資源組織採購及 m219 小滿藥行驗貨仍獨立。

`m2JugAction('literal')` 實看壺底才記 `2029.12`／換內膽，沒有日；O204 回報實讀才見 `2029/12/31`。兩邊皆真已見才比較同年同月，不補製造日期、同批或災變因果。約 1 公分舊片與約 2 公分新片分開；壺、片、便當盒、舊扣、乾糧／衣物均是他人的物品，不進玩家庫存。

## 存檔、原子收據與舊檔

仍是新故事 `v: 2`、`storyVersion: taiwan-m1m2-v1`、原有獨立存檔 key；新增 `monthTwoVersion: 1` 及 `monthTwo`，包含三場景狀態、兩地址、候選行程、原礦收據、兩舊案歷史與刻文觀察。`opportunities` 精確含 O101 和四個第二月 record。

每 record 精確欄位為 `id/state/discoveredAt/preparedAt/soldAt/dueAbs/quote/source/stock/receipts/inbox/fitConfirmed/revision`。收據僅允許 `prepare/sale/return_deliver/return_read/disposition/decline`，各自驗 ID、日期及階段集合；quote、source、stock、inbox 也逐層驗精確欄位／型別／資料值。

`validateMonthTwo` 再驗期限、已讀消息、地址、實聽需求、轉貨來源、刻文與收據一致、O202／O204 互斥及舊 active encounter。未知版本／狀態／欄位、部分新欄位、布林金額、偽造批准、候選存檔讀入正式 gate 都拒絕並保留原始檔，不自行刪掉矛盾資料。

`migrateMonthTwo` 僅接受整組第二月欄位都不存在、僅有 O101 的 W07 v2，補無聲預設；載入遷移不寫存檔，不加錢貨消息。舊 active m218／m220 保原價款、貨與既有事件續完，完成後標 legacy completed。已 completed 不補新回憶；missed／na 不當完成。新局入口／錯過／計分抑制被替代舊案，每月正常計分 18 筆；既有答案及財務不重平衡。

action 沿 `actionTransaction`／`strictPersist` 的快照回滾：驗證或寫入失敗恢復 cash、lot、receipt、session、UI 狀態，再試不重領。原礦、備貨、售貨、轉貨、實讀的落盤失敗都逐項驗；不以提前更新內存或補錢救過驗收。

## O202 不可存檔改寫的門檻

`D.month2.offers.O202.gate` 固定 false，沒有正常 UI 的批准按鈕，也不從存檔接受批准旗標。S09 核准的比較與拒接完整可玩。短程及過夜僅為 review／W04 候選資料與受 gate 的工程接口，不能稱一般玩家正常完成四案。

`tools/test_o101.js` 的 harness 額外接受明標 fixture；`test_w08.js` 在隔離 VM 的建置資料中暫改 gate true 驗兩方案，未持久化產品開關。這類存檔重新交正式 gate false 會拒讀。候選測試與正常兩月來源／資金／格數路線分開。

## 驗證與限制

本包實作已跑建置、content checker、content／rework profile、legacy save、O101、W07、W08、W04 schedule、month2 schema 及 `git diff --check`；統籌另獨立全跑及核對保護原文與原數值。最後來源句修正後重新 build 與跑 W08。

`test_w08.js` 從完整 `dist/game.html` 取 script，以 VM／最小 DOM harness 逐個可見未鎖按鈕走正常兩月，逐階存讀，現金 120→39→67→77→89→9。另有明標人工狀態測不足款、無來源／過期／換 session、最後格競合、不合／失約／轉貨、連點、寫入失敗、舊檔、候選短／過夜／互斥、實讀與月底未讀回報。`test_month2_schema.py` 拒錯案但存在的消息 ID、缺 O204 前提、非字串元素、布林價款、偽造 gate、舊批次及未知欄位；原回歸 assert 不放寬。

未跑真瀏覽器 DOM／視覺、手機、真人遊玩節奏或全支線經濟平衡；VM 按鈕路徑不等於真人試玩。原版既有問題未全面重寫；第三月、補充 A 與 O202 候選正式核准未施工。費用 80／100／110、生命 18 月及贖回 300 保留。工程分段文字尚待後續敘事潤稿，但核准 prose／sources／legacy 不改。
