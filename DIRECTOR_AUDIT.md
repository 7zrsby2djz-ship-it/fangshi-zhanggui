# 遺物 × 事件稽核與十項改進（director/relic-audit）

> 這份給 main 的維護者合併用。分支：`director/relic-audit`，以 `cf83975` 為基底。
> 說明：`game.js` 的引擎改動（回程保護、拿出來用、研究加強、守夜、警示機率、介面提示）**已經在 main 的 `cf83975` 裡**——那是我先在共用工作目錄改的，被當時的 commit 一起收進去了。所以這個分支**不再動 `game.js`**，只補 YAML、`build.py` 檢查、測試與 README；main 上那段引擎碼沒有這個分支的 YAML 時大多不會作用（沒有 `use` 欄位就不會出現按鈕），合併後才完整。

## 一、稽核結果（以 `5b4bb22`「48 件遺物全部有效果」為準，實際跑程式驗證）

驗證方式：讀 `game.js`，再用 Playwright 開 `dist/game.html`，對每一件遺物單獨放進庫房，量 `shopDay` 估算、`gearStats`，並且對每個地點擲 200 次回程（負擔超過上限 2 點）。

1. **「48 件都有效果」只在資料層面成立。** 每件在 `relic_fx.yaml` 都有一行，但實際跑起來：
   - **3 件完全沒作用**：`lupai` 路牌碎片、`wuguan` 一罐霧、`piaogen` 公車票根。它們只保護 `asc_〈地點〉` 回程死法，可是 `leavePlace()` 算回程風險只用 `gearStats().ascent`，從來不讀 `protect.asc_*`。實測崩塌段、水庫、維修梯回程死亡率帶不帶都是 44%→44%。
   - **3 件只有一半有作用**：`lengyu`（asc_north）、`cunpai`（asc_reservoir）、`zhanwu`（asc_platform）的回程那一半同樣沒作用。
   - **4 件店裡數值小到看不出來**：`xiaozhong`、`muxie` 客流＋0.3、`hongzhu` 客流＋0.3（代價卻照算）——四捨五入後一天淨賺差 0；`tangzhi` 會賣＋0.5 一天差 1 靈石。
   - **2 件守夜類幾乎沒作用**：`fengling` 守夜＋0.5、`ventpaper` 守夜－0.5（代價）。守夜只被「半夜敲門的人」的 `secMax: 1` 用到，0.5 不會跨過門檻。
   - `naiya` 乳牙的效果行是空的（只有 desc），作用全靠 `sc_answer` 的 `unless`；夜報「一直在作用」不會列它。
   - 3 件警示類（`boliye`、`qianshi`、`huangdeng`）效果一模一樣，帶第二件起沒有任何差別。
   - 模擬 80 局（careful／lamp／ledger／explorer）`rsave`（遺物救命次數）全部是 0。
   → 合計 **48 件裡有 7 件實際上沒作用（lupai、wuguan、piaogen、xiaozhong、muxie、fengling、hongzhu 的好處），另外 3 件只有一半、1 件代價沒作用、3 件效果重複。**
2. **遺物跟事件幾乎沒有接回去**：48 件裡只有 15 件被任何事件、地點或選項的 `need.has` 讀到，**33 件拿到以後沒有任何事件認得它**。也**沒有任何一件可以主動拿出來用**。
3. **外稿（`/workspace/grok_out/reply1.txt`）12 件寶物**：
   - 9 件有整合（naiya、chachou〔由「沒有花紋的銅錢」改寫〕、banbei、dengsui、tuoxie、quepiao、zhifu、banpai、muxie），**3 件漏掉**：遲到者的橡皮、空號鉛筆、蓋住的白花。
   - 外稿設計的都是「用掉／捏碎／在第七層使用」這類主動效果，整合時**全部改成被動數值**，12 件的主動效果 **0 件實裝**。
   - `chachou` 茶籌**沒有固定的取得事件**，只在夥計收購的隨機池（每天約 6%，還要開「舊物」收貨）裡，實際上很難拿到。
