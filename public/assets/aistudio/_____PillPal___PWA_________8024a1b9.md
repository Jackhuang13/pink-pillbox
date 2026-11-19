# 🌸 粉嫩藥盒 PillPal — PWA 完整開發規劃書（v2・Phaser GameEngine 原生版）

> **版本** 2.0.0 ｜ **日期** 2026-11-18
> **定位**：以 **Phaser 遊戲框架**承載的用藥管理 PWA。首頁＝「粉嫩藥櫃」遊戲場景，每種藥是一隻膠囊小精靈；React＝遊戲外圍 HUD。手機直向、可安裝、離線可用，GitHub Pages（Actions）自動部署。
> 本文件為單檔交付：架構 → 計算規則 → **33 個檔案完整程式碼** → 部署 → 驗收。依序建檔即可執行。

---

## 1. 需求對照

| 需求 | 實作 | 位置 |
|---|---|---|
| Phaser GameEngine 框架 | 首頁＝ShelfScene 遊戲場景（主迴圈/渲染/動畫/粒子/音效/點擊偵測）；React＝HUD | `src/game/*`、`src/components/PhaserGame.tsx` |
| 首頁：用藥總覽 | 藥櫃場景＋統計 chips＋卡片列表（緊急度排序） | `src/pages/HomePage.tsx` |
| 首頁：設置／新增入口 | ⚙️ 按鈕、＋ FAB、空狀態按鈕 | 同上 |
| 列表：品名／代碼／起始日／剩餘日數 | 卡片標題、`#代碼` chip、📅 badge、天數大字 | `src/components/MedCard.tsx` |
| 剩餘餘量＝「扣除一天之餘量」＋「今日用量」分開顯示 | 🌞／🎀 兩格並排＋總剩餘＋進度條 | 同上 |
| 設置：繁中／英文 | i18n 字典即時切換、持久化 | `src/i18n.ts`、`SettingsPage.tsx` |
| 設置：Iansui／Huninn | Google Fonts 繁中字型、CSS 變數即時套用＋預覽卡 | 同上 |
| 新增：代碼／品名／圖片／用法／單劑量／總包裝數／散裝粒數 | 全欄位表單＋每包裝含量＋單位＋起始日＋備註；照片壓縮存 IndexedDB | `src/pages/AddMedPage.tsx` |
| 用法自動換算每日量 | QD…QW／PRN／自訂 × 單劑量，即時試算 | `src/domain/frequency.ts`、`calc.ts` |
| 可愛粉嫩風 | 粉紅×奶油×薄荷×薰衣草、膠囊圓角、粒子氛圍 | `src/styles.css`、`src/game/textures.ts` |
| PWA install＋cache | manifest＋Workbox precache＋字型 runtime cache＋一鍵安裝 | `vite.config.ts`、`src/pwa.ts` |
| 手機限直向 | manifest orientation＋orientation.lock＋橫向遮罩三層 | `src/pwa.ts`、`PortraitGuard.tsx` |
| GitHub Pages（Actions） | push main 自動部署；base 自動偵測 repo 名 | `.github/workflows/deploy.yml` |

## 2. 架構：GameEngine 下的用藥應用（對應 5 條規範）

**本專案就是一個 Phaser 遊戲框架應用。** 用藥管理以「遊戲場景＋HUD」表達：每種藥品是住在層架上的膠囊小精靈，庫存狀態即牠的動畫表情；React 是外圍 HUD（列表＝背包、表單＝對話框、設置＝系統選單）。

| 規範 | 落實 |
|---|---|
| ① 關注點分離 | **Phaser**：遊戲主迴圈（tween/粒子）、場景渲染、Sprite 狀態動畫、WebAudio 音效、hit area 點擊偵測。**React**：HUD（統計/卡片/雙餘量）、表單、設置、Toast；無 rAF/setInterval 遊戲邏輯。`domain/` 純函式計算引擎供應兩層 |
| ② EventBus | `src/core/EventBus.ts`＝**`new Phaser.Events.EventEmitter()` 單例**（型別安全封裝），契約見 §2.2 |
| ③ 生命週期 | `<PhaserGame />` useRef 存 Game、cleanup `game.destroy(true)`（StrictMode 無雙畫布）；Scene SHUTDOWN/DESTROY 必 off；React 監聽器 cleanup off；Object URL revoke；頁面隱藏 `loop.sleep()` |
| ④ 無外部圖片 | 場景紋理全數 `Graphics + generateTexture` 生成；PWA PNG 由自繪 SVG 建置產出；照片存 IndexedDB；音效 WebAudio 合成零素材 |
| ⑤ 輸出格式 | 每檔完整路徑＋完整程式碼，無省略 |

### 2.1 遊戲化表達（功能 ↔ 場景）

| 功能 | 場景語言 |
|---|---|
| 用藥總覽 | 三層層架，每藥一隻精靈（品名標籤＋剩餘天數徽章），緊急度排序上架；>15 種顯示「+N」泡泡 |
| 庫存狀態 | ok 悠閒浮動；low≤3天 橘色抖動＋汗滴；empty 灰化睡覺飄 Z；future 薄荷慢浮動；prn 半透明飄浮 |
| 點擊藥品 | hit area → `med:selected` → HUD 卡片捲動定位＋粉紅閃現 |
| 新增/刪除/編輯 | 表單 → store → `meds:sync` → 場景 pop-in／pop-out |
| 吉祥物彩蛋 | 右上角大膠囊點擊 → 泡泡音效＋鼓勵 Toast＋搖擺 |
| 氛圍 | 漸層背景、圓點桌布、層架投影、sparkle 粒子 |

### 2.2 EventBus 事件契約

| 事件 | 方向 | Payload | 用途 |
|---|---|---|---|
| `meds:sync` | React→Phaser | `{ meds: SceneMed[] }` | 上架／更新／下架 |
| `scene:ready` | Phaser→React | — | 就緒要求重送同步 |
| `med:selected` | Phaser→React | `id` | 卡片定位＋閃現 |
| `ui:toast` | 雙向 | `{ key, vars? }` | i18n 提示泡泡 |
| `ui:navigate` | React 內部 | `View` | 導航 |
| `pwa:installable` | PWA→React | `boolean` | 安裝按鈕 |

## 3. 技術棧

| 類別 | 套件 | 版本 |
|---|---|---|
| 遊戲引擎 | phaser | ^3.90.0 |
| UI | react / react-dom | ^18.3.1 |
| 語言 | typescript | ~5.6.3 |
| 建置 | vite | ^5.4.11 |
| PWA | vite-plugin-pwa | ^0.21.1 |
| 圖示 | @vite-pwa/assets-generator | ^0.2.6 |
| 儲存 | idb-keyval | ^6.2.1 |
| CI/CD | GitHub Actions + Pages（Node 20） | actions v4 |

## 4. 資料模型與計算規則

### 4.1 Medication 欄位
`id`(UUID)、`code`(代碼,可空)、`name`(品名,必填)、`imageId?`(IndexedDB key)、`freq`(用法代碼)、`customTimesPerDay?`、`dosePerIntake`(單劑量,0.25 步進)、`unit`(tablet/capsule/ml/drop/pack)、`packCount`(總包裝數)、`unitsPerPack`(每包裝含量)、`looseCount`(散裝粒數)、`startDate`(YYYY-MM-DD 本地日)、`notes?`、`createdAt`。

### 4.2 用法換算
QD=1、BID=2、TID=3、QID=4、Q4H=6、Q6H=4、Q8H=3、Q12H=2、HS=1、QOD=0.5、QW=1/7、PRN=不估算、CUSTOM=自訂次數。

### 4.3 公式（`src/domain/calc.ts`）
```text
每日用量 daily      = 單劑量 x 每日次數
總量 total          = 總包裝數 x 每包裝含量 + 散裝粒數
已消耗 consumed     = min(總量, 經過天數(不含今日) x 每日用量)
含今日剩餘 remaining = max(0, 總量 - 已消耗)
今日用量 todayDose   = min(每日用量, 含今日剩餘)     <- 尚未開始 = 0
扣除一天之餘量 after = max(0, 含今日剩餘 - 每日用量)  <- 尚未開始 = 總量
剩餘日數 days       = ceil(含今日剩餘 / 每日用量)    <- 含今日；PRN 不估算
預計用到 runOut     = 今日 + 剩餘日數 - 1
```
> 畫面：**含今日剩餘 ＝ 今日用量 ＋ 扣除一天之餘量**，兩格分開顯示。

### 4.4 實例（今天＝2026-11-18）
| 情境 | 總量 | 每日 | 起始 | 含今日剩餘 | 今日 | 扣除後 | 剩餘日數 | 用到 |
|---|---|---|---|---|---|---|---|---|
| A 28錠/盒+散2，BID×1 | 30 | 2 | 11-10 | 14 | 2 | 12 | 7 | 11-24 |
| B 20錠 TID×0.5 | 20 | 1.5 | 今日 | 20 | 1.5 | 18.5 | 14 | 12-01 |
| C 14錠 QOD×1 | 14 | 0.5 | 今日 | 14 | 0.5 | 13.5 | 28 | 12-15 |
| D PRN 30錠 | 30 | — | 今日 | 30 | 0 | 30 | — | — |
| E 未來 11-20 起 BID×1 | 30 | 2 | 11-20 | 30 | 0 | 30 | 15(自起始) | 12-04 |
| F 剩1錠 每日2 | 1 | 2 | 今日 | 1 | 1 | 0 | 1 | 今日 |

### 4.5 邊界
小數顯示 2 位、計算全精度、ceil 前扣 1e-9；QOD/QW 平均估算 ±1 天；PRN 不估天數；未來起始日「尚未開始」；日期手動解析本地日避免 UTC 漂移；跨午夜 `useToday` 自動刷新；≤3 天「快沒囉！」、0「已用完」。

### 4.6 儲存（100% 本機）
藥品＋設置→localStorage(`pillpal:v1`)；照片→IndexedDB；App 殼→SW precache。

## 5. 快速開始
```bash
npm install     # 產生 package-lock.json（務必 commit，CI 用 npm ci）
npm run dev     # http://localhost:5173
npm run build   # 型別檢查 + 產 PWA 圖示 + 打包
npm run preview # 驗證 production（含 SW）
```

