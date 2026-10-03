# W04｜場景、資料與引擎接口契約

版本 v0.1｜2026-10-03｜6.1 SOL｜資料提案，未寫入遊戲、未建置、未測可玩或平衡。

來源基底：main `c8a5bf6b3013e977879678e226e6aa158d2c0eee`；工作分支讀取基底 `77167f77938e5a415478ecdc507f7678aeea909e`（接手時遠端工作基底 `6fbe08bba4d05dc731dc363ac9a96edbf8c943d3`，版本核對由統籌記錄）。主企劃全文、補充A、固定工作規則、REGISTRY、SCENES、全部現用正文/review與四份總檢已讀；僅按接口需要核對原程式、build及公開客需求。此文件不列舊交易隱藏答案。

最新使用者「好，那S05至S12都通過了，繼續下一步工作」（U20261003-11）核准S01 v0.4與S02–S12 v0.2原型。**核准的是各幕局部故事事實與原型路徑，不是本頁新增存檔結構、flags、報價快照、供應期限、失約估值、回流排程或O202替代故事。** 全部正文保持原樣；review中舊「待審」是歷史記錄。正式遊戲取決於實際選擇，不自動重播此條路徑。

時段與舊客窗口見 [W04_SCHEDULE.md](W04_SCHEDULE.md)；Q01/Q02可評審方案及放行門檻見統籌的[W04_HANDOFF.md](W04_HANDOFF.md)。本頁給資料與接口，統籌已核對排程及O101工程契約，U20261004-01已定Q01/Q02方向；W06仍須W05實際基線通過。W05基線獨立，不能把本頁文字核對當它的測試結果。

## 1. 實碼入口與缺口

| 功能 | 現有文件／函式 | 本契約接法（全為新增工程提案） |
| --- | --- | --- |
| 資料合併 | `build.py` 的 `data` 字典，現無opportunities | W06新增 `content/opportunities.yaml`，明確掛 `D.opportunities`；缺檔預設空清單。先驗schema再build，不以缺檔預設掩蓋錯誤檔案 |
| 新局／讀檔 | `game.js` `newGame()`、`DEFAULTS()`、`migrate()`、`start()`；`start`只接受 `saved.v === 1` | 見第7節，分辨故事版本與存檔schema；巢狀型別校驗；舊檔保留 |
| 取得消息 | `learnIntel()`、`learnTrigger()`、`scanLearn()`；`save()`會呼叫scanLearn | 新線頭只由實際可見節點觸發 `learnTrigger`；scanLearn後可檢查商機，不能由月／日或hidden truth補消息 |
| 晨報 | `beginDay()`只設 `S.todayNews`；`renderMorning()`、`newsHTML()`、`renderHub()`呈現 | 控制器確認閱讀頁顯示後記 `news:seen:n_rain`；不是beginDay發intel，也不是title載入／折疊summary就算讀過 |
| 條件 | `needOk()`支援has/flag/not/anyFlag/rel/stones/appraised/holdFlag/holdAny/noticed/backFlag/intel/notIntel/lotKnown/anyOf/month/relMax | 保留既有keys；新商機用獨立嚴格predicate，未知key拒絕、報具體資料路徑；不能把 `sourceValid` 等直接放need當作已支援 |
| 店客／成交 | `dealAvail()`、`nextShopDeal()`、`startDeal()`、`encOptions()`、`decide()`、`closeEnc()`、`onAct('shop')` | 新 `nextShopEncounter()`明確選商機或舊deal；`startOpportunityEncounter()`／專用sale命令，成交後沿closeEnc的shop占1格語意；不是將專用貨變成S.lots供舊decide取走 |
| 外出 | `enterPlace()`、`leavePlace()`、`placeOpen()`、`stallsToday()`、`renderPlace()`、`onAct('enter')` | 市集同次可見來源節點；平日工坊是新公開入口，按實得地址解鎖與開門窗口，不讀 `NP.tie.home`。leave仍耗1格 |
| 原礦部分售出 | `sellToSmith()`賣整lot；`takeQty(item,qty,lotId)`可定量 | S08新增定量普通交易命令，先驗2公斤、報價20與指定lot，原子收款／減2000g；不可先把整lot交sellToSmith |
| 投入／供貨 | `applyFx()`先動錢後give/take，take不足不rollback；`addLot()`未知item返回null | 專用 `prepareOpportunity()`完整預檢後提交；未知物品／短缺不扣款。applyFx不得承擔這筆原子交易 |
| 到期／跨月 | `beginDay()`、`endDay()`、`finish()`、`nextMonth()` | 新 `tickOpportunities()`用absDay、獨立持久record／inbox；finish只列未結案，nextMonth不清record；不接S.events |
| 資產／販售 | `held()`、`lotValue()`、`netWorth()`、`pawnable()`、`marketStall()`等現只看S.lots | 專用貨僅在新資產估值函式算一次，估值不是收入；外人物品完全不入資產。過期轉普通後只按普通lot算 |
| UI來源／物品 | `srcLabel()`、`intelRow()`、`ICON[itemID]`、`goodsCard()`、`renderStore()` | 補scene/news/supplier節點來源顯示；新item新SVG或既有一致風格fallback，不藉圖示透露答案；重量統一formatter |