4. **外稿 20 件事件**：17 件整合成地點或散事，**3 件沒整合**：5「長生當鋪的夜鈴」、13「玄霜巡守隊的漏夜名簿」、14「寒潭會的借條」。整合的 17 件大多只保留一條主線，外稿的乙、丙選項（例如點名簿的「用粉筆把日期塗掉」→橡皮、白花的「用土把花蓋住」）被拿掉。
5. **README 數字過期**：寫 37 種死法，資料實際是 **46 種**（探索 23、回程負擔 8、遺物 8、店裡 7）；成就 31 個（README 寫 27）、開張加成 27 種（寫 23）、謎題線 11 條（寫 8）。這個分支已改正。
6. 領取物品的事件卡片（晨報、地點結果）**沒有物品圖示**，只有文字「得到「X」」——只列為建議，見第四節。

## 二、十項改進（依優先順序；都已實作）

| # | 改什麼 | 改在哪 |
|---|---|---|
| 1 | **回程保護真的生效**：回程風險乘上該地點 `asc_*` 的保護；被救時跳出遺物自己的那句話；地點頂端寫「「冷羽毛」：這裡的回程比較安全」。lupai／wuguan／piaogen 從 0 變有效，lengyu／cunpai／zhanwu 補全。 | `game.js`（已在 main `cf83975`） |
| 2 | **寶物可以拿出來用**（外稿原本的設計）：借半拍（這一趟再看一處）、剪票上行（負擔減半、平安回聚落）、捏燈泡碎片（今天看得出每個危險幾成）、喝一口冷茶（負擔－2，但今天少看一處）、擦掉今天（橡皮）、問一句真話（茶籌辨一則消息真假）、埋乳牙（夥計少拿錢，但失去點名保護）。7 件，有每天一次也有用掉的取捨。 | `relic_fx.yaml` 的 `use`；引擎已在 main |
| 3 | **補上外稿漏掉的三件寶物與來源**：`xiangpi` 遲到者的橡皮（`sc_eraser` 黑板溝）、`qianbi` 空號鉛筆（新散事 `dr_patrol_roll`＝外稿事件 13，三個選項都做了）、`baihua` 蓋住的白花（`st_cover` 用土蓋花）。 | `batch1.yaml`、`relic_fx.yaml` |
| 4 | **茶籌有固定來源**：`tea_chou` 說書人桌上的茶籌（說書人那段之後），白姐一句「問一次，就沒了」，接上第 2 項的「問一句真話」。 | `batch1.yaml` |
| 5 | **寶物回到事件**：既有事件加「身上有某件遺物才出現」的選項——沒有影子的客人（溫的硬幣）、半夜敲門的人（鐵管風鈴）、會呼吸的箱子（回聲石）、阿妹沒有回來（燈泡碎片）、一屋子的白花（舊制服／蓋住的白花）、結霜的第一個晚上（冷羽毛）。都是安全的第三條路，有自己的伏筆。 | `shop.yaml`、`events_more.yaml`（用既有的 `need.has`，不用改程式） |
| 6 | **寶物當鑰匙**：4 個新地點要帶著遺物才走得進去，用掉遺物換一段故事——把制服還回空屋（戶口名簿的一頁）、把木屑放回燈街本店櫃台（＋80「沒記過的收入」，外稿木屑的乙案）、把門牌放回水底郵筒（明信片「不用下來」）、把信貼回水牆（負擔－2）。 | `batch1.yaml` |
| 7 | **沒人理的遺物有自己的小事**：3 件新散事只在身上有那件遺物時發生——發票中獎（兌 60 或留著）、悠遊卡在路口嗶一聲（看見斷崖下的車燈＝提早打開維修梯）、課本上的山變高了（林老師說位置是北礦）。 | `batch1.yaml` |
| 8 | **警示三件分化，而且說出幾成**：三件都會在「再按一次」時說「大概六成會出事」，帶著時危險地點按鈕上也寫機率；另外玻璃蕨葉＋守夜 0.5、籤詩回程少一成、黃燈燈罩所有危險再少一成（`protectAll`）。 | `relic_fx.yaml`；機率顯示已在 main |
| 9 | **店裡數值調到看得出來**：客流＋0.3 的三件改＋1、糖果紙會賣＋1、風鈴守夜＋1；守夜現在會減少夥計抽成與假貨損失；白花＋客單價；日報多一行「店裡的遺物，今天大約多賺 X 靈石」；林老師研究過的遺物，好的那一面加強一半（代價不變）。 | `relic_fx.yaml`；守夜／研究／日報那行已在 main |
| 10 | **防呆**：`build.py` 新增檢查——每件遺物至少要有一種實際作用（店裡、出門、警示、夜裡、可用、或被某個 `need.has` 讀到）、保護的死法一定要真的會發生、`use` 欄位格式正確、列出只靠隨機池才拿得到的遺物（目前 0 件）。`tools/batch_test.py` 加 30 項 PASS/FAIL：5 個地點的回程保護、7 種「用」、4 把鑰匙、10 個事件選項、研究加強、黃燈燈罩。 | `build.py`、`tools/batch_test.py` |