## 6. 專案結構（33 檔）
```text
pillpal/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   └── logo.svg
├── src/
│   ├── components/
│   │   ├── MedCard.tsx
│   │   ├── PhaserGame.tsx
│   │   ├── PillAvatar.tsx
│   │   ├── PortraitGuard.tsx
│   │   └── Toast.tsx
│   ├── core/
│   │   ├── EventBus.ts
│   │   └── types.ts
│   ├── domain/
│   │   ├── calc.ts
│   │   └── frequency.ts
│   ├── game/
│   │   ├── scenes/
│   │   │   └── ShelfScene.ts
│   │   ├── audio.ts
│   │   ├── textures.ts
│   │   └── types.ts
│   ├── pages/
│   │   ├── AddMedPage.tsx
│   │   ├── HomePage.tsx
│   │   └── SettingsPage.tsx
│   ├── App.tsx
│   ├── hooks.ts
│   ├── i18n.ts
│   ├── image.ts
│   ├── main.tsx
│   ├── pwa.ts
│   ├── store.tsx
│   ├── styles.css
│   └── vite-env.d.ts
├── .gitignore
├── index.html
├── package.json
├── pwa-assets.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 7. 完整程式碼（33 檔）

### A. 專案設定（8 檔）

#### 📄 `package.json`
```json
{
  "name": "pillpal",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "predev": "pwa-assets-generator",
    "icons": "pwa-assets-generator",
    "build": "tsc --noEmit && vite build",
    "prebuild": "pwa-assets-generator",
    "preview": "vite preview"
  },
  "dependencies": {
    "eventemitter3": "^5.0.1",
    "idb-keyval": "^6.2.1",
    "phaser": "^3.90.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vite-pwa/assets-generator": "^0.2.6",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.6.3",
    "vite": "^5.4.11",
    "vite-plugin-pwa": "^0.21.1"
  }
}
```

#### 📄 `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "useDefineForClassFields": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "node", "vite-plugin-pwa/client"]
  },
  "include": ["src", "vite.config.ts", "pwa-assets.config.ts"]
}
```

#### 📄 `vite.config.ts`
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 子路徑自動偵測：Actions 建置 "/<repo>/"；owner.github.io 站台 "/"；本機 "/"
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base =
  process.env.GITHUB_ACTIONS === 'true' && repo && !repo.endsWith('.github.io')
    ? `/${repo}/`
    : '/';

export default defineConfig({
  base,
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Phaser 獨立 vendor chunk：應用更新時引擎快取不失效
        manualChunks: { phaser: ['phaser'] }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '粉嫩藥盒 PillPal',
        short_name: '粉嫩藥盒',
        description: '可愛粉嫩風的用藥管理 PWA：藥櫃場景總覽、剩餘天數與餘量試算。',
        lang: 'zh-Hant',
        orientation: 'portrait',
        display: 'standalone',
        theme_color: '#ffd6e7',
        background_color: '#fff5f8',
        categories: ['health', 'lifestyle', 'medical'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ]
});
```

#### 📄 `pwa-assets.config.ts`
```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// 從 public/logo.svg 產出 pwa-64/192/512、maskable-512、apple-touch-icon-180
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { fit: 'contain', background: '#ffe3ef' }
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { fit: 'contain', background: '#ffe3ef' }
    }
  },
  images: ['public/logo.svg']
});
```

#### 📄 `index.html`
```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#ffd6e7" />
    <meta name="description" content="粉嫩藥盒 PillPal — 可愛粉嫩風的用藥管理 PWA" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="粉嫩藥盒" />
    <link rel="icon" href="%BASE_URL%logo.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon-180x180.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Huninn&family=Iansui&display=swap"
      rel="stylesheet"
    />
    <title>粉嫩藥盒 PillPal 🌸</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### 📄 `.gitignore`
```text
node_modules
dist
dev-dist
.DS_Store
*.local

# PWA 圖示由 prebuild 自動生成
public/pwa-*.png
public/maskable-icon-*.png
public/apple-touch-icon-*.png
public/favicon.ico
```

#### 📄 `.github/workflows/deploy.yml`
```yaml
# 推送 main 即自動建置並部署到 GitHub Pages（含 PWA 圖示產生）
name: Deploy PWA to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      # prebuild 產圖示 -> tsc 型別檢查 -> vite build；GITHUB_REPOSITORY 自動注入供 base 偵測
      - name: Build (icons + typecheck + bundle)
        run: npm run build

      - name: Configure Pages
        uses: actions/configure-pages@v5
        with:
          enablement: true

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 📄 `public/logo.svg`
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ffe3ef"/>
  <circle cx="96" cy="104" r="10" fill="#ffc9dd"/>
  <circle cx="428" cy="396" r="12" fill="#ffc9dd"/>
  <circle cx="420" cy="96" r="8" fill="#bfe8d4"/>
  <circle cx="92" cy="404" r="8" fill="#e6ddff"/>
  <g transform="rotate(-28 256 256)">
    <rect x="106" y="186" width="300" height="140" rx="70" fill="#ffffff" stroke="#f08bb4" stroke-width="14"/>
    <path d="M256 186 h80 a70 70 0 0 1 0 140 h-80 z" fill="#ff9ec4"/>
    <line x1="256" y1="186" x2="256" y2="326" stroke="#f08bb4" stroke-width="14"/>
    <circle cx="165" cy="242" r="10" fill="#6b4f5b"/>
    <circle cx="212" cy="242" r="10" fill="#6b4f5b"/>
    <path d="M168 272 q20 18 42 0" fill="none" stroke="#6b4f5b" stroke-width="9" stroke-linecap="round"/>
    <circle cx="146" cy="266" r="11" fill="#ffc9dd"/>
    <circle cx="230" cy="266" r="11" fill="#ffc9dd"/>
    <path d="M300 236 q14 -12 28 0" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
  </g>
  <path d="M396 150 l7 18 18 7 -18 7 -7 18 -7 -18 -18 -7 18 -7 z" fill="#ffd166"/>
  <path d="M118 352 l6 15 15 6 -15 6 -6 15 -6 -15 -15 -6 15 -6 z" fill="#bfe8d4"/>
</svg>
```

### B. 應用核心（12 檔）

#### 📄 `src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

#### 📄 `src/main.tsx`
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupPWA } from './pwa';
import './styles.css';

setupPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

#### 📄 `src/core/types.ts`
```ts
import type { FrequencyCode } from '../domain/frequency';

export type Unit = 'tablet' | 'capsule' | 'ml' | 'drop' | 'pack';
export type Lang = 'zh' | 'en';
export type FontName = 'Iansui' | 'Huninn';

export interface Medication {
  id: string;
  code: string;
  name: string;
  imageId?: string;
  freq: FrequencyCode;
  customTimesPerDay?: number;
  dosePerIntake: number;
  unit: Unit;
  packCount: number;
  unitsPerPack: number;
  looseCount: number;
  startDate: string; // YYYY-MM-DD（本地日曆日）
  notes?: string;
  createdAt: number;
}

export interface Settings {
  lang: Lang;
  font: FontName;
}

export type View =
  | { name: 'home' }
  | { name: 'settings' }
  | { name: 'add'; editId?: string };
```

#### 📄 `src/domain/frequency.ts`
```ts
export const FREQUENCIES = {
  QD: { timesPerDay: 1, zh: '每天一次', en: 'Once a day' },
  BID: { timesPerDay: 2, zh: '每天兩次', en: 'Twice a day' },
  TID: { timesPerDay: 3, zh: '每天三次', en: 'Three times a day' },
  QID: { timesPerDay: 4, zh: '每天四次', en: 'Four times a day' },
  Q4H: { timesPerDay: 6, zh: '每 4 小時一次', en: 'Every 4 hours' },
  Q6H: { timesPerDay: 4, zh: '每 6 小時一次', en: 'Every 6 hours' },
  Q8H: { timesPerDay: 3, zh: '每 8 小時一次', en: 'Every 8 hours' },
  Q12H: { timesPerDay: 2, zh: '每 12 小時一次', en: 'Every 12 hours' },
  HS: { timesPerDay: 1, zh: '睡前一次', en: 'At bedtime' },
  QOD: { timesPerDay: 0.5, zh: '每兩天一次', en: 'Every other day' },
  QW: { timesPerDay: 1 / 7, zh: '每週一次', en: 'Once a week' },
  PRN: { timesPerDay: 0, zh: '需要時使用', en: 'As needed' },
  CUSTOM: { timesPerDay: 0, zh: '自訂次數', en: 'Custom' }
} as const;

export type FrequencyCode = keyof typeof FREQUENCIES;

export const FREQUENCY_CODES = Object.keys(FREQUENCIES) as FrequencyCode[];

export function timesPerDay(freq: FrequencyCode, custom?: number): number {
  if (freq === 'CUSTOM') return Math.max(0, custom ?? 0);
  return FREQUENCIES[freq].timesPerDay;
}
```

#### 📄 `src/domain/calc.ts`
```ts
import type { Medication } from '../core/types';
import { timesPerDay } from './frequency';

export const DAY_MS = 86_400_000;
export const LOW_STOCK_DAYS = 3;

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toYMD(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function fmt(n: number): string {
  return String(Number(n.toFixed(2)));
}

export function dailyDose(m: Medication): number {
  return timesPerDay(m.freq, m.customTimesPerDay) * m.dosePerIntake;
}

export function totalUnits(m: Medication): number {
  return m.packCount * m.unitsPerPack + m.looseCount;
}

export type MedState = 'ok' | 'low' | 'empty' | 'future' | 'prn';

export interface MedStatus {
  total: number;
  daily: number;
  daysUsed: number;
  consumed: number;
  remainingWithToday: number;
  todayDose: number;
  remainingAfterToday: number;
  daysRemaining: number | null;
  runOutDate: string | null;
  usedRatio: number;
  state: MedState;
}

export function getStatus(m: Medication, today: Date): MedStatus {
  const total = totalUnits(m);
  const daily = dailyDose(m);
  const start = parseYMD(m.startDate);
  const future = diffDays(today, start) > 0;

  const daysUsed = future ? 0 : Math.max(0, diffDays(start, today));
  const consumed = Math.min(total, daysUsed * daily);
  const remainingWithToday = Math.max(0, total - consumed);

  const todayDose = future ? 0 : Math.min(daily, remainingWithToday);
  const remainingAfterToday = future
    ? remainingWithToday
    : Math.max(0, remainingWithToday - daily);

  const daysRemaining = daily > 0 ? Math.ceil(remainingWithToday / daily - 1e-9) : null;
  const anchor = future ? start : today;
  const runOutDate =
    daysRemaining !== null && daysRemaining > 0 ? toYMD(addDays(anchor, daysRemaining - 1)) : null;

  const usedRatio = total > 0 ? Math.min(1, consumed / total) : 0;

  let state: MedState;
  if (future) state = 'future';
  else if (daily <= 0) state = remainingWithToday > 0 ? 'prn' : 'empty';
  else if (remainingWithToday <= 1e-9) state = 'empty';
  else if (daysRemaining !== null && daysRemaining <= LOW_STOCK_DAYS) state = 'low';
  else state = 'ok';

  return {
    total, daily, daysUsed, consumed, remainingWithToday, todayDose,
    remainingAfterToday, daysRemaining, runOutDate, usedRatio, state
  };
}
```