現況補充：`endDay()`對 `d.extra`直接skip，不能拿它當額外場景或商機的到期清理；新場景是否錯過需自己的明確window處理。`finish()`會提前run月底後舊events，`nextMonth()`又清空它們，因此新callback不使用舊 `fx.event`、`event.in/at`或 `S.events`。本包不聲稱修好了舊事件引擎。

## 2. S01→S12對照

下表核准事實依現用正文；review的選項／替代分支作施工提案（例如S05只收200g付7並非正文實際發生）；`i_opp_*`／`supply_*`／`scene_*`均是本頁技術ID提案，不是已實裝。每個台詞節點只授予當下已說完、玩家已看見的資訊。

| 幕／占格 | NPC／進出 | 消息與來源層級 | 物件／所有權 | 玩家選項與後果 | 實際引擎接口及資料落點 |
| --- | --- | --- | --- | --- | --- |
| S01 M1D1 1 | me/qian，老錢進店後空車回對面 | 實讀n_vein為傳聞；qian轉述可能同源；既有i_vein_claim來自d01:open，不取得未做查證 | hantie 6000g始終玩家；dingshen1束不動 | 正文拒60/65/70，錢120不動；可成交/查證等另按原分支。70不是自動收款 | 改造d01顯示與重量；startDeal/actAsk/actSilence/actHaggle/encOptions/decide。查證另耗1格；報價60/65/70是本原型整批，不直接映射舊單位price |
| S02 M1D2 1；讀報0提案 | me/ge/han；箱蓋均帶回 | n_rain實讀→i_opp_rain；韓九同張報紙再述，sourceGroup仍同一；兩人未看倉庫。生活需求另記i_opp_han_short_intent（非完整B） | 老葛空箱/蓋，家中藥材皆非玩家貨 | 聽/早停/不代找；不扣款、不訂貨；缺晨報不取得A；缺台詞不補家務 | 新scene_s02_shop節點→learnTrigger；1顧店，closeEnc後advanceSlot。n_rain由第3節閱讀hook，不從scene自動補 |
| S03 M1D3 市集1 | me/han/tie，韓九先離，玩家回店 | han自述M1D4四包各1kg、當天回，S02離店後到石壁見滴水，未走後段→i_opp101_trip；逐張少量水數10下、供4份6/份為眼前來源snapshot | 新wax_wrap_set4；付24後玩家專用；原貨不動；香菇是韓九承運貨尚未到 | 備貨24→96；36只報價。拒絕/先不做0；缺A/B/供量/錢不扣 | market入口同次source節點、learnTrigger、confirmOpportunitySource、prepareOpportunity；不是免費actVerify，不再另占採購格 |
| S04 M1D4 店1 | me/han，包好帶走 | 當下袋口標1kg與乾燥觀察；完整含水未知；實際約M1D6回報 | 四份專用→韓九，量4→0；四包香菇owner為未具名原貨主，han承運，玩家只包貨 | 合用成交收36→132；不合/不賣不收；未備貨普通顧店。不得再發d13款 | nextShopEncounter→O101首個顧店；saleOpportunity原子交物/收款/約return；舊d13在新版被替代，正文不耗香 |
| S05 M1D5 店1 | me/ge；原袋隨ge離店 | 薄荷全袋分秤200g完整/100g碎、所翻處乾無霉為觀察；自產/搬碎/騰桌為ge自述 | 新dry_mint_leaf兩普通品質批次；全收付8後玩家300g，原袋不入庫 | 全收8→124；只完整200g付7→125；拒收0且不扣人情；不計未售收入 | 新版scene_s05_mint替代同一ge的d14；S05可用M1D5–6窗口依schedule技術提案。現decide單item單價不足雙批收購，需原子purchaseMintBatch；不套chiyan真偽/年份機制 |
| S06 M1D6 晨0／月結原流程 | me/han；另未具名收費者 | han第一手說四包收時乾、僅石壁滴水、煮焦飯；玩家只看布痕摸乾背面→i_opp101_return | han展示一份後收回，不返/贈/借；玩家原貨不動 | sold且due才讀售後；回報0錢；實付普通80，124→44；沒讀不增用後知識 | tick回報inbox＋readOpportunityReturn；startDues/decideDues保留數值80及例外，見Q01/Q02 gate。不是runEvent新回報 |
| S07 M2D1 店1 | me/kuang（阿岳），舊扣帶回 | 磨繩/用途/工坊入口為本人說法；舊扣測量內寬3cm厚3mm及固定孔位置為所見→i_opp201_spec；入口→supply_tie_address_known | 舊扣、架與繩仍阿岳；未有新扣，44不動 | 先看/婉拒；約次日試架只在實際答應後記；無O101則公開需求句替代口碑句 | 新scene_s07_kuang→learnTrigger；不賦職權、不開礦道；不靠舊home解鎖 |
| S08 M2D2 外出1＋店1 | me/tie，再me/kuang | 實到工坊、有4扣、量/試繩為來源確認；店內實架試合僅局部觀察→fitConfirmed | 玩家普通鐵礦石2000g給tie收20，餘4000g；4新扣付16專用，收24後阿岳；所有舊件/原繩仍他 | 原礦可獨立售；新扣不合不交付、不收24；原型44+20−16+24=72；沒售原礦做案=52 | 平日tie_workshop新入口；定量sellOrdinaryLot；prepare/sale O201獨立；O201替代m218，保留m213獨立。closeEnc店格另扣 |
| S09 M2D3 晨0＋店1 | kuang先回報離開，aheng稍後 | 阿岳本人一次使用未刮斷/罩未掀→i_opp201_return；阿蘅路程/疲累/自有衣糧與兩方案→i_opp202_constraints | 阿岳架繩帶回；阿蘅衣糧原物帶回，比較紙僅便條 | 正文拒接O202，72不動、無承諾；可接兩款為另案候選，不混帳、不阻斷O204 | O201 readReturn；scene_s09_aheng可存實際聽到constraints；完整O202金錢按鈕需候選核准＋新來源實見才可啟用 |
| S10 M2D4 市集1 | me/han/tao | 壺片原文親讀「2029.12／換內膽」無日；殼舊/本次換膽是han說法；tao本人告知平日入口→supply_tao_address_known | 2護套付18短暫玩家專用，收28→han；2壺始終原貨主，玩家配放 | 成交72−18+28=82；未看壺無原文知識；拒做不收款、不立共同回報 | market O203需求/來源/交付同場；prepare/sale O203；觀察scene節點獨立於sale，因此可看壺而不買案 |
| S11 M2D5 店1＋供應點1 | me/aheng，再tao；許衡回店，阿蘅自行出門 | 約1cm舊殼眼前外觀；棉布遇霧成殼與乾處可伸夾為aheng自述→i_opp204_scope；實見1套/試夾/罐固定為來源確認。飯盒字尚未讀 | 1新夾罐套付20專用，收32→aheng；飯盒/乾糧/舊殼一直她 | 只配取樣、拿不到回；原型82−20+32=94；未談限制/缺來源不亮完整方案；S09拒接保持 | scene_s11→learnTrigger；tao_workshop新入口→confirmSource/prepare/sale；不開非市集日市集、不meditate或加xp |
| S12 M2D6 晨0／月結 | han先報壺離開，aheng後報樣片並收自物 | han本人送妥/途中緊繩；aheng自述乾處另取約2cm新片，當日回；玩家只看罐內與親讀飯盒原文2029/12/31；送別為長輩→aheng轉述 | 新舊殼2片、夾罐、飯盒仍aheng；壺據han說已還貨主，護套去向不擅編 | 各案sold/due/read才用共同記憶；0回報款；兩份原文都見才比較同年12月；實付80，94→14 | O203/O204 inbox/readReturn；觀察日期source紀錄；startDues/decideDues；缺案刪相應段，不發自動道具／樣片／新承諾 |

