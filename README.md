# 🌸 粉嫩藥盒 PillPal

> 可愛粉嫩風的用藥庫存管理 PWA —— 以 **Phaser 藥櫃場景** 結合 **React HUD** 打造，手機直向優先、支援離線安裝，所有資料 100% 留存本機。

## ✨ 核心功能

- **Phaser 互動藥櫃場景**
  - 三層粉嫩藥櫃，每種藥品化身為專屬微笑劑型精靈，依緊急程度自動排序上架（超過 15 種顯示 `+N` 氣泡）。
  - 依庫存狀態自動切換動態表情：正常悠閒浮動、低庫存（≤ 3 天）橘色抖動冒汗、已用完灰化睡覺飄 `Z`、尚未開始薄荷色、PRN 按需輕飄。
  - 點擊藥櫃精靈播放 WebAudio 泡泡音效，自動捲動並閃現對應藥品卡片；點擊右上角大膠囊吉祥物觸發鼓勵彩蛋；頁面隱藏時自動休眠省電。
- **雙餘量與完整包裝換算**
  - 支援常見處方用法（`QD`、`BID`、`TID`、`QID`、`Q4H`～`Q12H`、`HS`、`QOD`、`QW`、`PRN` 與自訂次數）自動換算每日用量與預計用完日，並於跨午夜自動更新。
  - 卡片將 **「今日用量」** 與 **「扣除今日後剩餘」** 分開顯示，剩餘用量以直覺的 **「完整包裝＋散裝單位」** 呈現（例如 `2盒+7錠`、`1瓶+15mL`）。
- **忘吃／多吃快速修正與盤點校正**
  - 卡片內提供單手可及的 **「漏吃 ＋1劑」**、**「多吃 －1劑」** 快速修正按鈕，立即重算餘量、剩餘天數與藥櫃精靈狀態；記錄多吃時跳出暖心安全提醒。
  - 提供 **「盤點校正」** 底部抽屜，可切換「今天還沒吃（含今日）」或「今天已吃完（不含今日）」，直接填入實際清點的完整盒數與散裝數，並支援一鍵恢復依排程計算。
- **8 款可愛化劑型小圖示＋實拍照片**
  - 內建 8 款零外部素材的粉嫩微笑劑型圖示：**微笑膠囊、奶油圓錠、愛心糖衣、草莓藥水、薄荷滴管、薰衣草藥包、雲朵噴霧、蜜桃軟膏**，支援依單位自動推薦，並同步呈現於卡片頭像與藥櫃場景。
  - 亦支援上傳藥品實拍照片（自動壓縮並儲存於本機 IndexedDB）。
- **個人化與離線 PWA 體驗**
  - 支援 **繁體中文／English** 即時切換，以及 **Huninn（粉圓）**／**Iansui（芫荽）** 兩款 Google Fonts 可愛字型切換。
  - 完整 PWA 設定（Service Worker 離線快取、字型快取、自動更新、Android 一鍵安裝與 iOS 加入主畫面引導）。
  - 實體方向偵測直向防護罩，於手機直向開啟虛擬鍵盤編輯表單時不誤觸橫向提示。
- **100% 本機隱私**
  - 用藥紀錄與設定僅存於瀏覽器 `localStorage`，照片存於 `IndexedDB`，不會上傳至任何伺服器。

## 🛠️ 技術架構

| 類別 | 技術 |
| :--- | :--- |
| 遊戲場景引擎 | Phaser 4（程式化繪製紋理、Tween 動畫、粒子系統、WebAudio 音效） |
| 前端框架 | React 19 + TypeScript |
| 建置與 PWA | Vite 8 + `vite-plugin-pwa` + `@vite-pwa/assets-generator` |
| 本機儲存 | `localStorage` + `idb-keyval`（IndexedDB） |
| 跨層通訊 | `Phaser.Events.EventEmitter` 單例 EventBus |
| 自動部署 | GitHub Actions → GitHub Pages |

## 🚀 快速開始

需要 **Node.js >= 20.19**（建議 **Node.js 22**）。

```bash
# 1. 安裝相依套件
npm install

# 2. 產生 PWA 圖示（首次或修改 public/logo.svg 後）
npm run icons

# 3. 啟動本機開發伺服器（http://localhost:3000）
npm run dev
```

### 常用指令

```bash
npm run lint     # TypeScript 型別檢查（tsc --noEmit）
npm run build    # 自動產 PWA 圖示 + 型別檢查 + 正式打包（dist/）
npm run preview  # 本機預覽正式建置版本（含 Service Worker）
```

## 📦 GitHub Pages 自動部署

專案已內建 `.github/workflows/deploy.yml`：

1. 在 GitHub Repository 前往 **Settings → Pages → Source** 選擇 **GitHub Actions**。
2. 推送程式碼至 `main` 分支（或於 Actions 頁面手動觸發）即可自動建置與部署。
3. `vite.config.ts` 會依 `GITHUB_REPOSITORY` 自動判斷專案子路徑 `base`（例如 `/<repo>/`，個人主站 `<user>.github.io` 則自動使用 `/`）。

## ⚠️ 免責聲明

本工具僅供個人藥品庫存追蹤與估算之用，不構成任何醫療建議或診斷；實際用藥劑量、服藥間隔與漏服／誤服處置，請務必遵循醫師或藥師指示。

## 📄 授權與字型致謝

- 本專案程式碼採用 [MIT License](./LICENSE) 授權。
- 字型採用 SIL Open Font License (OFL) 開源字型：[Huninn（粉圓）](https://fonts.google.com/specimen/Huninn) 與 [Iansui（芫荽）](https://fonts.google.com/specimen/Iansui)。