#### 📄 `src/i18n.ts`
```ts
import type { Lang } from './core/types';

const zh = {
  appTitle: '粉嫩藥盒',
  appSubtitle: '今天也要乖乖吃藥喔 🌸',
  settings: '設置',
  addMed: '新增用藥',
  editMed: '編輯用藥',
  back: '返回',
  summaryTotal: '共 {n} 種藥',
  summaryLow: '{n} 種快見底',
  summaryAllGood: '庫存都健康 ✨',
  emptyTitle: '藥盒空空的～',
  emptyHint: '點下方「＋」新增第一筆用藥吧！',
  sceneHint: '點一下藥丸，跳到它的卡片 👆',
  mascotCheer: '今天也要乖乖吃藥喔 💪',
  name: '品名',
  namePlaceholder: '例：普拿疼 500mg',
  drugCode: '藥品代碼',
  drugCodePlaceholder: '例：AC58641100',
  optional: '選填',
  image: '藥品圖片',
  tapToUpload: '點一下上傳照片',
  changeImage: '更換圖片',
  removeImage: '移除圖片',
  frequency: '用法（自動換算每日量）',
  customTimesPerDay: '每日次數',
  dosePerIntake: '單劑量（每次用量）',
  unitLabel: '單位',
  unit_tablet: '錠',
  unit_capsule: '顆',
  unit_ml: 'mL',
  unit_drop: '滴',
  unit_pack: '包',
  packCount: '總包裝數（盒／瓶／排）',
  unitsPerPack: '每包裝含量',
  unitsPerPackPlaceholder: '例：一盒 28 錠',
  looseCount: '散裝粒數（不足一包）',
  startDate: '起始日期',
  notes: '備註',
  notesPlaceholder: '飯後吃、配開水…',
  previewTitle: '即時試算 ✨',
  dailyDoseLabel: '每日用量',
  totalLabel: '總量',
  daysLabel: '約可用',
  daysUnit: '天',
  perDay: '/天',
  perIntake: '每次',
  timesPerDaySuffix: '次/天',
  save: '儲存 🌸',
  cancel: '取消',
  edit: '編輯',
  delete: '刪除',
  confirmDelete: '確定要刪除「{name}」嗎？',
  remainingDaysLabel: '剩餘日數',
  todayDoseLabel: '今日用量',
  afterTodayLabel: '扣除今日後剩餘',
  totalRemainingLabel: '目前總剩餘',
  totalOf: '／總量 {total}',
  runOut: '預計用到 {date}',
  startsOn: '起始 {date}',
  notStarted: '尚未開始',
  statusLow: '快沒囉！',
  statusEmpty: '已用完',
  statusPrn: '按需使用',
  prnHint: 'PRN 按需使用：不估算剩餘天數',
  errName: '請填寫品名喔',
  errDose: '單劑量需要大於 0',
  errTotal: '總量需要大於 0（包裝或散裝擇一填寫）',
  errPack: '有包裝數時，請填每包裝含量',
  errTimes: '自訂用法請填每日次數',
  errDate: '起始日期格式不正確',
  saved: '已儲存，乖乖吃藥喔 💕',
  deleted: '已刪除',
  offlineReady: '已可離線使用囉 🎀',
  languageLabel: '語言 Language',
  fontLabel: '字型',
  fontPreviewText: '粉嫩藥盒，今天也要元氣滿滿！',
  fontIansuiDesc: '芫荽・手寫文青風',
  fontHuninnDesc: '粉圓・圓滾滾超可愛',
  installTitle: '安裝到手機',
  installBtn: '📲 安裝 App',
  installHintIos: 'iPhone：用 Safari 開啟 → 分享 → 加入主畫面',
  installHintInstalled: '已安裝，或此瀏覽器不支援一鍵安裝；可用瀏覽器選單的「安裝應用程式」。',
  aboutTitle: '關於',
  aboutText: '所有資料只存在你的手機裡（localStorage＋IndexedDB），不會上傳。本工具僅管理庫存，實際用藥請遵醫囑。',
  version: '版本',
  rotateTitle: '請轉回直向 📱',
  rotateHint: '粉嫩藥盒專為手機直向設計',
  custom: '自訂'
};

export type I18nKey = keyof typeof zh;

const en: Record<I18nKey, string> = {
  appTitle: 'PillPal',
  appSubtitle: 'Take your meds with a smile 🌸',
  settings: 'Settings',
  addMed: 'Add medication',
  editMed: 'Edit medication',
  back: 'Back',
  summaryTotal: '{n} medications',
  summaryLow: '{n} running low',
  summaryAllGood: 'All stocked up ✨',
  emptyTitle: 'Your pill box is empty',
  emptyHint: 'Tap the ＋ button below to add your first medication!',
  sceneHint: 'Tap a pill to jump to its card 👆',
  mascotCheer: 'You’ve got this — take your meds! 💪',
  name: 'Name',
  namePlaceholder: 'e.g. Panadol 500mg',
  drugCode: 'Drug code',
  drugCodePlaceholder: 'e.g. AC58641100',
  optional: 'optional',
  image: 'Photo',
  tapToUpload: 'Tap to upload a photo',
  changeImage: 'Change photo',
  removeImage: 'Remove photo',
  frequency: 'Frequency (auto daily dose)',
  customTimesPerDay: 'Times per day',
  dosePerIntake: 'Dose per intake',
  unitLabel: 'Unit',
  unit_tablet: 'tablet(s)',
  unit_capsule: 'capsule(s)',
  unit_ml: 'mL',
  unit_drop: 'drop(s)',
  unit_pack: 'pack(s)',
  packCount: 'Packages (boxes / bottles)',
  unitsPerPack: 'Units per package',
  unitsPerPackPlaceholder: 'e.g. 28 tablets per box',
  looseCount: 'Loose units',
  startDate: 'Start date',
  notes: 'Notes',
  notesPlaceholder: 'After meals, with water…',
  previewTitle: 'Live preview ✨',
  dailyDoseLabel: 'Daily dose',
  totalLabel: 'Total',
  daysLabel: 'Lasts about',
  daysUnit: 'day(s)',
  perDay: '/day',
  perIntake: 'per intake',
  timesPerDaySuffix: '×/day',
  save: 'Save 🌸',
  cancel: 'Cancel',
  edit: 'Edit',
  delete: 'Delete',
  confirmDelete: 'Delete “{name}”?',
  remainingDaysLabel: 'Days left',
  todayDoseLabel: 'Today’s dose',
  afterTodayLabel: 'Left after today',
  totalRemainingLabel: 'Remaining now',
  totalOf: 'of {total} total',
  runOut: 'Until {date}',
  startsOn: 'Starts {date}',
  notStarted: 'Not started',
  statusLow: 'Running low!',
  statusEmpty: 'Out of stock',
  statusPrn: 'As needed',
  prnHint: 'PRN: days left is not estimated',
  errName: 'Please enter a name',
  errDose: 'Dose must be greater than 0',
  errTotal: 'Total must be greater than 0 (packages or loose units)',
  errPack: 'Please fill units per package',
  errTimes: 'Please enter times per day',
  errDate: 'Invalid start date',
  saved: 'Saved. Stay healthy 💕',
  deleted: 'Deleted',
  offlineReady: 'Ready to work offline 🎀',
  languageLabel: 'Language 語言',
  fontLabel: 'Font',
  fontPreviewText: 'Stay sweet & healthy!',
  fontIansuiDesc: 'Iansui · gentle handwriting',
  fontHuninnDesc: 'Huninn · round & cute',
  installTitle: 'Install on your phone',
  installBtn: '📲 Install app',
  installHintIos: 'iPhone: open in Safari → Share → Add to Home Screen',
  installHintInstalled: 'Already installed, or this browser does not support one-tap install. Use the browser menu → Install app.',
  aboutTitle: 'About',
  aboutText: 'All data stays on your device (localStorage + IndexedDB) and is never uploaded. This tool tracks stock only — always follow your doctor’s instructions.',
  version: 'Version',
  rotateTitle: 'Please rotate back 📱',
  rotateHint: 'PillPal is designed for portrait mode',
  custom: 'Custom'
};

export function translate(
  lang: Lang,
  key: I18nKey,
  vars?: Record<string, string | number>
): string {
  let text: string = (lang === 'zh' ? zh : en)[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}
```

#### 📄 `src/core/EventBus.ts`
```ts
import Phaser from 'phaser';
import type { View } from './types';
import type { I18nKey } from '../i18n';
import type { SyncPayload } from '../game/types';

export interface ToastPayload {
  key: I18nKey;
  vars?: Record<string, string | number>;
}

/** 雙向通訊橋：React(HUD) ↔ Phaser(Scene) 的唯一通道 */
export type AppEventMap = {
  'meds:sync': (payload: SyncPayload) => void;
  'med:selected': (id: string) => void;
  'scene:ready': () => void;
  'ui:toast': (payload: ToastPayload) => void;
  'ui:navigate': (view: View) => void;
  'pwa:installable': (available: boolean) => void;
};

// 規範②：Phaser.Events.EventEmitter 單例模式
const bus = new Phaser.Events.EventEmitter();

/** 型別安全封裝：emit/on/off 與 Phaser 同簽名，事件與 payload 編譯期檢查 */
export const EventBus = {
  emit<K extends keyof AppEventMap>(event: K, ...args: Parameters<AppEventMap[K]>): void {
    bus.emit(event, ...args);
  },
  on<K extends keyof AppEventMap>(event: K, fn: AppEventMap[K], context?: unknown): void {
    bus.on(event, fn, context);
  },
  off<K extends keyof AppEventMap>(event: K, fn?: AppEventMap[K], context?: unknown): void {
    bus.off(event, fn, context);
  }
};
```

#### 📄 `src/store.tsx`
```tsx
import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import { del, set as idbSet } from 'idb-keyval';
import type { Lang, Medication, Settings } from './core/types';
import type { I18nKey } from './i18n';
import { translate } from './i18n';

const STORAGE_KEY = 'pillpal:v1';
const DEFAULT_SETTINGS: Settings = { lang: 'zh', font: 'Huninn' };
const imgKey = (id: string) => `img_${id}`;

interface AppState {
  meds: Medication[];
  settings: Settings;
}

type Action =
  | { type: 'save'; med: Medication }
  | { type: 'remove'; id: string }
  | { type: 'settings'; patch: Partial<Settings> };

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return {
        meds: Array.isArray(parsed.meds) ? parsed.meds : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) }
      };
    }
  } catch (e) {
    console.warn('load failed', e);
  }
  return { meds: [], settings: { ...DEFAULT_SETTINGS } };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'save': {
      const exists = state.meds.some((m) => m.id === action.med.id);
      return {
        ...state,
        meds: exists
          ? state.meds.map((m) => (m.id === action.med.id ? action.med : m))
          : [...state.meds, action.med]
      };
    }
    case 'remove':
      return { ...state, meds: state.meds.filter((m) => m.id !== action.id) };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    default:
      return state;
  }
}

interface AppContextValue {
  meds: Medication[];
  settings: Settings;
  lang: Lang;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
  /** image: undefined = 保留舊圖 / null = 刪除圖 / Blob = 取代為新圖 */
  saveMed: (med: Medication, image?: Blob | null) => Promise<void>;
  removeMed: (id: string) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const { meds, settings } = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('persist failed', e);
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.lang = settings.lang === 'zh' ? 'zh-Hant' : 'en';
    document.documentElement.style.setProperty(
      '--font-app',
      `'${settings.font}', 'Iansui', 'Huninn', ui-rounded, 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif`
    );
  }, [settings.lang, settings.font]);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => translate(settings.lang, key, vars),
    [settings.lang]
  );

  const saveMed = useCallback(async (med: Medication, image?: Blob | null) => {
    let next = med;
    if (image instanceof Blob) {
      await idbSet(imgKey(med.id), image);
      next = { ...med, imageId: imgKey(med.id) };
    } else if (image === null) {
      if (med.imageId) await del(med.imageId);
      next = { ...med, imageId: undefined };
    }
    dispatch({ type: 'save', med: next });
  }, []);

  const removeMed = useCallback(
    async (id: string) => {
      const target = meds.find((m) => m.id === id);
      if (target?.imageId) {
        try {
          await del(target.imageId);
        } catch {
          /* 照片刪除失敗不阻擋藥品刪除 */
        }
      }
      dispatch({ type: 'remove', id });
    },
    [meds]
  );

  const setSettings = useCallback(
    (patch: Partial<Settings>) => dispatch({ type: 'settings', patch }),
    []
  );

  const value: AppContextValue = { meds, settings, lang: settings.lang, t, saveMed, removeMed, setSettings };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}
```