對照更正：主企劃09.3把 `m219`描述為出行用藥需求；c8a5bf6實際 `m219`是xiaoman於M2D5–6收4株chiyan。**O202是新S09路線，不能直接覆寫m219。** 原source不改；正式移植時保留m219藥行普通需求，制度/稱呼另受Q02約束。O201選m218作被替代槽位（同一kuang），m213是afu組織大單，不附送第二份收入。m218抑制範圍只限新版故事；舊版存檔仍用舊內容。O203同樣明確替代新版的m220（han於M2D5–6固定收dingshen），該路線只收護套服務28，不再扣香／收原38單價；legacy存檔仍保留m220。

## 3. 消息與來源契約

新intel第一包只建立O101必要項；其餘在W08逐案加，不先發布半成品。所有命名本頁均為proposal。

| ID | 明確觸發 | sourceGroup／證據類型 | 適用與期限 |
| --- | --- | --- | --- |
| i_opp_rain | `news:seen:n_rain` | `news:n_rain`；傳聞，han S02同源 | 記憶可保留；作O101線頭只到M1D3備貨截止，不證倉庫/道路已查證 |
| i_opp101_trip | `scene:S03:han_trip_complete` | `han:M1D3:trip_M1D4`；第一手自述 | M1D4計劃與S02後石壁局部見聞；不是n_rain佐證。不授予全路安全 |
| opp101_source_checked＋snapshot | `scene:S03:tie_four_wraps_observed` | `supply:tie:O101:M1D3:batch1`；親眼看量／試水與當面報價 | 只當次市集visit session到離場；清物件/剩量/總24/各6/普通材料限制，離場未買需重新確認 |
| i_opp101_return | `opp:O101:return_read` | `han:M1D6:report_O101`；自述＋當下所見分記 | 只本單結果；0現金、0玩家物件，不改雨訊真假 |

晨報讀取提案：增加controller的 `readNews(id)`，先確認 `UI.view==='game'`、本文新聞確實屬可打開報紙頁、全文已呈現，再 `learnTrigger('news:seen:'+id)`。可採一個「閱讀報紙」入口展示當日全文並記已讀；未打開／尚在title／折疊summary／只載入存檔均不得取得。若採自動閱讀，以實際可見的卡片觀察hook替代，仍不放在pure renderer或beginDay。本頁預設顯式閱讀入口，UI選擇為新工程提案。S03如缺A只可普通詢貨，不能由han同源轉述補發完整卡；是否提供補讀昨日報紙需另評審，首slice不依賴補讀。