跟 `issues2.txt` 十條的關係：沒有重做那十條（「新」標記、找上門太多、超重丟東西、回溯記憶、謎題跨局、隨身三格、主畫面太長、謹慎太空、日報重複、第一天就死）。第 2 項的「剪票上行」「擦掉今天」「喝一口冷茶」剛好給第 3 條「超重之後只能賭」多幾條不用新介面的退路；第 6、7 項給第 8 條「謹慎太空」多了不用賭命的推進。第 6 條「隨身三格」如果要做，第 1、9 項的效果都還是同一套 `relicEff()`，只要在那裡過濾就好。

## 三、每一件遺物：從哪裡來、哪裡用得到（合併後）

「來源」是固定事件／地點／開張加成；「隨機池」是夥計收購（`pickRelic`）；「誰認得它」是會讀 `need.has` 的事件、地點、選項或死法的 `unless`。

| id | 名稱 | 固定來源 | 隨機池 | 誰認得它 | 作用種類 |
|---|---|---|---|---|---|
| `youyou` | 舊悠遊卡 | dr_lost_card, ru_bus | 隨機池 | dr_youyou_beep | carry |
| `lupai` | 路牌碎片 | ru_edge, tu_dig | 隨機池 | — | carry |
| `anquanmao` | 舊安全帽 | ru_scrap | 隨機池 | — | carry |
| `keben` | 課本殘頁 | re_shore, ru_scrap | 隨機池 | dr_keben_hill | night |
| `shouji` | 碎螢幕手機 | cl_search | 隨機池 | dr_one_bar | passive |
| `zhuban` | 主機板碎片 | tu_dig | 隨機池 | — | passive |
| `biao` | 倒走的錶 | tu_watch, 開張加成 b_biao | 隨機池/深層池 | dr_watch_count, dr_watch_rain, dr_watch_zero, lampst_stay | night |
| `huishi` | 回聲石 | tu_echo, 開張加成 b_huishi | /深層池 | dr_echo_reply, echo_answer, se_breath_box | passive、carry |
| `xianshui` | 斜的海水 | cl_bottle | — | dr_sea_tilt | carry |
| `wuguan` | 一罐霧 | re_fogjar | — | — | carry |
| `boliye` | 玻璃蕨葉 | dr_glass_fern, tu_mouth | 隨機池 | — | passive、warn |
| `xianbei` | 新鮮的貝殼 | cl_search, dr_shell_roof, re_shore, ru_scrap, tu_water | 隨機池 | — | carry |
| `chanke` | 大蟬殼 | cl_search, se_backyard_knock, tu_dig | 隨機池 | — | carry |
| `bijiben` | 數字筆記本 | tu_car | 隨機池 | — | passive、night |
| `luyin` | 錄音帶 | re_village | 隨機池 | no_tape | passive |
| `qianshi` | 籤詩 | ru_shrine | 隨機池 | — | carry、warn |
| `hongzhu` | 黑玻璃珠 | cl_path, se_amei_missing, st_gather | /深層池 | dr_bead_two | passive、night |
| `lengyu` | 冷羽毛 | dr_fog_again, dr_fog_voice, no_feather, se_heigou_box, st_gather, 開張加成 b_lengyu | 隨機池/深層池 | dam_dive, dr_frost_night, frost_bare | carry |
| `zhibei` | 指南針 | cl_camp, 開張加成 b_zhibei | 隨機池 | cl_path, fog_lamp, footprint_match | carry |
| `fushi` | 不沉的石頭 | re_float, re_shore, 開張加成 b_fushi | 隨機池/深層池 | wall_hand | carry |
| `fapiao` | 統一發票 | dr_mist_post, ls_gather, ru_scrap | 隨機池 | dr_fapiao_draw | night |
| `huangdeng` | 黃燈燈罩 | dr_yellow_light, tu_dig | 隨機池 | — | carry、warn |
| `jinianc` | 畢業紀念冊 | dr_yearbook, ru_scrap | 隨機池 | — | carry |
| `fengling` | 鐵管風鈴 | dr_wind_chime, tu_dig | 隨機池 | se_robbery | passive |
| `daoyu` | 倒雨罐 | dr_rain_up | 隨機池 | — | night |
| `xiaozhong` | 小銅鐘 | dr_well_bell2, re_shore | 隨機池 | dr_bell_night | passive |
| `piaogen` | 公車票根 | cl_search, dr_bus_stranger, ru_ticket, st_gather, 開張加成 b_piaogen | 隨機池 | bus_board | carry |
| `shenhua` | 深淵的花 | dr_abyss_digger, st_flowers, st_gather | — | dr_flowers_turn, st_eat | passive、night |
| `wenbi` | 溫的硬幣 | dr_vending, ls_gather, pf_gather, ru_dig_deep, se_night1, 開張加成 b_wenbi | 隨機池/深層池 | dr_vending, se_night2 | passive、carry |
| `laixin` | 水牆裡的信 | tu_wall_hand | — | tu_letter | carry |
| `cunpai` | 水底村子的門牌 | re_dive | /深層池 | re_plate | carry |
| `budeng` | 不熄的燈泡 | ls_gather, ls_shop, re_follow | /深層池 | — | passive |
| `wanchu` | 半空船上的碗 | cl_ship_climb | 隨機池/深層池 | — | carry |
| `ventpaper` | 通風口吐出的紙 | no_vent_in | — | — | passive、carry |
| `wuzhen` | 沒有指針的鐘 | ls_clock | — | — | carry |
| `zhanwu` | 站務日誌 | pf_office | — | — | carry |
| `chepiao` | 末班車車票 | pf_gather, st_bus | 隨機池 | — | carry |
| `tangzhi` | 倒影糖果紙 | dr_kid_year, ls_gather, se_annex_room | 隨機池/深層池 | — | passive |
| `guangbo` | 月台廣播稿 | pf_gather | 隨機池/深層池 | — | passive、carry |
| `naiya` | 還有溫度的乳牙 | sc_roll, 開張加成 b_naiya | 隨機池 | roll_called | carry、use |
| `chachou` | 沒有字的茶籌 | tea_chou | 隨機池 | — | passive、use |
| `banbei` | 半杯冷茶 | tea_half | — | — | passive、use |
| `dengsui` | 還燙的燈泡碎片 | ls_flicker | — | se_amei_missing | carry、use |
| `tuoxie` | 負責人的拖鞋 | st_plate | — | st_inner, st_slipper | passive |
| `quepiao` | 缺角的上行票 | pf_ticket | — | — | carry、use |
| `zhifu` | 摺好的舊制服 | hm_fold | 隨機池 | dr_flowers_turn, hm_return | carry |
| `banpai` | 借來的半拍 | no_shell, 開張加成 b_banpai | — | — | carry、use |
| `muxie` | 分號招牌的木屑 | dr_branch_sign, 開張加成 b_muxie | 隨機池 | ls_branch_pay | passive |
| `xiangpi` | 遲到者的橡皮 | sc_eraser | 隨機池 | — | use |
| `qianbi` | 空號鉛筆 | dr_patrol_roll | 隨機池 | — | passive、night |
| `baihua` | 蓋住的白花 | st_cover | 隨機池 | dr_flowers_turn | passive、carry |

