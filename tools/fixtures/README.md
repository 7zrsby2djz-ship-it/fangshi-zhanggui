# W05 舊版存檔樣本

2026-10-04｜本輪從原 `game.js` 生成的代表性 v1 JSON，**非真實玩家歷史存檔**。

生成基底為 W05 施工基底 `431b4b0197ae506448d14762338f55bfa9f8bc71` 的遊戲程式及資料；種子固定 `5052026`。先用 `newGame` 開局，實際交易取得舊物，再到市場以原 `decide` 領燈；同一現場重按一次並確認只有一盞。生成腳本走公開函式，不注入替代存讀檔邏輯。

- `legacy_v1_missing_defaults.json`：以上遊玩狀態僅刪去原 `DEFAULTS` 可補的11個頂層欄位，代表早期 v1 欄位形狀。不是從歷史版本或玩家蒐集的檔案。
- `legacy_v1_active_event.json`：沿原操作推進到第4日，保留一筆已決定但尚未關閉的交易、既有到期事件、消息、關係、記憶及完成記錄。

重生：先 `python build.py`，再 `node tools/test_legacy_save.js --generate-fixtures`。平常驗收用 `node tools/test_legacy_save.js`，不覆寫 fixture。檔案保留原ID／單位／旗標；W05不做新版故事或公制遷移。Node DOM容器只承接renderer的寫入，無瀏覽器排版或互動保證。

`w05_content_sha256.json`另保存已發佈基底`cc95bd3abf9e4fe3f678fc75d3887ae2dd7e0708`（與本地施工基底同內容樹）的八份YAML解析結果及完整D之正規化SHA256。指紋從固定基底生成，本輪逐檔等值核對；不依賴本地專屬commit，也不拿當前HEAD當永遠正確。Node重生fixture命令不會覆寫此指紋；只在W05的`--compare-baseline`使用，後續合法內容移植不要求維持此值。