#### 📄 `src/hooks.ts`
```ts
import { useEffect, useState } from 'react';
import { get } from 'idb-keyval';
import { startOfToday } from './domain/calc';

/** 「今天」的本地午夜：跨午夜自動更新＋前景/聚焦校準（計時器皆 cleanup） */
export function useToday(): Date {
  const [today, setToday] = useState<Date>(() => startOfToday());

  useEffect(() => {
    const refresh = () => {
      const next = startOfToday();
      setToday((prev) => (prev.getTime() === next.getTime() ? prev : next));
    };

    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      const next = new Date();
      next.setHours(24, 1, 0, 0); // 明天 00:01（避開 DST 邊界）
      timer = window.setTimeout(() => {
        refresh();
        schedule();
      }, next.getTime() - Date.now());
    };
    schedule();

    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}

/** IndexedDB 照片 -> Object URL（卸載/換圖必 revoke） */
export function useObjectUrl(imageId?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    let created: string | undefined;
    if (!imageId) {
      setUrl(undefined);
      return;
    }
    get<Blob>(imageId)
      .then((blob) => {
        if (alive && blob) {
          created = URL.createObjectURL(blob);
          setUrl(created);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [imageId]);

  return url;
}
```

#### 📄 `src/image.ts`
```ts
/** 上傳照片壓縮為最長邊 512px 的 JPEG Blob */
export async function fileToScaledBlob(file: File, maxSize = 512): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    return blob ?? file;
  } catch {
    return file; // 解碼失敗（如部分 HEIC）存原檔
  }
}
```

#### 📄 `src/pwa.ts`
```ts
import { registerSW } from 'virtual:pwa-register';
import { EventBus } from './core/EventBus';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function setupPWA(): void {
  registerSW({
    immediate: true,
    onOfflineReady() {
      EventBus.emit('ui:toast', { key: 'offlineReady' });
    },
    onRegisterError(error) {
      console.error('SW registration failed', error);
    }
  });

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    EventBus.emit('pwa:installable', true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    EventBus.emit('pwa:installable', false);
  });

  // 安裝後嘗試鎖定直向；iOS 不支援則由 CSS 遮罩補位
  if (window.matchMedia('(display-mode: standalone)').matches) {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    orientation.lock?.('portrait').catch(() => undefined);
  }
}

export function isInstallable(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  EventBus.emit('pwa:installable', false);
  return choice.outcome === 'accepted';
}
```

#### 📄 `src/App.tsx`
```tsx
import { useEffect, useState } from 'react';
import { PortraitGuard } from './components/PortraitGuard';
import { Toast } from './components/Toast';
import { EventBus } from './core/EventBus';
import type { View } from './core/types';
import { AddMedPage } from './pages/AddMedPage';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { AppProvider } from './store';

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const [view, setView] = useState<View>({ name: 'home' });

  useEffect(() => {
    const onNavigate = (v: View) => {
      setView(v);
      window.scrollTo({ top: 0 });
    };
    EventBus.on('ui:navigate', onNavigate);
    return () => {
      EventBus.off('ui:navigate', onNavigate);
    };
  }, []);

  return (
    <div className="app">
      {view.name === 'home' && <HomePage />}
      {view.name === 'settings' && <SettingsPage />}
      {view.name === 'add' && <AddMedPage key={view.editId ?? 'new'} editId={view.editId} />}
      <Toast />
      <PortraitGuard />
    </div>
  );
}
```

### C. 樣式與 UI（8 檔）

#### 📄 `src/styles.css`
```css
/* 🌸 粉嫩藥盒 — 可愛粉嫩風設計系統（手機直向優先） */
:root {
  --font-app: 'Huninn', 'Iansui', ui-rounded, 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif;
  --bg: #fff5f8;
  --card: #ffffff;
  --pink: #ff8fb8;
  --pink-strong: #ee6fa5;
  --pink-soft: #ffd6e7;
  --pink-border: #ffc9dd;
  --pink-wash: #fff0f6;
  --mint: #bfe8d4;
  --lilac: #e6ddff;
  --butter: #ffe9c7;
  --text: #6b4f5b;
  --text-soft: #a88795;
  --warn: #ffb26b;
  --danger: #ff7a9c;
  --shadow: 0 6px 18px rgba(255, 143, 184, 0.18);
  --radius: 22px;
}

* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  font-family: var(--font-app);
  color: var(--text);
  background: linear-gradient(180deg, #fff5f8 0%, #ffeef5 100%);
  background-attachment: fixed;
  min-height: 100vh;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: radial-gradient(#ffe4ee 1.2px, transparent 1.3px);
  background-size: 22px 22px;
  pointer-events: none;
  z-index: 0;
}

#root { position: relative; z-index: 1; }

.app { max-width: 480px; margin: 0 auto; min-height: 100vh; }

.page {
  padding: calc(16px + env(safe-area-inset-top)) 16px
    calc(110px + env(safe-area-inset-bottom));
}

.visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  margin: -1px; padding: 0; border: 0;
  clip: rect(0 0 0 0); overflow: hidden; white-space: nowrap;
}

::selection { background: var(--pink-soft); }

button { font-family: inherit; color: inherit; }

:focus-visible { outline: 3px solid var(--pink); outline-offset: 2px; border-radius: 8px; }

/* ---------- 頁首 ---------- */
.header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 14px;
}
.header__titles { min-width: 0; }
.app-title { margin: 0; font-size: 28px; letter-spacing: 1px; }
.app-subtitle { margin: 2px 0 0; font-size: 14px; color: var(--text-soft); }
.page-title { margin: 0; font-size: 22px; }

.back-btn {
  border: 2px solid var(--pink-border); background: var(--card);
  border-radius: 999px; padding: 8px 16px; font-size: 15px; cursor: pointer;
  box-shadow: var(--shadow); transition: transform 0.15s ease;
}
.back-btn:active { transform: scale(0.95); }

.icon-btn {
  border: 2px solid var(--pink-border); background: var(--card);
  width: 40px; height: 40px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 18px; cursor: pointer; box-shadow: var(--shadow);
  transition: transform 0.15s ease; flex: none;
}
.icon-btn:active { transform: scale(0.9); }
.icon-btn--lg { width: 48px; height: 48px; font-size: 22px; }

/* ---------- Phaser 藥櫃場景 ---------- */
.scene-wrap {
  width: 100%;
  aspect-ratio: 480 / 300;
  border: 2px solid var(--pink-border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  background: #fff5f8;
}
.scene-wrap canvas { display: block; }
.scene-hint { margin: 8px 2px 14px; font-size: 12.5px; color: var(--text-soft); text-align: center; }

/* ---------- 統計 chips ---------- */
.summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.chip {
  background: var(--card); border: 2px solid var(--pink-border);
  border-radius: 999px; padding: 6px 14px; font-size: 14px; box-shadow: var(--shadow);
}
.chip--warn { background: #fff3e6; border-color: var(--warn); }
.chip--good { background: #eefaf2; border-color: var(--mint); }

/* ---------- 藥品卡片 ---------- */
.med-list { display: flex; flex-direction: column; gap: 14px; }
.med-card {
  background: var(--card); border: 2px solid var(--pink-border);
  border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow);
}
.med-card--low { border-color: var(--warn); }
.med-card--empty { opacity: 0.8; }
.med-card--highlight { border-color: var(--pink-strong); animation: card-flash 1.8s ease; }
.med-card__top { display: flex; align-items: center; gap: 12px; }
.med-card__titles { flex: 1; min-width: 0; }
.med-card__name { margin: 0; font-size: 19px; line-height: 1.3; overflow-wrap: anywhere; }
.code-chip {
  display: inline-block; margin-top: 4px; font-size: 12px; color: var(--text-soft);
  background: var(--pink-wash); border-radius: 999px; padding: 2px 10px;
}
.med-card__actions { display: flex; gap: 6px; }
.thumb {
  width: 56px; height: 56px; border-radius: 18px; object-fit: cover;
  border: 2px solid var(--pink-border); flex: none; background: var(--pink-wash);
}
.thumb--lg { width: 88px; height: 88px; border-radius: 24px; }
.pill-avatar { display: block; border-radius: 18px; flex: none; }

.badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.badge {
  font-size: 12.5px; background: var(--pink-wash);
  border: 1.5px dashed var(--pink-border); border-radius: 999px; padding: 4px 10px;
}
.badge--freq { background: var(--lilac); border-color: #cdbcf5; }

.days-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.days-label { font-size: 13px; color: var(--text-soft); }
.days-num { font-size: 40px; line-height: 1.1; color: var(--pink-strong); }
.days-unit { font-size: 16px; margin-left: 4px; color: var(--text); }
.days-side { text-align: right; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.runout { font-size: 12.5px; color: var(--text-soft); }

.status-chip { font-size: 13px; border-radius: 999px; padding: 4px 12px; border: 2px solid; }
.status-chip--low { background: #fff3e6; border-color: var(--warn); color: #c77b2e; }
.status-chip--empty { background: #f3f0f2; border-color: #d8cdd3; color: #8d7a85; }
.status-chip--future { background: #eefaf2; border-color: var(--mint); color: #4e9b74; }
.status-chip--prn { background: #eef4ff; border-color: #bcd4f5; color: #5b7fb5; }

/* 今日用量 / 扣除一天之餘量：兩格分開顯示（需求核心） */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.split__box {
  background: var(--pink-wash); border: 2px dashed var(--pink-border);
  border-radius: 16px; padding: 10px 12px; text-align: center;
}
.split__label { font-size: 12.5px; color: var(--text-soft); }
.split__value { font-size: 24px; margin-top: 2px; }
.split__value small { font-size: 13px; margin-left: 3px; color: var(--text-soft); }

.total-line { margin-top: 10px; font-size: 13px; color: var(--text-soft); text-align: center; }

.progress {
  margin-top: 8px; height: 12px; border-radius: 999px;
  background: #ffe9f1; overflow: hidden; border: 1.5px solid var(--pink-border);
}
.progress__fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--pink), var(--lilac));
  transition: width 0.4s ease;
}
.med-card--low .progress__fill { background: linear-gradient(90deg, var(--warn), #ffd166); }
.med-card--empty .progress__fill { background: #d8cdd3; }

.med-notes { margin: 10px 0 0; font-size: 13.5px; color: var(--text-soft); }

/* ---------- 空狀態 ---------- */
.empty {
  text-align: center; padding: 48px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty h2 { margin: 8px 0 0; font-size: 20px; }
.empty p { margin: 0 0 10px; color: var(--text-soft); font-size: 14.5px; }
.empty .pill-avatar { animation: float 3s ease-in-out infinite; }

/* ---------- 按鈕 ---------- */
.btn {
  border: none; border-radius: 999px; padding: 12px 22px;
  font-size: 16px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.btn:active { transform: scale(0.96); }
.btn--primary {
  background: linear-gradient(135deg, #ff9ec4, var(--pink));
  color: #fff; box-shadow: 0 6px 16px rgba(240, 110, 165, 0.35);
}
.btn--primary:disabled { opacity: 0.6; cursor: default; }
.btn--ghost { background: var(--card); border: 2px solid var(--pink-border); color: var(--text); }

.fab {
  position: fixed;
  right: max(18px, calc(50% - 240px + 18px));
  bottom: calc(20px + env(safe-area-inset-bottom));
  width: 62px; height: 62px; border-radius: 50%;
  border: none; font-size: 30px; color: #fff; cursor: pointer;
  background: linear-gradient(135deg, #ff9ec4, var(--pink-strong));
  box-shadow: 0 8px 22px rgba(240, 110, 165, 0.45);
  transition: transform 0.15s ease; z-index: 50;
}
.fab:active { transform: scale(0.9); }

/* ---------- 表單 ---------- */
.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 15px; }
.field__hint { font-size: 12.5px; color: var(--text-soft); margin: 0; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.input, .select, .textarea {
  font-family: inherit; font-size: 16px; color: var(--text);
  background: var(--card); border: 2px solid var(--pink-border);
  border-radius: 14px; padding: 11px 14px; width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.input:focus, .select:focus, .textarea:focus {
  outline: none; border-color: var(--pink);
  box-shadow: 0 0 0 4px rgba(255, 143, 184, 0.2);
}
.textarea { resize: vertical; min-height: 64px; }

.img-picker { display: flex; align-items: center; gap: 14px; }
.img-picker__preview {
  display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer;
}
.img-picker__hint { font-size: 12.5px; color: var(--pink-strong); }

.preview-card {
  background: linear-gradient(135deg, #fff0f6, #f3edff);
  border: 2px dashed var(--pink-border); border-radius: var(--radius);
  padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; font-size: 14.5px;
}
.preview-card__title { font-size: 15px; color: var(--pink-strong); }
.preview-card b { color: var(--pink-strong); font-size: 17px; }

.error-box {
  background: #ffeef2; border: 2px solid var(--danger); color: #c2506e;
  border-radius: 14px; padding: 10px 14px; font-size: 14px;
}

.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }

/* ---------- 設置頁 ---------- */
.settings-section {
  background: var(--card); border: 2px solid var(--pink-border);
  border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); margin-bottom: 14px;
  display: flex; flex-direction: column; gap: 10px;
}
.section-title { margin: 0; font-size: 17px; }

.pill-group { display: flex; gap: 8px; }
.pill-option {
  flex: 1; border: 2px solid var(--pink-border); background: var(--pink-wash);
  border-radius: 999px; padding: 10px 14px; font-size: 15px; cursor: pointer;
  transition: all 0.15s ease;
}
.pill-option.is-active {
  background: linear-gradient(135deg, #ff9ec4, var(--pink));
  border-color: var(--pink-strong); color: #fff;
  box-shadow: 0 4px 12px rgba(240, 110, 165, 0.35);
}

.font-card {
  position: relative; text-align: left; cursor: pointer;
  border: 2px solid var(--pink-border); background: var(--pink-wash);
  border-radius: 18px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 4px; transition: all 0.15s ease;
}
.font-card.is-active { border-color: var(--pink-strong); background: #fff; box-shadow: var(--shadow); }
.font-card__sample { font-size: 20px; line-height: 1.4; }
.font-card__name { font-size: 13px; color: var(--pink-strong); }
.font-card__desc { font-size: 12.5px; color: var(--text-soft); }
.font-card__check {
  position: absolute; top: 10px; right: 12px;
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--pink); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}

.about p { margin: 0; font-size: 14px; line-height: 1.6; }

/* ---------- Toast ---------- */
.toast {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(96px + env(safe-area-inset-bottom));
  background: var(--card); border: 2px solid var(--pink);
  color: var(--text); border-radius: 999px; padding: 10px 20px;
  font-size: 15px; box-shadow: var(--shadow); z-index: 1200;
  animation: toast-pop 0.25s ease; max-width: 86vw; text-align: center;
}

/* ---------- 直向防護罩 ---------- */
.portrait-guard { display: none; }

@media (orientation: landscape) and (max-height: 520px) {
  .portrait-guard {
    display: flex; position: fixed; inset: 0; z-index: 2000;
    align-items: center; justify-content: center;
    background: rgba(255, 240, 246, 0.97); backdrop-filter: blur(6px);
  }
}
.portrait-guard__box { text-align: center; padding: 24px; }
.portrait-guard__box h2 { margin: 10px 0 6px; }
.portrait-guard__box p { margin: 0; color: var(--text-soft); }
.portrait-guard__phone { font-size: 64px; animation: wiggle 1.6s ease-in-out infinite; }

/* ---------- 動畫 ---------- */
@keyframes toast-pop {
  from { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.9); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-14deg); }
  75% { transform: rotate(14deg); }
}
@keyframes card-flash {
  0%, 100% { box-shadow: var(--shadow); }
  25%, 65% { box-shadow: 0 0 0 5px rgba(255, 143, 184, 0.45), var(--shadow); }
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

#### 📄 `src/components/PillAvatar.tsx`
```tsx
const PALETTE = ['#ffd6e7', '#ffe9c7', '#d9f2e3', '#e6ddff', '#d7ecff'];