### 還沒有任何事件認得的遺物：每一件的接法建議（下一輪可直接寫成 YAML）

只用既有欄位（`need.has`、`take`、`give`、`flag`、`fx`），不用改程式。

| 遺物 | 接到哪個事件／地點 | 加什麼選項 | 帶著它會怎樣 |
|---|---|---|---|
| `lupai` 路牌碎片 | 崩塌段 `ru_edge` 之後新地點「把路牌插回路口」 | `need: {has: {lupai: 1}}` | 用掉，往埔里的方向多一行字「32 公里」，`flag: road_sign_back`，之後崩塌段的翻翻看多一種結果 |
| `anquanmao` 舊安全帽 | 散事 `dr_branch_sign`（隔壁多了一塊招牌） | 「戴安全帽爬上去拆」 | 拆的時候多掉一撮木屑（多給一份 `muxie`），不戴的人就沒有這個選項 |
| `zhuban` 主機板碎片 | 舊國小 `sc_tape` 卡帶 | 「把主機板接上錄音機」 | 卡帶多出後半段（外稿事件 17 乙案「後半段在別的卡帶」），`note` 一則、`xp` |
| `wuguan` 一罐霧 | 散事 `dr_fog_again`／`dr_fog_voice` | 「打開罐子，讓霧進去」 | 霧被罐子吸走一半，安全收場並給 `xp`；沒罐子的人只能關門 |
| `boliye` 玻璃蕨葉 | 店裡事件 `se_bad_pill`（沒有標籤的藥丸） | 「把蕨葉放在藥丸旁邊」 | 蕨葉響了——直接知道是壞藥，倒掉也不虧 |
| `xianbei` 新鮮的貝殼 | 斷崖 `cl_bottle` | 「把貝殼放進海水瓶」 | 瓶子裡的海轉了方向，給 `xianshui` 的伏筆 `flag: sea_turned` |
| `chanke` 大蟬殼 | 北礦 `no_shell`（礦坑口的殼） | 「把蟬殼放在殼的膝蓋上」 | 殼的裂縫合起來一點，`no_shell_sit` 的死亡機率在 `unless` 加 `flag: shell_fed` |
| `bijiben` 數字筆記本 | 聽雨茶館 `tea_story` 說書人 | 「把筆記本最後一行念給他聽」 | 說書人把跳過的那句講完一半（外稿事件 18 甲案），代價：壽命－1 |
| `qianshi` 籤詩 | 崩塌段土地公廟 `ru_shrine` 新的重複點 | 「把籤詩還給土地公」 | 換一張新的籤（`give` 隨機一句 `note`），每月一次 |
| `huangdeng` 黃燈燈罩 | 燈街 `ls_enter` | 「把燈罩套在不準時的那盞燈上」 | 那盞燈準時了，`flag: lamp_on_time`，`ls_return` 的死亡改成 `unless` 這個旗標 |
| `jinianc` 畢業紀念冊 | 舊國小 `sc_roll` 之後 | 「翻到三年二班那頁」 | 照片上的空位旁邊有名字，推進點名簿謎題一步（給 `stop_card` 的替代路徑，緩解 issues2 第 5 條） |
| `daoyu` 倒雨罐 | 散事 `dr_frost_night` | 「把罐子放在窗台」 | 雨往上落，把霜沖掉，`flag: frost_closed`，`burden: -1` |
| `budeng` 不熄的燈泡 | 店裡事件 `se_night1`（夜班帳本） | 「把燈泡掛在店門口」 | 夜班客人多一位，`stones` 加成並給 `night_guest_seen` 的另一種開頭 |
| `wanchu` 半空船上的碗 | 斷崖 `cl_ship_climb` 之後 | 「把碗放回船上的餐桌」 | 用掉，船放下一條繩梯，`burden: -2`、`xp` |
| `ventpaper` 通風口吐出的紙 | 北礦 `no_vent_in` | 「照值班表上的時間進去」 | 「不是我們的人」那句換成名字，`note` 一則，代價守夜－0.5 解除（`take`） |
| `wuzhen` 沒有指針的鐘 | 燈街 `ls_clock` | 「把鐘放回 23:58 的鐘塔」 | 整條街的鐘走了一分鐘，`flag: lampst_minute`，給燈街結尾段落一條補述 |
| `zhanwu` 站務日誌 | 無底月台 `pf_wait` | 「把日誌交給站務室的人」 | 「代子寄存」那頁被領走，`pf_wait` 的死亡加 `unless`，`lifespan: +1` |
| `chepiao` 末班車車票 | 維修梯 `st_bus`（末班車） | 「拿車票給司機看」 | 司機說「回程票」，搭車往上：`burden` 歸零並跳過回程判定（`fx.burden: -99`） |
| `tangzhi` 倒影糖果紙 | 散事 `dr_kid_year` | 「把糖果紙還給那個小孩」 | 小孩給你一句燈街的話，`note`、`rel: {lin: 1}` |
| `guangbo` 月台廣播稿 | 無底月台 `pf_announce` | 「照稿子念被劃掉的那句」 | 廣播改口「請旅客回到地面」，`pf_yellow` 的死亡加 `unless`，代價客流－0.5 解除 |
| `qianbi` 空號鉛筆 | 管理處告發（`intel.yaml` 的 `accuse`）或 `dr_overtime_due` | 「用鉛筆把加班單上的名字改掉」 | 加班單作廢不用付 60，`take` 鉛筆；這是外稿「在名簿上改一個字」的原意 |