intel metadata增加 `kind`、`sourceGroup`、`scope`、`observedAbsDay`、`validUntilAbsDay`（業務期限與知識存在分開）。只有 `from`精確觸發，不設會使 `scanLearn()`到日自動獲知的month/flag捷徑。消息簿中同源可列兩位轉述者但只算1來源；O101兩線頭是倉庫傳聞與韓九具體需求，不把兩件不相同命題稱為獨立雨災驗證。`srcLabel()`新增news/scene/opp/supply顯示分支，否則現引擎會顯示空來源。

**不以hidden truth篩選卡片、價格或顧客。** `available`只依已取得線頭與公開期限；來源確認是可見配貨前提。各案localOutcome定為固定的本批／本趟局部結果，不從舊verdict/q標籤複製，不用通用「好貨必返/壞貨必死」模板。O101已核准一路是四包收時乾，適用條件明確；其他物批可另設計但不能事後因玩家選項變物理事實。未知的AI、霧機制與歷史真相不填hiddenTruth。

`tick`可把承諾到期回報投進inbox，但 `returnDelivered`與 `returnRead`不同：未開卡不加用後intel，貨款仍已成立；讀卡才記實際可見觀察/自述。不要由 `save()`的scanLearn自動補回報知識。

## 4. 新物件、普通庫存與所有權

| 工作ID→正式ID提案 | 舊ID關係 | 儲存與用途 | 明確限制 |
| --- | --- | --- | --- |
| wax_wrap_set→wax_wrap_set | **不是bishui別名** | 份為數量；1份=布1＋繩2；O101專用4；過期可轉普通同ID | 不套符的受潮/消失/異能；O202為另新批兩份，不能複製O101售出去的批次 |
| dry_mint_leaf→dry_mint_leaf | **不是chiyan別名** | g為量；同item兩個lots，gradeTag=whole_approx / broken，分別200/100，兩個totalCost 7/1 | 形態是可見等級；不把碎葉q<0.7送舊隨機退貨/欺騙判定。新鮮期限正文未定，首移植不憑空設爛掉日；普通售價另待平衡 |
| cover_steel_buckle→cover_steel_buckle | **不是hantie變形／別名** | 只為量；專用4，含固定孔規格snapshot | 原礦賣20、買扣16是兩筆，不用commission熔煉；舊扣是阿岳獨立實例，不用玩家新扣lot替代 |
| jug_frame_sleeve→jug_frame_sleeve | **不是bishui/box/sidai別名** | 只為量；專用2 | 限減互撞與配放，不抗重摔/保溫/無限容量 |
| sample_tool_set→sample_tool_set | 不沿hudeng/luopan等能力 | 套為量；專用1 | 40cm木夾＋250ml普通罐/木框/木塞，不認定耐霧、氣密、人體安全 |
| old_repaired_jug→故事物實例，非普通item採購 | 不替代原item | 2壺實例，其中1有修補片；owner=`external_owner_unknown`，custodian=han | 玩家只處理；不入S.lots、資產、抵費、出售；不杜撰未具名貨主NPC |
| fog_shell_fragment→故事物兩實例 | 不映射lingsui/其他異界答案 | `fog_old_cloth`約1cm與`fog_new_in_jar`約2cm；owner=aheng | 不設價格/用途/新能力；展示不入庫；兩片不同instanceId |
| commemorative_lunchbox→故事物實例 | 不替換故事證物ID | owner=aheng；knowledge記錄可讀原文，不存商品估值 | 不是玩家拾得；S11只見日用，S12實際看字才記歷史 |

原hantie ID保留改顯示鐵礦石（S01已核准），定神香ID／數量先保留；不因此把其餘舊物品都核准換名或能力。新增item需要 `ICON[id]`一致風格與item stat/text，而非讓舊圖標綁定洩漏舊能力。

`S.opportunities[id].stock`僅記錄已付錢玩家專用批：`batchId/itemId/qty/unit/totalCost/sourceSnapshotId/owner/gradeTag`，不在 `S.lots`重複一份。普通經營/自動配料/抵費/散客不遍歷此欄。現有 `netWorth()`僅看普通lots，新增 `reservedStockValue()`一次加入估值；它不加stones、不用於prepare可用錢。sold清專用量；外人物件不在兩個資產集合裡。

受託/展示契約：本slice所有handedForWrapping物件都用 `S.sceneProps[instanceId]`臨時保管鏈，僅owner和custodian，禁止 `addLot`。scene關閉或完成服務只是返還custody，不能觸發give。轉成玩家資產必須有明確同意與獨立ownershipTransfer receipt，當前正文沒有；reject/show/return不能偷造轉移。新交易選批需明確排除 `entrusted`、external-owner、story-evidence、hudeng；不能僅靠現 `pawnable()`排stolen/sect/sting（它未排entrusted）就認定保護充分。以上是新增路由保護，不聲稱重做舊系統已通過。

## 5. O101首slice：可執行資料提案

機器可讀實例見 [W04_CONTRACT.yaml](W04_CONTRACT.yaml)，**僅proposal schema，當前build/game不會讀取**。W06只實現O101及必要的S02/S03來源與S04/S06短段，後續各案此輪不建game資料。

