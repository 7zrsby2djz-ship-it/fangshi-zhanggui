# W05｜工程基線

2026-10-04｜6.1 SOL｜完成可重現資料檢查與舊版存讀檔基線；未開始W06。

施工基底：local `431b4b0197ae506448d14762338f55bfa9f8bc71`，與remote `cc95bd3abf9e4fe3f678fc75d3887ae2dd7e0708`內容樹相同，分支 `rework/taiwan-m1m2-sol`。完整讀主企劃v1.0／補充A及START_HERE、W04_HANDOFF、資料契約、排程後施工。S01 v0.4／S02–S12 v0.2核准正文與權威來源原文均未改；Q01／Q02最新核准由統籌記於U20261004-01，非本包新增玩法。

## 修改與理由

| 檔案 | 修改及邊界 |
| --- | --- |
| `tools/check_content.py`、`build.py` | SafeLoader衍生loader拒絕巢狀重複鍵；deals／news／accuse序列拒絕重複／空ID，字典ID由鍵唯一性檢查。build在任何產物寫入前執行檢查。未加商機schema或重寫引擎。 |
| `content/deals.yaml` | 只刪d19.opts.special被覆蓋的第一個seal；保留最後值「還刀」。八份YAML解析結果及完整D均與施工基底相同，未改數值／事件答案。 |
| `tools/harness.py` | 去舊機器固定路徑；新增`--game`及`--output-dir`，預設repo產物及`/tmp/fangshi-harness`。原mode／scheme／第三參數仍可用；缺Playwright有明確錯誤，help可獨立查看。 |
| `tools/test_content.py` | 最小正反例、失敗build保留產物、建置同步檢查；`--compare-baseline`額外比對W05固定基底，後續內容移植不沿用資料等值要求。 |
| `tools/test_legacy_save.js`、`tools/fixtures/` | 原game.js在Node VM完整執行；兩份本輪生成的代表性v1樣本及來源說明。不是蒐集的真實玩家存檔，也不是假load／migrate stub。 |

已執行`python build.py`，產物314,295 bytes；`dist/data.json`及`dist/game.html`與原已追蹤產物無差異，故無dist檔案修改。game.js／CSS／template未改。代理未commit／push；統籌核對後獨立提交。

## 可重現命令與結果

在repo根目錄執行（Python 3＋PyYAML 6.0.3、Node v24.19.0）：

```sh
python tools/check_content.py
python build.py
python tools/test_content.py --compare-baseline
node tools/test_legacy_save.js
python tools/harness.py --help
git diff --check
```

以上通過。checker讀8份content YAML：23物品、25NPC、42交易、29晨報、35消息、13事件、7場所、8告發ID。負例確認巢狀重複鍵、重複deal ID均由對應檢查拒絕；兩種失敗build均未覆寫預存HTML／JSON。八份content逐檔PyYAML解析等值，完整D與施工基底一致，HTML與目前D／JS／CSS／template完全同步。checker只驗鍵及列明ID命名空間，不宣稱交叉引用、未知need/fx key或全部內容schema已驗。

舊檔測試實際經過`start→store.get→migrate→render`，不改被驗函式，localStorage替身記錄讀寫。驗證兩份v1檔都能繼續，缺失的11個DEFAULTS頂層欄位會補入；原有金錢、lots、done、events、mem、rel、enc及isold保留。四個tab執行原renderer及save，再啟動新VM讀檔，狀態不再變動。正常領燈後重按、讀檔、月底及跨月再讀，燈維持1盞且d10完成記錄保留，正常入口不能再領。壞JSON及未知版本拒絕載入，啟動未覆寫原字串。

資料等值重現使用`tools/fixtures/w05_content_sha256.json`保存的固定基底正規化SHA256，含八份YAML及完整D；已在本輪以git原件逐檔比對等值後生成。新clone不需本地專屬SHA即可驗；未把當前HEAD當不變依據。此命令專供W05基線，W06合法內容變更後不加`--compare-baseline`。fixture路徑未驗真實UI可點條件／完整玩家排程，因此「正常入口不能再領」只指`dealAvail`對完成記錄的原核心判定，不等於瀏覽器玩家路線已通。

fixture重生只需`node tools/test_legacy_save.js --generate-fixtures`；會覆寫兩份測試JSON，平常驗收不加此參數。來源、人工刪欄位範圍見`tools/fixtures/README.md`。受託品缺口probe另用人工單旗標lot，未混入正常fixture或冒稱可達玩家進度。

## 已驗限制與後續保護

- 既有`pawnable()`未排狐尾燈或entrusted。測試隔離成只有燈、現金0的缺費狀態，再跑真實`advanceSlot→decide('goods')`，燈會被移除；單帶entrusted的人工普通貨也會被抵掉。這是既有缺口，未在W05改玩法。特殊物／受託品不可自動消耗已有主企劃依據，W06應在實際mutation入口補保護並驗收。
- 一般擺攤UI因hudeng.sell為空不提供燈選項，但直接`marketStall([lampLotId])`會刪燈。測試已重現；不能把UI沒有選項當作函式安全。未逐一測所有舊出售／抵費入口。
- 現`migrate`只補undefined頂層欄位，未修復null、錯誤型別、未知item、重複lot ID或巢狀record；本包不做W04提案中的v2／故事／公制遷移。localStorage配額／寫入失敗及多tab衝突未測。
- 原舊events月底提前結算／跨月清空仍保持；跨月測試只驗燈與done保留，不宣稱新商機回流安全，亦未新增商機函式或資料。

瀏覽器命令：

```sh
python tools/harness.py flow light --game dist/game.html --output-dir /tmp/fangshi-w05-harness
```

本機Python及primary Python皆缺Playwright，此命令以exit 2及明確缺依賴訊息結束；未產生截圖、未執行真正瀏覽器。`--game`／`--output-dir`參數與help已核對，完整harness路徑執行仍待可用Playwright＋Chromium環境。Node最小DOM僅承接HTML容器、事件註冊與renderer需要的介面；未驗真實DOM互動、402×874畫面、深淺模式、人工試玩、兩月平衡或W06商機取得路徑，不能稱完整遊戲驗收。

下一步：統籌核對W05結果後，按W04已核對施工基準開O101；先保護唯一／受託物的實際消耗入口，再驗正常取得消息、備貨、成交、回流及存讀／跨月。核准十二幕保持原樣。

統籌驗收：已重跑資料正反例、固定基底等值、舊檔VM讀寫及W04排程檢查，均通過；遊戲核心與dist無差異。W05基線通過，可按W04已定方向啟動W06，瀏覽器與平衡限制如上，不擴稱完整遊戲驗收。
