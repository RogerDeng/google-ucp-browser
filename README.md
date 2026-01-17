# Google UCP Browser 🌐

> **Universal Commerce Protocol 的終極除錯與可視化工具**
> 
> *The ultimate debugger and visualization tool for the Universal Commerce Protocol.*

[![Svelte 5](https://img.shields.io/badge/Svelte-5.x-orange.svg)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

**Google UCP Browser** 是一個專為開發者打造的現代化客戶端工具，旨在簡化 **Universal Commerce Protocol (UCP)** 的開發、測試與驗證流程。它不僅僅是一個瀏覽器，更是您在構建 UCP 應用時最強大的 Copilot。

---

## 🚀 為什麼選擇 UCP Browser？

在開發分散式商務協議時，最大的痛點往往是**不可視性**。與傳統的 REST API 不同，UCP 涉及複雜的狀態流轉、異步事件 (SSE) 和嚴格的結構驗證。

**UCP Browser** 解決了這個問題：

*   🔍 **深度透視 (Deep Inspection)**：不再猜測伺服器回傳了什麼。實時查看完整的 Request/Response 週期、HTTP Headers、Status Codes 以及原始 JSON Payload。
*   ⚡️ **即時驗證 (Real-time Validation)**：內建基於 Zod 的 Schema 驗證器，自動檢查伺服器響應是否符合 UCP v2026-01-11 規範，即時標記錯誤。
*   🛍️ **完整模擬 (Simulate User Journey)**：就像一個真實的 "Buyer App"，模擬從 **服務發現 (Discovery)** -> **商品瀏覽** -> **購物車** -> **結帳 (Checkout)** 的完整購物流程。

---

## ✨ 核心功能 (Core Features)

### 1. 智能服務發現 (Smart Discovery)
輸入伺服器 URL，自動掃描 `/.well-known/ucp` 端點。解析並視覺化伺服器的 **Capabilities (能力)**、**Services (服務)** 和 **API Endpoints**，讓您瞬間掌握對接方的技術規格。

### 2. 交易全景視圖 (Transaction Inspector)
以樹狀結構 (Tree View) 呈現所有的 API 交互。
- **HTTP Protocol 完整顯示**：支援 Method, URL, Status, Headers 的詳細檢視。
- **Payload 可視化**：漂亮的 JSON 檢視器，支援摺疊、語法高亮和錯誤路徑標記。
- **時間軸追蹤**：精確記錄每個請求的耗時與順序。

### 3. 互動式購物體驗 (Interactive Shopping Agent)
內建完整的電子商務 UI，讓您以使用者的視角測試 API：
- **商品牆**：支援分頁、分類篩選 (Hierarchical Categories) 和關鍵字搜尋。
- **動態購物車**：測試加入、更新、刪除商品及庫存檢查邏輯。
- **結帳精靈**：完整的結帳流程模擬，支援 Payment Handlers 和 Session 管理。

### 4. 服務端事件監聽 (SSE Listener)
自動連接 `/api/events`，實時捕捉並顯示來自伺服器的異步通知（如訂單狀態更新），確保前後端狀態同步無延遲。

---

## 🛠 技術堆疊 (Tech Stack)

本專案採用最前沿的 Web 技術構建，確保極致的效能與開發體驗：

| Category | Technology | Description |
|----------|------------|-------------|
| **Core** | ![Svelte](https://img.shields.io/badge/-Svelte_5-ff3e00?style=flat-square&logo=svelte) | 使用最新的 Runes 語法，極致響應式體驗 |
| **Language** | ![TypeScript](https://img.shields.io/badge/-TypeScript-3178c6?style=flat-square&logo=typescript) | 全型別安全，嚴格的類型定義 |
| **Styling** | ![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS_4-38b2ac?style=flat-square&logo=tailwindcss) | 下一代原子化 CSS 引擎 |
| **Icons** | ![Lucide](https://img.shields.io/badge/-Lucide-purple?style=flat-square) | 精美統一的圖標庫 |
| **Validation** | ![Zod](https://img.shields.io/badge/-Zod-3068b7?style=flat-square) | 執行時 Schema 驗證與錯誤推斷 |

---


## 🔧 技術亮點 (Technical Highlights)

本專案採用了多項高階工程實踐，展示了 Modern Web App 的架構深度：

### 1. Svelte 5 Runes 架構
全面採用 Svelte 5 的 **Runes API** (`$state`, `$derived`, `$props`)，捨棄了傳統的 store 模式。這不僅帶來了更細粒度的響應式更新 (Fine-grained Reactivity)，更大幅減少了能夠引發 Bug 的副作用，確保在處理大量實時 UCP 訊息時 UI 依然流暢不卡頓。

### 2. 雙重類型安全 (Dual-Layer Type Safety)
我們不只在編譯時使用 **TypeScript** 進行靜態檢查，更在運行時引入 **Zod** 進行 Schema 驗證。
*   **Compile Time**: TS 確保組件與函數調用的類型正確。
*   **Run Time**: Zod 用於即時驗證外部 UCP 伺服器的響應。這意味著如果伺服器回傳了不符合 spec 的數據（例如缺少的欄位或錯誤的枚舉值），Browser 會立即攔截並報錯，而非讓 UI 默默崩潰。

### 3. 透明代理架構 (Transparent Proxy Architecture)
為了讓瀏覽器能直接與任意第三方 UCP 伺服器通訊（解決 Browser CORS 限制），我們內建了一個高效的 **SvelteKit Server Proxy** (`/api/proxy`)。
*   自動轉發關鍵 Headers (`UCP-Agent`, `X-UCP-API-Key`)。
*   保持 HTTP 協議的完整性，讓前端能精確捕捉 Status Code 和 Headers，實現真實的 "Network Inspector" 體驗。

### 4. 異步交易關聯引擎 (Event-Driven Transaction Correlation)
UCP 協議涉及複雜的異步流（例如：HTTP POST 觸發動作，SSE 推送結果）。我們實作了一個專門的 `TransactionStore`，能夠追蹤並將分散的 **HTTP Requests** 與 **SSE Events** 自動關聯到同一個 Transaction ID 下。這將混亂的日誌流轉化為結構清晰的「對話式」視圖，極大降低了除錯難度。

---

## 🏁 快速開始 (Getting Started)

### 前置需求
*   Node.js 18+
*   npm 9+

### 安裝與執行

```bash
# 1. Clone repository
git clone https://github.com/your-org/google-ucp-browser.git

# 2. Install dependencies
cd google-ucp-browser
npm install

# 3. Start development server
npm run dev
```

瀏覽器打開 `http://localhost:5173`，您將看到 UCP Browser 的主畫面。

### 連接您的 UCP Server

1. 在頂部輸入框輸入您的 UCP Server URL（例如 `http://localhost:8080`）。
2. (選填) 如果伺服器需要驗證，輸入 API Key。
3. 點擊 **"Discover"** 按鈕。
4. 開始探索您的 API！

---

## 🗺️ 開發路線圖 (Roadmap)

- [x] **Protocol Discovery**: 實作 `.well-known` 解析。
- [x] **Product/Cart Flow**: 完整的商品與購物車操作。
- [x] **Transaction Logs**: 詳細的 HTTP 請求紀錄與 UI 呈現。
- [ ] **MCP Support**: 整合 Model Context Protocol 支援。
- [ ] **Advanced Payment**: 支援更多樣化的支付處理器模擬。
- [ ] **Automated Testing Suite**: 一鍵執行對目標伺服器的合規性測試。

---

<p align="center">
  Built with ❤️ by the Google Advanced Agentic Coding Team
</p>