時間提案：每月仍6可玩日，`absDay=(month-1)*6+day`，僅day∈1..6有效；phase=end且day=7不能再tick第7天。S03取得B與確認來源後可卡片，備貨在M1D3市集同次完成，不另扣第二個slot。來源確認到離開該次市集即失效，未買不鎖整批；正式庫存扣4與支付24同筆進行。客戶M1D4第一個顧店保證見到，報價36鎖至當日完成服務，回報M1D6晨間。**到訪1格不保留所有舊客免費格，舊窗遷移按排程文件候選。**

狀態建議：`discovered→available→prepared→sold→return_due→settled`，並有declined/expired/failed。`available`=兩已知線頭齊／期限內，可先顯示「需當場確認來源」；prepare還要實見來源有效。`sold`與return_due可以同次寫而邏輯不合並，帳款receipt與回報receipt不同。

選項：備貨24、先不做、這次不做。先不做在來源／日期期限內可回頭，離場必須再確認供應；這次不做為本案declined且0錢貨。餘額不足不能債務自動借款。已prepared不再重複備，UI仍可檢查報價/條款。sale按當場合用／包角／付款確認，收36後交物；prepared的來源snapshot已轉為取得批次事實，不因過了一天要求再看供應者。未備貨不出現能收36的按鈕。

失約提案統一採用**轉普通庫存、退款0**：M1D4窗口結束仍prepared，或該次試包不合且雙方不成交，4份wax_wrap_set批次各數量可識別地移入普通lots，清專用，記disposition receipt，不能再sale原案。擬資產估值總16（4/份）只是主企劃試算，新技術選擇，未平衡；投入現金24不回，現金淨流−24、資產估計較投入少8。普通庫存後續賣出實際款另記，估值16不保證能售16。不得再用refundLot/buyback給16錢又留下貨。若之後另評審換供應商退16方案，必須清貨、現金+16，不能並用當前transfer方案。

承諾只在實際prepare與韓九接受明早方案後記；回報承諾只在實際sold時記。未做/expired沒有共同送貨成果與回報獎勵。O101這趟固定0回報款，展示布仍han；未到時不把“沒來”解讀死亡。

售價snapshot建議：`quoteId/quotedAtAbsDay/termsVersion/prepareTotal=24/saleTotal=36/saleExpiresAbsDay=4/customer=han/quantity=4/scope/returnsCash=0`。存檔/重繪不重抽。不套 `startDeal()`的境界/外放單位倍率或 `price()`的日價波動；其他普通交易仍按原規則。適配服務加價是玩家看得懂的服務內容，不只是同貨強漲。

來源snapshot建議：`snapshotId/supplier=tie/batchId/itemId/qtyAvailable=4/unitPrice=6/totalPrice=24/checkedAtAbsDay=3/visitSessionId/validUntil=leaveVisit/observations/limits`。備貨前複驗session、remainingQty與條款版本；離場未買不跨日預約，不無限供應；買後持有從source轉stock。snapshot不是供貨地址旗標，更不是所有tie商品永久可買。

## 6. O201–O204逐案接口（不提前實裝）

| 案 | required Intel／flags技術提案 | 公開入口／實見／期限 | 專用貨／報價 | 成交／回報與限制 | 未成交處置提案 |
| --- | --- | --- | --- | --- | --- |
| O201 | i_opp201_spec；supply_tie_address_known；opp201_source_checked；sale另要opp201_frame_fit。口碑opening用O101.returnRead為條件，非必接門檻 | S07當面問地址；M2D2外出tie_workshop看到4成品，session內備；店內當天試架，M2D3晨間回報 | cover_steel_buckle4；成本16／服務售24。孔位需實際尺寸記錄，不只寫“通用” | 排除主承重用途；不保礦道/全日；從S07到S08的確認與試裝承諾按真實選擇記。原礦2kg20獨立款／receipt | M2D2結束沒售，4只同ID轉普通；退款0；fallback估值未定不冒充16回款，進普通需後續普通需求／價規則 |
| O202 候選blocked | i_opp202_constraints；opp202_plan_selected(short/overnight)；supply_tie_address_known；opp202_source_checked；opp202_trial_fit；另storyGate_O202_alt_approved=false | S09需求1＋同往工坊1；候選新批2份現場看，不從O101生成；M2D3當次成交才能用M2D4出發計劃。備/交截止M2D3，M2D3窗口結束判expired，M2D4晨提示與轉普通，不新增晚賣倒趕出發 | 新批wax_wrap_set短1約300g成本6售10；過夜2約600g成本12售18；衣糧全自有不消費玩家貨 | S12晨report0；不保證收獲/治療；過夜M2D5回後不強制同日接O204；正文拒接不寫trip choice或sale。候選供量/重量/路線價格尚未隨正文核准 | prepared未售於M2D3窗口結束確認expired，M2D4晨轉1/2份普通、退款0；未準備0變化。不把普通轉貨視為客戶出發／返程已發生 |
| O203 | i_opp203_jug_need；opp203_source_checked；opp203_trial_fit；非O101必依賴；另外supply_tao_address_known由本人當面說 | M2D4市集1，實見2只框/布/兩壺試放，同session準備交付；本案截止M2D4，回報M2D6 | jug_frame_sleeve2；成本18／售28；修壺款與壺價完全排除 | han承運物不能收購或退玩家；原文觀察不以sale為必要前提，只以實際看見。回報不自動贈套，護套下游去向未知 | 同ID兩普通護套轉入、退款0；套不合未買0；估值/一般買家後續評審 |
| O204 | i_opp204_scope（本人乾處、拿不到回）；opp204_old_sample_seen；supply_tao_address_known；opp204_source_checked；opp204_trial_fit | S11店內1＋tao_workshop1；地址只能S10本人說或另實際公開問話，不假讀取舊home；M2D5見現貨1套，session內交付；回報M2D6 | sample_tool_set1；成本20／售32；所有殼、飯盒不在套餐 | 自主熟草坡近程；不保進霧/人體，不加武學/xp；沒有O202仍可接。若缺S10地址，須額外有真實地址獲取節點與格，或block不能免費補 | 1套同ID轉普通、退款0；0額外殼/獎；估值與一般市場規則後續評審 |