export function PillAvatar({ seed, size = 56 }: { seed: string; size?: number }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bg = PALETTE[h % PALETTE.length];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className="pill-avatar"
      role="img"
      aria-label="pill avatar"
    >
      <rect width="96" height="96" rx="24" fill={bg} />
      <g transform="rotate(-28 48 48)">
        <rect x="20" y="36" width="56" height="24" rx="12" fill="#ffffff" stroke="#e88bb0" strokeWidth="3" />
        <path d="M48 36 h16 a12 12 0 0 1 0 24 h-16 z" fill="#ff9ec4" />
        <line x1="48" y1="36" x2="48" y2="60" stroke="#e88bb0" strokeWidth="3" />
        <circle cx="31" cy="46" r="2.2" fill="#6b4f5b" />
        <circle cx="40" cy="46" r="2.2" fill="#6b4f5b" />
        <path d="M31.5 51 q4 3.5 8 0" stroke="#6b4f5b" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
```

#### 📄 `src/components/Toast.tsx`
```tsx
import { useEffect, useState } from 'react';
import { EventBus } from '../core/EventBus';
import type { ToastPayload } from '../core/EventBus';
import { useApp } from '../store';

export function Toast() {
  const { t } = useApp();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const onToast = (p: ToastPayload) => setToast(p);
    EventBus.on('ui:toast', onToast);
    return () => {
      EventBus.off('ui:toast', onToast);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      🌸 {t(toast.key, toast.vars)}
    </div>
  );
}
```

#### 📄 `src/components/PortraitGuard.tsx`
```tsx
import { useApp } from '../store';

export function PortraitGuard() {
  const { t } = useApp();
  return (
    <div className="portrait-guard" aria-hidden="true">
      <div className="portrait-guard__box">
        <div className="portrait-guard__phone">📱</div>
        <h2>{t('rotateTitle')}</h2>
        <p>{t('rotateHint')}</p>
      </div>
    </div>
  );
}
```

#### 📄 `src/components/MedCard.tsx`
```tsx
import { EventBus } from '../core/EventBus';
import type { Medication } from '../core/types';
import type { MedStatus } from '../domain/calc';
import { fmt } from '../domain/calc';
import { FREQUENCIES, timesPerDay } from '../domain/frequency';
import { useObjectUrl } from '../hooks';
import type { I18nKey } from '../i18n';
import { useApp } from '../store';
import { PillAvatar } from './PillAvatar';

interface Props {
  med: Medication;
  status: MedStatus;
  onDelete: (id: string) => void;
  highlighted?: boolean;
  innerRef?: (el: HTMLElement | null) => void;
}

export function MedCard({ med, status, onDelete, highlighted, innerRef }: Props) {
  const { t, lang } = useApp();
  const url = useObjectUrl(med.imageId);
  const unit = t(`unit_${med.unit}` as I18nKey);

  const freqLabel =
    med.freq === 'CUSTOM'
      ? `${t('custom')} ${fmt(timesPerDay(med.freq, med.customTimesPerDay))} ${t('timesPerDaySuffix')}`
      : `${med.freq}｜${FREQUENCIES[med.freq][lang]}`;

  const statusChip =
    status.state === 'low' ? (
      <span className="status-chip status-chip--low">🍓 {t('statusLow')}</span>
    ) : status.state === 'empty' ? (
      <span className="status-chip status-chip--empty">💤 {t('statusEmpty')}</span>
    ) : status.state === 'future' ? (
      <span className="status-chip status-chip--future">🌱 {t('notStarted')}</span>
    ) : status.state === 'prn' ? (
      <span className="status-chip status-chip--prn">🫧 {t('statusPrn')}</span>
    ) : null;

  return (
    <article
      ref={innerRef}
      className={`med-card med-card--${status.state}${highlighted ? ' med-card--highlight' : ''}`}
    >
      <div className="med-card__top">
        {url ? (
          <img className="thumb" src={url} alt={med.name} />
        ) : (
          <PillAvatar seed={med.name || med.id} size={56} />
        )}
        <div className="med-card__titles">
          <h3 className="med-card__name">{med.name}</h3>
          {med.code && <span className="code-chip">#{med.code}</span>}
        </div>
        <div className="med-card__actions">
          <button
            type="button"
            className="icon-btn"
            aria-label={t('edit')}
            onClick={() => EventBus.emit('ui:navigate', { name: 'add', editId: med.id })}
          >
            ✏️
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('delete')}
            onClick={() => {
              if (window.confirm(t('confirmDelete', { name: med.name }))) onDelete(med.id);
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="badges">
        <span className="badge badge--freq">💊 {freqLabel}</span>
        <span className="badge">🥄 {t('perIntake')} {fmt(med.dosePerIntake)} {unit}</span>
        <span className="badge">📅 {t('startsOn', { date: med.startDate })}</span>
      </div>

      <div className="days-row">
        <div>
          <div className="days-label">{t('remainingDaysLabel')}</div>
          <div className="days-num">
            {status.daysRemaining ?? '—'}
            <span className="days-unit">{status.daysRemaining !== null ? t('daysUnit') : ''}</span>
          </div>
        </div>
        <div className="days-side">
          {statusChip}
          {status.runOutDate && <div className="runout">{t('runOut', { date: status.runOutDate })}</div>}
          {status.state === 'prn' && <div className="runout">{t('prnHint')}</div>}
        </div>
      </div>

      {/* 需求核心：剩餘餘量 = 今日用量 + 扣除一天之餘量，分開顯示 */}
      <div className="split">
        <div className="split__box">
          <div className="split__label">🌞 {t('todayDoseLabel')}</div>
          <div className="split__value">
            {fmt(status.todayDose)}
            <small>{unit}</small>
          </div>
        </div>
        <div className="split__box">
          <div className="split__label">🎀 {t('afterTodayLabel')}</div>
          <div className="split__value">
            {fmt(status.remainingAfterToday)}
            <small>{unit}</small>
          </div>
        </div>
      </div>

      <div className="total-line">
        {t('totalRemainingLabel')} {fmt(status.remainingWithToday)} {unit}{' '}
        {t('totalOf', { total: `${fmt(status.total)} ${unit}` })}
      </div>
      <div className="progress">
        <div className="progress__fill" style={{ width: `${(status.usedRatio * 100).toFixed(1)}%` }} />
      </div>

      {med.notes && <p className="med-notes">📝 {med.notes}</p>}
    </article>
  );
}
```

#### 📄 `src/pages/HomePage.tsx`
```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { MedCard } from '../components/MedCard';
import { PhaserGame } from '../components/PhaserGame';
import { PillAvatar } from '../components/PillAvatar';
import { EventBus } from '../core/EventBus';
import type { MedState } from '../domain/calc';
import { getStatus } from '../domain/calc';
import type { SyncPayload } from '../game/types';
import { useToday } from '../hooks';
import { useApp } from '../store';

const RANK: Record<MedState, number> = { empty: 0, low: 1, ok: 2, prn: 3, future: 4 };

export function HomePage() {
  const { meds, t, removeMed } = useApp();
  const today = useToday();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const syncRef = useRef<SyncPayload>({ meds: [] });

  const items = useMemo(
    () =>
      meds
        .map((med) => ({ med, status: getStatus(med, today) }))
        .sort(
          (a, b) =>
            RANK[a.status.state] - RANK[b.status.state] ||
            (a.status.daysRemaining ?? 9999) - (b.status.daysRemaining ?? 9999) ||
            a.med.createdAt - b.med.createdAt
        ),
    [meds, today]
  );

  const lowCount = items.filter((i) => i.status.state === 'low' || i.status.state === 'empty').length;

  // React → Phaser：同步場景精靈（上架/更新狀態/下架）
  const payload = useMemo<SyncPayload>(
    () => ({
      meds: items.map(({ med, status }) => ({
        id: med.id,
        name: med.name,
        state: status.state,
        daysRemaining: status.daysRemaining
      }))
    }),
    [items]
  );
  syncRef.current = payload;

  useEffect(() => {
    EventBus.emit('meds:sync', payload);
  }, [payload]);

  // Phaser → React：場景就緒重送同步；點藥丸 → 卡片定位＋閃現
  useEffect(() => {
    const onReady = () => EventBus.emit('meds:sync', syncRef.current);
    const onSelected = (id: string) => {
      setHighlightId(id);
      cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    EventBus.on('scene:ready', onReady);
    EventBus.on('med:selected', onSelected);
    return () => {
      EventBus.off('scene:ready', onReady);
      EventBus.off('med:selected', onSelected);
    };
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const id = window.setTimeout(() => setHighlightId(null), 1800);
    return () => window.clearTimeout(id);
  }, [highlightId]);

  const onDelete = async (id: string) => {
    await removeMed(id);
    EventBus.emit('ui:toast', { key: 'deleted' });
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header__titles">
          <h1 className="app-title">🌸 {t('appTitle')}</h1>
          <p className="app-subtitle">{t('appSubtitle')}</p>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--lg"
          aria-label={t('settings')}
          onClick={() => EventBus.emit('ui:navigate', { name: 'settings' })}
        >
          ⚙️
        </button>
      </header>

      <PhaserGame />
      <p className="scene-hint">👆 {t('sceneHint')}</p>

      {items.length > 0 && (
        <div className="summary">
          <span className="chip">💊 {t('summaryTotal', { n: items.length })}</span>
          {lowCount > 0 ? (
            <span className="chip chip--warn">🍓 {t('summaryLow', { n: lowCount })}</span>
          ) : (
            <span className="chip chip--good">✨ {t('summaryAllGood')}</span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <PillAvatar seed="pillpal" size={120} />
          <h2>{t('emptyTitle')}</h2>
          <p>{t('emptyHint')}</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => EventBus.emit('ui:navigate', { name: 'add' })}
          >
            ＋ {t('addMed')}
          </button>
        </div>
      ) : (
        <div className="med-list">
          {items.map(({ med, status }) => (
            <MedCard
              key={med.id}
              med={med}
              status={status}
              onDelete={onDelete}
              highlighted={highlightId === med.id}
              innerRef={(el) => {
                if (el) cardRefs.current.set(med.id, el);
                else cardRefs.current.delete(med.id);
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="fab"
        aria-label={t('addMed')}
        onClick={() => EventBus.emit('ui:navigate', { name: 'add' })}
      >
        ＋
      </button>
    </div>
  );
}
```

#### 📄 `src/pages/SettingsPage.tsx`
```tsx
import { useEffect, useState } from 'react';
import { EventBus } from '../core/EventBus';
import type { FontName, Lang } from '../core/types';
import { isInstallable, promptInstall } from '../pwa';
import { useApp } from '../store';

const FONTS: { name: FontName; descKey: 'fontIansuiDesc' | 'fontHuninnDesc' }[] = [
  { name: 'Huninn', descKey: 'fontHuninnDesc' },
  { name: 'Iansui', descKey: 'fontIansuiDesc' }
];

const LANGS: { value: Lang; label: string }[] = [
  { value: 'zh', label: '繁體中文' },
  { value: 'en', label: 'English' }
];

export function SettingsPage() {
  const { settings, setSettings, t } = useApp();
  const [installable, setInstallable] = useState(isInstallable());

  useEffect(() => {
    const onInstallable = (v: boolean) => setInstallable(v);
    EventBus.on('pwa:installable', onInstallable);
    return () => {
      EventBus.off('pwa:installable', onInstallable);
    };
  }, []);

  return (
    <div className="page">
      <header className="header">
        <button
          type="button"
          className="back-btn"
          onClick={() => EventBus.emit('ui:navigate', { name: 'home' })}
        >
          ← {t('back')}
        </button>
        <h1 className="page-title">⚙️ {t('settings')}</h1>
      </header>

      <section className="settings-section">
        <h2 className="section-title">🌐 {t('languageLabel')}</h2>
        <div className="pill-group">
          {LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              className={`pill-option ${settings.lang === l.value ? 'is-active' : ''}`}
              aria-pressed={settings.lang === l.value}
              onClick={() => setSettings({ lang: l.value })}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">🎀 {t('fontLabel')}</h2>
        {FONTS.map((f) => (
          <button
            key={f.name}
            type="button"
            className={`font-card ${settings.font === f.name ? 'is-active' : ''}`}
            aria-pressed={settings.font === f.name}
            onClick={() => setSettings({ font: f.name })}
          >
            <span className="font-card__sample" style={{ fontFamily: `'${f.name}', sans-serif` }}>
              {t('fontPreviewText')}
            </span>
            <span className="font-card__name">{f.name}</span>
            <span className="font-card__desc">{t(f.descKey)}</span>
            {settings.font === f.name && <span className="font-card__check">✓</span>}
          </button>
        ))}
      </section>

      <section className="settings-section">
        <h2 className="section-title">📲 {t('installTitle')}</h2>
        {installable ? (
          <button type="button" className="btn btn--primary" onClick={() => void promptInstall()}>
            {t('installBtn')}
          </button>
        ) : (
          <p className="field__hint">{t('installHintInstalled')}</p>
        )}
        <p className="field__hint">{t('installHintIos')}</p>
      </section>

      <section className="settings-section about">
        <h2 className="section-title">💌 {t('aboutTitle')}</h2>
        <p>{t('aboutText')}</p>
        <p className="field__hint">{t('version')} 2.0.0 ・ Phaser + React + Vite + PWA</p>
      </section>
    </div>
  );
}
```

#### 📄 `src/pages/AddMedPage.tsx`
```tsx
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { PillAvatar } from '../components/PillAvatar';
import { EventBus } from '../core/EventBus';
import type { Medication, Unit } from '../core/types';
import { dailyDose, fmt, getStatus, startOfToday, toYMD, totalUnits } from '../domain/calc';
import type { FrequencyCode } from '../domain/frequency';
import { FREQUENCIES, FREQUENCY_CODES } from '../domain/frequency';
import { useObjectUrl } from '../hooks';
import type { I18nKey } from '../i18n';
import { fileToScaledBlob } from '../image';
import { useApp } from '../store';

const UNITS: Unit[] = ['tablet', 'capsule', 'ml', 'drop', 'pack'];

interface Draft {
  name: string;
  code: string;
  freq: FrequencyCode;
  customTimes: string;
  dose: string;
  unit: Unit;
  packs: string;
  perPack: string;
  loose: string;
  startDate: string;
  notes: string;
}

const num = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AddMedPage({ editId }: { editId?: string }) {
  const { meds, t, lang, saveMed } = useApp();
  const existing = meds.find((m) => m.id === editId);

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          name: existing.name,
          code: existing.code,
          freq: existing.freq,
          customTimes: existing.customTimesPerDay != null ? String(existing.customTimesPerDay) : '',
          dose: String(existing.dosePerIntake),
          unit: existing.unit,
          packs: String(existing.packCount),
          perPack: String(existing.unitsPerPack),
          loose: String(existing.looseCount),
          startDate: existing.startDate,
          notes: existing.notes ?? ''
        }
      : {
          name: '',
          code: '',
          freq: 'QD',
          customTimes: '',
          dose: '1',
          unit: 'tablet',
          packs: '1',
          perPack: '28',
          loose: '0',
          startDate: toYMD(new Date()),
          notes: ''
        }
  );
  const [newImage, setNewImage] = useState<Blob | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const existingUrl = useObjectUrl(!imageRemoved && !newImage ? existing?.imageId : undefined);
  const [newUrl, setNewUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!newImage) {
      setNewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(newImage);
    setNewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newImage]);
  const previewUrl = newUrl ?? existingUrl;

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const draftMed: Medication = useMemo(
    () => ({
      id: existing?.id ?? 'draft',
      createdAt: existing?.createdAt ?? 0,
      name: draft.name,
      code: draft.code,
      freq: draft.freq,
      customTimesPerDay: draft.freq === 'CUSTOM' ? num(draft.customTimes) : undefined,
      dosePerIntake: num(draft.dose),
      unit: draft.unit,
      packCount: num(draft.packs),
      unitsPerPack: num(draft.perPack),
      looseCount: num(draft.loose),
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) ? draft.startDate : toYMD(new Date()),
      notes: draft.notes || undefined
    }),
    [draft, existing]
  );

  const daily = dailyDose(draftMed);
  const total = totalUnits(draftMed);
  const status = getStatus(draftMed, startOfToday());
  const unitText = t(`unit_${draft.unit}` as I18nKey);

  const onPickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const blob = await fileToScaledBlob(file);
    setNewImage(blob);
    setImageRemoved(false);
  };

  const validate = (): string | null => {
    if (!draft.name.trim()) return t('errName');
    if (num(draft.dose) <= 0) return t('errDose');
    if (draft.freq === 'CUSTOM' && num(draft.customTimes) <= 0) return t('errTimes');
    if (num(draft.packs) > 0 && num(draft.perPack) <= 0) return t('errPack');
    if (total <= 0) return t('errTotal');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)) return t('errDate');
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    const med: Medication = {
      ...draftMed,
      id: existing?.id ?? uid(),
      createdAt: existing?.createdAt ?? Date.now(),
      name: draft.name.trim(),
      code: draft.code.trim(),
      imageId: imageRemoved ? undefined : existing?.imageId
    };
    try {
      await saveMed(med, newImage ?? (imageRemoved ? null : undefined));
      EventBus.emit('ui:toast', { key: 'saved' });
      EventBus.emit('ui:navigate', { name: 'home' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <button
          type="button"
          className="back-btn"
          onClick={() => EventBus.emit('ui:navigate', { name: 'home' })}
        >
          ← {t('back')}
        </button>
        <h1 className="page-title">{existing ? `✏️ ${t('editMed')}` : `🌷 ${t('addMed')}`}</h1>
      </header>

      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <span className="field__label">📷 {t('image')}（{t('optional')}）</span>
          <div className="img-picker">
            <label className="img-picker__preview">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="thumb thumb--lg" />
              ) : (
                <PillAvatar seed={draft.name || 'pillpal'} size={88} />
              )}
              <input type="file" accept="image/*" className="visually-hidden" onChange={onPickImage} />
              <span className="img-picker__hint">
                {previewUrl ? t('changeImage') : t('tapToUpload')}
              </span>
            </label>
            {previewUrl && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setNewImage(null);
                  setImageRemoved(true);
                }}
              >
                {t('removeImage')}
              </button>
            )}
          </div>
        </div>

        <label className="field">
          <span className="field__label">💊 {t('name')} *</span>
          <input
            className="input"
            value={draft.name}
            placeholder={t('namePlaceholder')}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>

        <label className="field">
          <span className="field__label">🏷️ {t('drugCode')}（{t('optional')}）</span>
          <input
            className="input"
            value={draft.code}
            placeholder={t('drugCodePlaceholder')}
            onChange={(e) => set({ code: e.target.value })}
          />
        </label>

        <div className="field">
          <label className="field__label" htmlFor="freq-select">⏰ {t('frequency')}</label>
          <select
            id="freq-select"
            className="select"
            value={draft.freq}
            onChange={(e) => set({ freq: e.target.value as FrequencyCode })}
          >
            {FREQUENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {code === 'CUSTOM' ? t('custom') : `${code}｜${FREQUENCIES[code][lang]}`}
              </option>
            ))}
          </select>
          {draft.freq === 'PRN' && <p className="field__hint">{t('prnHint')}</p>}
        </div>

        {draft.freq === 'CUSTOM' && (
          <label className="field">
            <span className="field__label">🔢 {t('customTimesPerDay')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={draft.customTimes}
              onChange={(e) => set({ customTimes: e.target.value })}
            />
          </label>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field__label">🥄 {t('dosePerIntake')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.25"
              inputMode="decimal"
              value={draft.dose}
              onChange={(e) => set({ dose: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">📦 {t('unitLabel')}</span>
            <select
              className="select"
              value={draft.unit}
              onChange={(e) => set({ unit: e.target.value as Unit })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{t(`unit_${u}` as I18nKey)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field__label">🎁 {t('packCount')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={draft.packs}
              onChange={(e) => set({ packs: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">🧮 {t('unitsPerPack')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={draft.perPack}
              placeholder={t('unitsPerPackPlaceholder')}
              onChange={(e) => set({ perPack: e.target.value })}
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field__label">🍬 {t('looseCount')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={draft.loose}
              onChange={(e) => set({ loose: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">📅 {t('startDate')}</span>
            <input
              className="input"
              type="date"
              value={draft.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">📝 {t('notes')}（{t('optional')}）</span>
          <textarea
            className="textarea"
            rows={2}
            value={draft.notes}
            placeholder={t('notesPlaceholder')}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </label>

        <div className="preview-card">
          <div className="preview-card__title">{t('previewTitle')}</div>
          <div>
            {t('dailyDoseLabel')}：<b>{fmt(daily)}</b> {unitText}{t('perDay')}
          </div>
          <div>
            {t('totalLabel')}：<b>{fmt(total)}</b> {unitText}
            （{fmt(num(draft.packs))} × {fmt(num(draft.perPack))} + {fmt(num(draft.loose))}）
          </div>
          <div>
            {t('daysLabel')}：<b>{status.daysRemaining ?? '—'}</b>
            {status.daysRemaining !== null ? ` ${t('daysUnit')}` : ''}
            {status.runOutDate ? `・${t('runOut', { date: status.runOutDate })}` : ''}
          </div>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => EventBus.emit('ui:navigate', { name: 'home' })}
          >
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### D. GameEngine 層（5 檔）

#### 📄 `src/game/types.ts`
```ts
import type { MedState } from '../domain/calc';

/** 上架精靈的最小視覺資料（domain 算好後同步給 Scene；業務資料留在 React store） */
export interface SceneMed {
  id: string;
  name: string;
  state: MedState;
  daysRemaining: number | null;
}

export interface SyncPayload {
  meds: SceneMed[];
}
```

#### 📄 `src/game/textures.ts`
```ts
import Phaser from 'phaser';

/** 微笑膠囊：白左半＋粉右半＋臉＋腮紅（任意 w×h） */
function drawCapsule(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const r = h / 2;
  const line = Math.max(2, h * 0.06);
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(line, line, w - line * 2, h - line * 2, r - line);
  g.fillStyle(0xff9ec4, 1);
  g.fillRoundedRect(w / 2, line, w / 2 - line, h - line * 2, { tl: 0, tr: r - line, br: r - line, bl: 0 });
  g.lineStyle(line, 0xe88bb0, 1);
  g.lineBetween(w / 2, line + 1, w / 2, h - line - 1);
  g.strokeRoundedRect(line, line, w - line * 2, h - line * 2, r - line);
  const cx = w * 0.27;
  const cy = h * 0.44;
  g.fillStyle(0x6b4f5b, 1);
  g.fillCircle(cx - w * 0.07, cy, h * 0.055);
  g.fillCircle(cx + w * 0.07, cy, h * 0.055);
  g.lineStyle(Math.max(1.5, h * 0.045), 0x6b4f5b, 1);
  g.beginPath();
  g.arc(cx, cy + h * 0.08, h * 0.12, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155), false);
  g.strokePath();
  g.fillStyle(0xffc9dd, 0.9);
  g.fillCircle(cx - w * 0.13, cy + h * 0.14, h * 0.07);
  g.fillCircle(cx + w * 0.13, cy + h * 0.14, h * 0.07);
}

export function createTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('pill')) return;
  const g = scene.add.graphics();

  drawCapsule(g, 96, 48);
  g.generateTexture('pill', 96, 48);
  g.clear();

  drawCapsule(g, 160, 80);
  g.generateTexture('mascot', 160, 80);
  g.clear();

  g.fillStyle(0xf3c9da, 0.65);
  g.fillEllipse(32, 8, 64, 14);
  g.generateTexture('shadow', 64, 16);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillPoints([
    new Phaser.Geom.Point(8, 0), new Phaser.Geom.Point(10, 6), new Phaser.Geom.Point(16, 8),
    new Phaser.Geom.Point(10, 10), new Phaser.Geom.Point(8, 16), new Phaser.Geom.Point(6, 10),
    new Phaser.Geom.Point(0, 8), new Phaser.Geom.Point(6, 6)
  ], true);
  g.generateTexture('sparkle', 16, 16);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillCircle(12, 12, 11);
  g.lineStyle(2, 0xff8fb8, 1);
  g.strokeCircle(12, 12, 11);
  g.generateTexture('badge', 24, 24);
  g.clear();

  g.fillStyle(0xff9ec4, 1);
  g.fillCircle(5, 5, 5);
  g.fillCircle(13, 5, 5);
  g.fillTriangle(0, 7, 18, 7, 9, 18);
  g.generateTexture('heart', 18, 18);
  g.clear();

  g.fillStyle(0x9ecbff, 1);
  g.fillCircle(6, 9, 5);
  g.fillTriangle(1, 9, 11, 9, 6, 0);
  g.generateTexture('sweat', 12, 14);
  g.clear();

  g.destroy();
}
```

#### 📄 `src/game/audio.ts`
```ts
import Phaser from 'phaser';

/** 泡泡音效：正弦波 620→980Hz、0.18s 衰減（於點擊手势內播放，符合 autoplay 政策） */
export function playPop(scene: Phaser.Scene): void {
  try {
    const ctx = (scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>).context;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  } catch {
    /* 音效失敗不影響應用 */
  }
}
```

#### 📄 `src/game/scenes/ShelfScene.ts`
```ts
import Phaser from 'phaser';
import { EventBus } from '../../core/EventBus';
import type { SceneMed, SyncPayload } from '../types';
import { createTextures } from '../textures';
import { playPop } from '../audio';

const W = 480;
const H = 300;
const MAX_SLOTS = 15;
const PER_ROW = 5;
const FONT = '"Huninn", "Iansui", "PingFang TC", "Microsoft JhengHei", sans-serif';

const TINT: Record<SceneMed['state'], number> = {
  ok: 0xffffff,
  low: 0xffcf9e,
  empty: 0xcfc4cb,
  future: 0xc9ecd9,
  prn: 0xffffff
};

interface PillView {
  id: string;
  container: Phaser.GameObjects.Container;
  pill: Phaser.GameObjects.Image;
  badgeBg: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  bob: Phaser.Tweens.Tween | null;
  extra: Phaser.Tweens.Tween[];
  sweat: Phaser.GameObjects.Image | null;
  zzz: Phaser.GameObjects.Text | null;
}

function slotPos(i: number): { x: number; y: number } {
  return { x: 48 + (i % PER_ROW) * 84, y: 70 + Math.floor(i / PER_ROW) * 84 };
}

export class ShelfScene extends Phaser.Scene {
  private pills = new Map<string, PillView>();
  private pending: SyncPayload | null = null;
  private ready = false;
  private overflowView: Phaser.GameObjects.Container | null = null;
  private overflowText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('ShelfScene');
  }

  create(): void {
    createTextures(this);
    this.drawBackground();
    this.addAmbientParticles();
    this.createMascot();
    this.createOverflowView();

    EventBus.on('meds:sync', this.handleSync, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);

    // Web 字型載入完成後重繪場景文字
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!this.sys.isActive()) return;
        this.pills.forEach((v) => {
          v.nameText.setFontFamily(FONT);
          v.badge.setFontFamily(FONT);
        });
      });
    }

    this.ready = true;
    if (this.pending) this.applySync(this.pending);
    EventBus.emit('scene:ready');
  }

  private teardown(): void {
    EventBus.off('meds:sync', this.handleSync, this);
    this.pills.clear();
    this.ready = false;
  }

  private handleSync(payload: SyncPayload): void {
    this.pending = payload;
    if (this.ready) this.applySync(payload);
  }

  /** 差異化同步：新增 pop-in、刪除 pop-out、既有更新狀態動畫 */
  private applySync(payload: SyncPayload): void {
    const meds = payload.meds;
    const visible = meds.length > MAX_SLOTS ? meds.slice(0, MAX_SLOTS - 1) : meds;
    const keep = new Set(visible.map((m) => m.id));

    this.pills.forEach((view, id) => {
      if (!keep.has(id)) {
        this.pills.delete(id);
        this.tweens.add({
          targets: view.container,
          scale: 0,
          duration: 180,
          ease: 'Back.easeIn',
          onComplete: () => view.container.destroy(true)
        });
      }
    });

    visible.forEach((med, i) => {
      const { x, y } = slotPos(i);
      let view = this.pills.get(med.id);
      if (!view) {
        view = this.createPillView(med, x, y);
        this.pills.set(med.id, view);
      }
      this.updatePillView(view, med, x, y);
    });

    const overflow = meds.length - visible.length;
    if (this.overflowView && this.overflowText) {
      if (overflow > 0) {
        const { x, y } = slotPos(visible.length);
        this.overflowView.setPosition(x, y).setVisible(true);
        this.overflowText.setText(`+${overflow}`);
      } else {
        this.overflowView.setVisible(false);
      }
    }
  }

  private createPillView(med: SceneMed, x: number, y: number): PillView {
    const container = this.add.container(x, y).setDepth(3);
    const shadow = this.add.image(0, 22, 'shadow').setAlpha(0.7);
    const pill = this.add.image(0, 0, 'pill').setScale(0.78);
    const badgeBg = this.add.image(28, -20, 'badge');
    const badge = this.add.text(28, -20, '', { fontFamily: FONT, fontSize: '12px', color: '#ee6fa5' }).setOrigin(0.5);
    const nameText = this.add.text(0, -38, '', { fontFamily: FONT, fontSize: '13px', color: '#6b4f5b' }).setOrigin(0.5);
    container.add([shadow, pill, badgeBg, badge, nameText]);

    container.setSize(84, 80);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      playPop(this);
      EventBus.emit('med:selected', med.id);
    });
    container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.08, duration: 120 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 120 }));

    container.setScale(0);
    this.tweens.add({ targets: container, scale: 1, duration: 320, ease: 'Back.easeOut' });

    return { id: med.id, container, pill, badgeBg, badge, nameText, bob: null, extra: [], sweat: null, zzz: null };
  }

  private updatePillView(view: PillView, med: SceneMed, x: number, y: number): void {
    view.container.setPosition(x, y).setAngle(0).setAlpha(1);
    view.nameText.setText(med.name.length > 6 ? med.name.slice(0, 6) + '…' : med.name);
    view.badge.setText(med.daysRemaining === null ? '—' : String(med.daysRemaining));

    view.bob?.stop();
    view.bob = null;
    view.extra.forEach((t) => t.stop());
    view.extra = [];
    view.sweat?.destroy();
    view.sweat = null;
    view.zzz?.destroy();
    view.zzz = null;

    const tint = TINT[med.state];
    if (tint === 0xffffff) view.pill.clearTint();
    else view.pill.setTint(tint);
    view.badgeBg.setTint(med.state === 'low' ? 0xffe3c2 : med.state === 'empty' ? 0xe8e0e6 : 0xffffff);

    switch (med.state) {
      case 'ok':
      case 'future':
        view.bob = this.tweens.add({
          targets: view.container,
          y: y - 5,
          duration: med.state === 'future' ? 2200 : 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 600)
        });
        break;
      case 'low':
        view.bob = this.tweens.add({
          targets: view.container,
          angle: { from: -7, to: 7 },
          duration: 240,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        view.sweat = this.add.image(34, -30, 'sweat').setAlpha(0);
        view.container.add(view.sweat);
        view.extra.push(this.tweens.add({
          targets: view.sweat,
          alpha: { from: 0, to: 1 },
          y: -22,
          duration: 900,
          yoyo: true,
          repeat: -1
        }));
        break;
      case 'empty':
        view.container.setAlpha(0.75);
        view.zzz = this.add.text(24, -30, 'Z', { fontFamily: FONT, fontSize: '14px', color: '#a88795' }).setOrigin(0.5);
        view.container.add(view.zzz);
        view.extra.push(this.tweens.add({
          targets: view.zzz,
          y: -40,
          alpha: { from: 1, to: 0 },
          duration: 1600,
          repeat: -1
        }));
        break;
      case 'prn':
        view.container.setAlpha(0.9);
        view.bob = this.tweens.add({
          targets: view.container,
          x: x + 3,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
    }
  }

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0xfff5f8, 0xfff5f8, 0xffe9f2, 0xffe9f2, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xffe0ec, 1);
    for (let r = 0; r < 12; r++) {
      const y = 14 + r * 26;
      const off = (r % 2) * 13;
      for (let x = 14 + off; x < W; x += 26) g.fillCircle(x, y, 2);
    }
    const shelves = this.add.graphics().setDepth(2);
    for (let r = 0; r < 3; r++) {
      const y = 70 + r * 84 + 24;
      shelves.fillStyle(0xffd6e7, 1);
      shelves.fillRoundedRect(16, y, W - 32, 12, 6);
      shelves.fillStyle(0xffc0d8, 1);
      shelves.fillRoundedRect(16, y + 8, W - 32, 4, 2);
    }
    this.add.image(24, 26, 'heart').setDepth(2).setAlpha(0.9);
    this.add.image(456, 278, 'heart').setDepth(2).setAlpha(0.7).setScale(0.8);
  }

  private addAmbientParticles(): void {
    this.add.particles(0, 0, 'sparkle', {
      x: { min: 0, max: W },
      y: { min: 0, max: H },
      lifespan: 2400,
      speedX: { min: -4, max: 4 },
      speedY: { min: -16, max: -6 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 0.8, end: 0 },
      rotate: { min: 0, max: 180 },
      tint: [0xffd166, 0xff9ec4, 0xbfe8d4, 0xe6ddff],
      frequency: 380,
      quantity: 1
    }).setDepth(1);
  }

  private createMascot(): void {
    const mascot = this.add.image(432, 40, 'mascot').setScale(0.5).setDepth(4);
    mascot.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: mascot, y: 34, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    mascot.on('pointerdown', () => {
      playPop(this);
      EventBus.emit('ui:toast', { key: 'mascotCheer' });
      this.tweens.add({
        targets: mascot,
        angle: { from: -10, to: 10 },
        duration: 120,
        yoyo: true,
        repeat: 3,
        onComplete: () => mascot.setAngle(0)
      });
    });
  }

  private createOverflowView(): void {
    const c = this.add.container(0, 0).setDepth(3).setVisible(false);
    const pill = this.add.image(0, 0, 'pill').setScale(0.78).setTint(0xd8cdd3);
    this.overflowText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: '#6b4f5b' }).setOrigin(0.5);
    c.add([pill, this.overflowText]);
    this.overflowView = c;
  }
}
```

#### 📄 `src/components/PhaserGame.tsx`
```tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ShelfScene } from '../game/scenes/ShelfScene';

export function PhaserGame() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 480,
      height: 300,
      backgroundColor: '#fff5f8',
      banner: false,
      autoFocus: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [ShelfScene]
    });
    gameRef.current = game;

    // 頁面隱藏：遊戲迴圈睡眠省電；回到前景喚醒
    const onVisibility = () => {
      if (document.hidden) game.loop.sleep();
      else game.loop.wake();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      gameRef.current = null;
      game.destroy(true); // 移除 canvas + 場景 + 監聽，StrictMode 雙掛載安全
    };
  }, []);

  return <div ref={parentRef} className="scene-wrap" aria-label="pill shelf scene" />;
}
```

---

## 8. PWA、直向與場景效能

- **安裝**：HTTPS（Pages 原生）＋manifest（icons 64/192/512/maskable、start_url/scope 依 base 自動、standalone、portrait）＋SW fetch handler；Android 設置頁一鍵安裝（beforeinstallprompt）、iOS「分享→加入主畫面」。
- **快取**：App 殼全 precache（含 Phaser vendor chunk，`maximumFileSizeToCacheInBytes` 3MB）；Google Fonts SWR/CacheFirst；CJK 切片只快取瀏覽過的字，未見過的字離線退回系統字（要 100% 離線字型可自架 woff2）。
- **更新**：autoUpdate（skipWaiting+clientsClaim），下次開啟即新版。
- **直向三層**：manifest orientation → `screen.orientation.lock('portrait')`（standalone）→ 橫向且高度<520px CSS 遮罩。
- **場景效能**：phaser 獨立 vendor chunk（應用更新不失效引擎快取）；紋理一次生成重複使用；頁面隱藏 `loop.sleep()`；`Phaser.AUTO`（WebGL 失敗自動退 Canvas）；場景文字於 `document.fonts.ready` 後重繪。

## 9. GitHub Pages 部署（Actions）

1. 建立 repo（例 `pillpal`）。
2. 推送（**务必 commit `package-lock.json`**）：
```bash
git init
git add .
git commit -m "feat: PillPal PWA v2 🌸"
git branch -M main
git remote add origin https://github.com/<你的帳號>/pillpal.git
git push -u origin main
```
3. **Settings → Pages → Source 選「GitHub Actions」**（workflow `enablement: true` 亦會嘗試自動開啟）。
4. Actions 自動：`npm ci` → prebuild 產圖示 → `tsc` → `vite build` → 上傳 dist → 部署。
5. 網址 `https://<你的帳號>.github.io/pillpal/`；手機開啟→安裝。
6. base 自動偵測 `GITHUB_REPOSITORY`；`<帳號>.github.io` 站台用 `/`；換 repo 名零修改。
7. 本機模擬子路徑：`GITHUB_ACTIONS=true GITHUB_REPOSITORY=you/pillpal npm run build && npm run preview`。

## 10. 驗收清單

- [ ] `npm run dev` 正常；StrictMode 無雙畫布、無重複監聽
- [ ] 藥櫃場景渲染：層架/粒子/吉祥物；新增藥丸 pop-in、刪除 pop-out
- [ ] 點藥丸 → 列表捲動定位＋粉紅閃現；點吉祥物 → 泡泡聲＋鼓勵 Toast
- [ ] 狀態動畫：ok 浮動／low 抖動+汗滴／empty 睡覺 Z／future 薄荷／prn 飄浮；>15 種顯示 +N
- [ ] 範例 A（30錠 BID×1 起 11-10）：剩餘 7 天、今日 2、扣除後 12（§4.4）
- [ ] 半錠 TID×0.5→1.5/天；QOD/QW 平均換算；PRN 不估天數；未來起始「尚未開始」
- [ ] ≤3 天「快沒囉！」＋首頁統計；用完「已用完」
- [ ] 照片上傳重開仍在；移除回膠囊頭像；刪除藥一併清照片
- [ ] 繁中/EN、Huninn/Iansui 即時切換＋持久化（場景文字同步換字）
- [ ] 飛航模式重開可玩可查；Lighthouse PWA installable 通過
- [ ] Android 可安裝、iOS 加入主畫面；橫放出現直向遮罩
- [ ] 跨午夜剩餘自動更新；頁面隱藏場景睡眠、回前景喚醒
- [ ] Actions 綠燈；Pages 子路徑無 404

## 11. FAQ

1. **npm ci 失敗**：commit lockfile；或改 `npm install` 並移除 setup-node `cache: npm`。
2. **Pages 白屏**：Source 必须是 GitHub Actions；base 已自動偵測。
3. **場景沒畫面**：Phaser.AUTO 會自動退 Canvas；檢查 console 與 WebGL 支援。
4. **場景字型**：`document.fonts.ready` 後自動重繪；離線未見過的字退系統字。
5. **音效無聲**：WebAudio 需使用者手势（點擊即觸發）；無 WebAudio 環境安靜忽略。
6. **安裝按鈕沒出現**：僅 Chromium 符合條件觸發；iOS 走分享→加入主畫面。
7. **更新**：autoUpdate 下次開啟生效。
8. **資料**：清瀏覽器網站資料會刪除；Roadmap 提供匯出備份。
9. **天數 ±1**：QOD/QW 平均估算；本地日曆日為準。
10. **字型授權**：Iansui、Huninn 皆 OFL 可商用。

## 12. Roadmap

- 照片上架（IndexedDB → `textures.addBase64` 拍立得框）
- 音效開關（設置頁）＋服藥打卡獎勵小遊戲（Phaser 擴充場景）
- Notification API＋SW 服藥提醒
- 匯出／匯入 JSON 備份（含照片 base64）
- BarcodeDetector 掃藥品代碼
- 自架 woff2 全量 precache（100% 離線字型）
- 多主題／深色模式；可選雲端同步

---

> ⚠️ 免責：本工具僅供庫存管理與估算，不構成醫療建議；實際用藥請遵醫囑。
> 字型：[Iansui（芫荽）](https://fonts.google.com/specimen/Iansui)・[Huninn（粉圓）](https://fonts.google.com/specimen/Huninn)（OFL）。