外稿沒整合的兩件事件也建議照這個方式補：
- **5 長生當鋪的夜鈴**：當鋪 `pawn` 加一個傍晚限定地點，甲「說你來取」→新遺物「暫存的握力」（`carry.protect` 攀爬類 `ship_climb`／`greed_dig`），乙「燒掉收據」→伏筆旗標，丙「鎖回去」→`stones`＋代價旗標。
- **14 寒潭會的借條**：當鋪地點，甲「收進帳本」→店裡 `margin`（可做成遺物「濕帳」，代價 `night` 負擔），乙→後山伏筆，丙「塗掉抵押品」→遺物「塗掉的氣」保護 `breath_box`。

## 四、只提建議、沒有實作

- **領到物品的卡片要有圖示**（美術稽核）：晨報卡、地點結果卡的「得到「X」」前面加 `icon(id,'sm')`。要改 `applyFx` 的 notes 結構（目前是純文字），所以這個分支沒動，留給 main。
- **經濟**：模擬 30 局，careful／lamp 局末靈石從約 1000 變約 1500（店裡遺物＋守夜＋鑰匙地點的靈石）。原本局末就花不完，所以影響不大；如果要壓，先把三件客流遺物從＋1 調回＋0.6。
- `pickRelic` 的淺層隨機池會抽到故事型遺物（naiya、zhifu、muxie、新的三件），可能讓人在沒走過那段故事前就拿到。可以在 items 加 `noPool: true` 排除。