所有address旗標只解鎖入口，不代表開門/現貨。供貨批次不得因load重刷而複製，確認supplier snapshot同時記消費revision，普通買賣不偷搶已付專用批。O201的S08原礦先賣再買不是商案最低資金依賴（44足夠16）；不可要求售原礦才能看鋼扣。

O202節點級未決：目前批2份普通布及兩方案都只在review候選，不能寫storyGate=true。也不應先做假的“出行用藥”替身。顯示候選供貨卡／資金按鈕受gate，已核准的S09拒接與被告知負擔可正常移植。O205/O206與補充A只保留規劃位，無數據、到期任務或自動第三月承諾。

## 7. 金錢、一次性receipt、存檔與重量遷移

### 7.1 原子命令與收據

三筆必獨立：`prepareReceipt`（扣成本＋玩家專用貨）、`saleReceipt`（專用貨轉客戶＋成交款＋回報約定）、`returnReceipt`（回報投遞/讀取消費的結果，本批0款0物）。另有`dispositionReceipt`（未售轉普通）、普通S08礦售receipt、月費receipt。不能一個 `rewarded`布爾同時保護全部環節。

每案記錄 `id/instanceId/state/revision/discoveredAt/preparedAt/customerWindow/returnAt/quoteSnapshot/sourceSnapshot/stock/receipts/outcomeId/inbox`。receipt鍵建議 `instanceId:prepare`、`:sale`、`:return_deliver`、`:return_read`、`:disposition`；同命令重複返回既有收據，不再扣/發。prepare禁止使用既有故事物／受託品；第一包只從supplier買，未開放玩家庫存混配。

事務步驟（提案）：

1. 校驗完整schema、遊戲phase/window、record revision、錢、貨、owner、source session/remaining與所有相關ID；任一失敗0變化。
2. 在candidate copy構造變化，驗證`cash>=0`、qty非負整數、沒有同batch在普通與專用兩處、sale與disposition互斥、收據狀態一致。
3. 用一次完整存檔寫入candidate，成功後才替換S並render；receipt與錢貨必須在同一JSON裡。現store.set會吞失敗，需要新增返回成功／錯誤的durable store API；Quota/寫入失敗不顯示成交、不在未持久化S上繼續活動，可重試。
4. render與load只重現收據/卡，不能執行錢貨；refresh若讀到舊JSON則整筆未成，若新JSON則整筆成。相同revision串行，跨tab需單活躍會話/衝突檢測，不能讓兩tab複用供應snapshot各售一次。

`applyFx`、`decide`、`takeQty`可以作為後續拆分參考，不把不足量take＋其他fx仍成功的現流程稱原子。未售轉貨應一次給普通同IDlot（附reservationOrigin唯一值）、清stock、寫disposition；檢測普通lot已存在而receipt缺失是壞存檔衝突，阻止重發並出診斷，不猜測再給一次。受託物展示從不走此事務的give/take。

### 7.2 存檔版本與故事相容

提案新故事key=`fangshi-rework-v2`，schema `v:2`、`storyVersion:'taiwan-m1m2-v1'`、`unitsVersion:2`；原key=`fangshi-p1-v1`保持原樣不覆蓋。新版 `start()`只載入新key的schema2；另檢查v1舊key並提供legacy入口，不把v1原單位套進新版D。hot恢復 `data.S`也經過schema/profile驗證，不能繞過migrate。

舊v1續玩提案採獨立legacy頁：W06開始更動build前，將目前既有dist/game.html原樣複製為legacy副本，包含其舊D資料集、舊單位、舊計價與formatter，仍讀fangshi-p1-v1；新版頁含新D、公制量與新key，只用新局。新頁提供「保留舊進度／新故事開局」兩入口，不能v1原單位直接使用新版D續玩。若另選同引擎雙profile，必須載入不同D內容集、formatter與計價函式；只有接受v===1並非相容。此處未建立legacy副本。原樣legacy副本用來保留原版；若舊檔需型別修復，另立同舊D／單位／計價的安全讀寫adapter副本，修復結果寫新legacy-safe key，原key與raw備份保留，不能讓現有吞錯migrate直接寫回原件。舊檔導出原始JSON副本再修復，保留done/intel/isold/關係/記憶/old events等不刪除。若用戶要把舊進度導入新故事，另出具體敘事衝突映射供評審，目前blocked。

型別修復方案：

| 欄位 | 必須校驗 | 可修復與不可猜測 |
| --- | --- | --- |
| v/storyVersion/unitsVersion | 支持的整數enum及故事profile | v1無新巢狀數據可加空機會集合；未知版本不當新局覆蓋。v2缺storyVersion需隔離，不猜已遷移 |
| flags/done/intel/isold/rel/met/mem/homes/codex | 普通物件，逐entry規範；mem數組／intel的day,m,src等 | 缺欄以對應空預設補；null/array等異常先備份、輸出repair report；合法entries保留；真實錢貨所需的異常entry隔離/阻止經濟按鈕 |
| opportunities/supplies/inbox | 普通物件/數組；record enum、日期、snapshot、qty、receipt shape與互斥不變量 | v1沒有→空集合，不依據舊done d13創造sold O101；壞record保留raw並quarantine，不回available以便重複領取 |
| stones/debt/lot.qty/totalCost/price等 | 有限數、非負、qty整數與單位符合；不把數字字串悄悄當零 | 可嚴格轉換純數字字串且有報告；NaN/null/負錢／不合法數量不可預設120/0，維持可讀保護模式直到明確恢復 |
| lots/lotSeq | lots數組，item存在，id唯一，qty/cost/q/flags類型；lotSeq≥最大id | 缺flags可空；未知item的lot原樣保存在隔離區、禁止消費/估值；重複id不可複製或合並猜價 |
| enc/place/commission/events/complaints與嵌套back | 按舊版必要類型修復，保留現場與到期資料 | 不能為了出新卡清空未完交易；壞活動record可只讀展示raw並恢復到安全入口、列損失邊界，不觸發runEvent補獎 |

先clone並驗證再替換S，不修改唯一原件。修復記錄包含fromVersion/toVersion/migrationId/affectedPaths，重複載入相同migration不再執行單位換算。新record帶空receipts與未知state不是自動“準備沒扣錢”；不變量不滿足就block此案操作。本頁未編寫／執行這些修復。

### 7.3 公制量與價格遷移

使用者已核准重量顯示公克/公斤，S01十台斤→六公斤的局部換算已有；**所有未出現物品不能自行宣稱其舊“斤”是哪一種制式。** 此頁hantie按已核准600g/舊unit映射；他物逐項查是否有舊重量事實。

新profile提案：重量數量存整數g（hantie6000、新薄荷200/100），顯示≥1000g且合適用公斤，其餘用公克；份/只/套仍整數計數，O202的300/600g只是額外mass metadata，不將1份變300個商品。舊版legacy key不換數，仍可讀原進度；如做技術舊檔轉換到保留legacy-story的新schema，必須 unitsVersion=1→2的一次遷移且原件留存。

| 項目 | 舊hantie值 | 新量／比價規則（技術提案） |
| --- | --- | --- |
| startLots | qty10、cost8/舊unit | qty6000g，成本總80不變；costRatio=8/600g，不把cost8乘600；S01新局仍120現金 |
| items.base | 9/舊unit | 基準報價9/600g（等價15/kg）；存價格分子9、denominator600；**不能 per-g執行rp把0.015四捨五入0** |
| d01 need／qty | has5、qty10 | has3000g、qty6000g；原價6/舊unit等價10/kg，首總60；後65/70是整批報價snapshot。實際不足量選擇按可見規則，不對任意kg套整箱價 |
| 其他hantie need/give/take／deal.qty | 每個舊數量q | q×600g，包括普通采購、組织订單與已排scene；未知鍵／別物不全域替換 |
| PL.smith sells / commission | lot5／needQty5 | 各3000g；fee10不變；commission函數硬編码`8*needQty`需改成本ratio累計，否則重量扩大會把成本扩大600倍 |
| price／cost／fixed quote | 每unit單價p | 保留總價或p/600g rational，按整筆交易總價約定 rounding一次。舊price先rp每斤後乘qty的cash歷史不重算；新每kg報價另標新規則 |
| lots／sold／投訴與event.back | 舊qty和單位成本 | 已發生stones/refund不重算；live貨與嵌套back.qty轉換，cost→ratio/totalCost；sold歷史標legacy unit供展示，不再次轉換成可售貨 |
| render / 條件 / 資產 | goodsCard、renderStore、smithHTML、held、lotValue、pawnValue、marketStall、decideGeneric／appraise等按qty | 所有重量formatter/分批操作/報價單位同步；assets按整批ratio算。不得只改item.unit讓10變10kg或把6kg再遷移600倍 |
| 聲明/歷史原文 | 台詞／stat／news/intel／帳紙等含斤 | 新日常數字與所有引用同步；舊史料原文若需要保留，另附公制釋量，不篡原刻文/舊存檔已見句。相關古紀年與制度文字受Q01/Q02阻擋 |

遷移輸入必須明確profile與unitsVersion；v1 qty6不能憑數值猜是6斤或6kg。非法／第三方已換數檔無units標記則保留原始、block自動轉換，提供來源說明後的恢復選項。dingshen束、夾罐套、鋼扣只等不參與600倍率。