## 五、這個分支改了哪些檔

- `content/relic_fx.yaml`、`content/batch1.yaml`、`content/shop.yaml`、`content/events_more.yaml`
- `build.py`（遺物防呆檢查）、`tools/batch_test.py`（遺物測試）
- `README.md`（數字更正、`use` 說明）、`dist/game.html`、`dist/data.json`（`python3 build.py` 產生）
- 本檔 `DIRECTOR_AUDIT.md`
- **沒有改 `game.js`**（引擎改動已在 main `cf83975`）、沒有動 `tools/play.py`。

## 六、測試

- `python3 build.py`：51 件遺物、可用 7 件、被事件認得 25 件、只靠隨機池 0 件；46 種死法全部有定義。
- `tools/batch_test.py`：原有定點測試全過，新增 30 項 PASS、0 FAIL，沒有 JS 錯誤。
- `tools/smoke.py`：存檔／重新整理正常，沒有錯誤。
- `tools/harness.py sim … 30`：7 種風格沒有 JS 錯誤；死亡率、結局分布跟改之前一樣（careful／lamp／ledger／explorer 0% 死亡，結局 100% 同一條）；遺物觸發 `rlog` careful 4.8→7.3、lamp 9.8→13.8。
- Playwright 手機畫面實測：庫房出現 7 個「用」按鈕；在北礦捏燈泡碎片、剪票上行（負擔 12→6、平安回聚落）；斷崖的危險按鈕寫「幾乎一定會出事」；日報出現「店裡的遺物，今天大約多賺 5 靈石」。截圖在 `/workspace/shots_director/`。