普通S05薄荷只收整200g時costTotal7；全收時兩個lot成本總7+1=8，不把每g成本7寫入舊cost字段乘200。合並批次需同qualityTag與來源，在兩價未定義前不混賣。新物普通銷路／每批估值未定，資產報表可顯示“未定價存貨”而不把它們當免費0值或寫假收入。

## 8. 歷史證據分層與未定接口

2026-10-04更新：Q01/Q02已採W04_HANDOFF兩題A，下表原列決策邊界按此方向施工；交易機理、制度細節及其他未決項仍不能補成答案。

| 記錄 | 親眼/原文 | NPC說法 | 允許推論 | blocked推論 |
| --- | --- | --- | --- | --- |
| S10壺修補片 | 「2029.12」「換內膽」，**無日**；這次親見刻字 | han說外殼舊、這次也換膽，片送來已有 | 與另物比較同年12月；記一項維修相關字樣 | 原刻者/原刻時間/制造日/2029-12-31/末日原因 |
| S12便當盒 | 磨淡人名/署名、2029/12/31；實際開蓋見才記 | 長輩→aheng：工作那邊送別同事留字；誰送誰未問 | 一項紀念/送別說法，適用該盒；若壺原文也已見可以比年/月 | 離職原因、確定同事/製造日、和壺歷史來源已證獨立、AI因果 |
| 霧殼舊/新 | 眼前外觀、罐內新片未碎的當下狀態 | aheng關於棉布結殼、乾處取另片、回家的本人說法 | 保留有限樣本的可再問問題 | 霧對人體/木/玻璃全套反應、用途售價、官方異界機制 |

不把所有舊物貼2029/12/31，不為了分散日期先造其他年分道具。knowledge record存 `literalText/datePrecision/month_or_day/meaningClaim/sourceType/sourceChain`，日期只作原文及局部比較；不能自動轉成通用manufacturedAt。不同現持有鏈僅是現持有鏈不同，不能計成兩條已驗證百年前獨立證據。

| 未定項 | 可評審邊界／技術建議 | 受阻的正式寫入 |
| --- | --- | --- |
| Q01 18月/生命交易/家庭債 | 保留數值與legacy profile；新故事可先沿期限壓力、暫不解釋機制；具體兩組選項見[W04_HANDOFF.md](W04_HANDOFF.md)，不擅加AI詛咒或植入裝置 | intro/ticket、pawn/redeem文、beginDay月初字條、renderHub期限來源與endings/家族歷史正式重寫；schema可存期限，不宣告新機制 |
| Q02 地方/藥行/礦區權責 | 派出所稱呼方向確定；周正與陸不同職責必須選擇當地職權方案，詳[W04_HANDOFF.md](W04_HANDOFF.md)；場景內未具名收費可不指定機關 | office/accuse/turnIn/制度告發及強制移交、收費者身份、組织采購與所有舊組织文字；不把宗門全域替換成警察 |
| Q03 具體山/聚落 | 可沿中央山區高地，無新具名路線／海拔 | 正式地圖、具體行政邊界與交通拓樸 |
| Q04 貨幣來源/常規供應 | 各案局部現貨已隨正文確認，技術snapshot不推完整能源來源；新價是候選參數 | 大規模產能、靈石全部來源／平衡承諾；普通新貨fallback估值與銷路未定需評審 |
| Q05 月度壓縮 | 技術absDay以6日為當前profile參數；不是自然月六天，不算星期 | 對外正式日歷說明與將來月長變動遷移；參數變動需另version |
| Q06 名稱/ID/能力 | 已出現稱呼/物件按核准正文；本頁新增ID非別名 | 未出場人物/物品能力、空間器具與舊神秘功能不能整體核准 |

W06可以分開施工技術基線與O101內部循環，但新故事完整開場／月初／月結需遵守已定Q01/Q02方向及仍未知的細節，不以「先保留原文」宣稱新版世界全完成。供貨窗口、舊客時段與必要台詞一致性依schedule評審。root統籌批准之後才由W05/W06按各自授權啟動。

## 9. 本輪核對與後續驗收

本輪只讀對照實際文件／函數，及提案YAML結構解析；沒有改 `content/`、`game.js`、`build.py`、`dist/`，沒有commit/push、模擬、存讀檔運行、UI或人工試玩。預算與本金串算是原型帳，不是平衡保證。

後續必要情境（此處均待測）：不讀n_rain；只一線頭；同源韓九轉述；未到市集；缺供貨session／離場再備；24不足；prepare/sale/return/disposition重複點擊；存每個階段再讀；存儲失敗；客戶未到/沒顧店/不合拒售；轉普通貨後防再sale/退款；S06未讀回報仍保成交款；M1月底／次月回報不提前不丟；end phase不多tick；同日多案不重複回報；展示貨/受託貨/特殊燈不進可賣資產；hantie全部數量/價格/條件/嵌套退款遷移一次；壞v1/v2檔不免費恢復本金；M1D4成交＋一次實際查證＋重要舊客可保留的schedule路線。

下一數據施工僅O101：先實現嚴格schema與舊存檔基線（W05獨立），然後按已核准排程/來源接W06。O201–O204先維持此頁契約；O202替代候選、Q01/Q02、普通新貨估值/銷路和新增工程選擇必須在評審中明確，不能從“全部原型通過”自動推導。
