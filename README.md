**[ 🇺🇸 English ]** | [ 🇹🇼 繁體中文 ](./README.zh-TW.md)

# Google UCP Browser 🌐

> **The Ultimate Debugger & Visualization Tool for the Universal Commerce Protocol**
> 
> *Simplify development, testing, and validation of UCP applications.*

[![Svelte 5](https://img.shields.io/badge/Svelte-5.x-orange.svg)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

**Google UCP Browser** is a modern client-side tool built for developers, designed to streamline the development, testing, and validation workflow of the **Universal Commerce Protocol (UCP)**. It is more than just a browser—it is your most powerful Copilot when building UCP applications.

---

## 🚀 Why Universal Commerce Protocol Browser?

The biggest pain point in developing distributed commerce protocols is **invisibility**. Unlike traditional REST APIs, UCP involves complex state transitions, asynchronous events (SSE), and strict structural validation.

**UCP Browser** solves this problem:

*   🔍 **Deep Inspection**: Stop guessing what the server returned. View the full Request/Response cycle, HTTP Headers, Status Codes, and raw JSON Payloads in real-time.
*   ⚡️ **Real-time Validation**: Built-in Zod-based schema validator automatically checks server responses against the UCP v2026-01-11 specification, flagging errors instantly.
*   🛍️ **Full User Journey Simulation**: Simulates the complete shopping flow from **Service Discovery** -> **Product Browsing** -> **Cart Management** -> **Checkout** just like a real "Buyer App".

---

## ✨ Core Features

### 1. Smart Discovery
Enter a server URL to automatically scan the `/.well-known/ucp` endpoint. Parse and visualize the server's **Capabilities**, **Services**, and **API Endpoints**, giving you instant insight into the peer's technical specifications.

### 2. Transaction Inspector
View all API interactions in a hierarchical Tree View.
- **Full HTTP Protocol Display**: Detailed view of Methods, URLs, Status, and Headers.
- **Payload Visualization**: Beautiful JSON viewer with folding, syntax highlighting, and error path highlighting.
- **Timeline Tracking**: Precisely record the duration and sequence of every request.

### 3. Interactive Shopping Agent
Built-in complete E-commerce UI allowing you to test APIs from a user's perspective:
- **Product Wall**: Supports pagination, hierarchical category filtering, and keyword search.
- **Dynamic Cart**: Test logic for adding, updating, and removing items, as well as inventory checks.
- **Checkout Wizard**: Full checkout flow simulation supporting Payment Handlers and Session management.

### 4. Server-Sent Events (SSE) Listener
Automatically connects to `/api/events` to capture and display asynchronous notifications from the server (e.g., order status updates) in real-time, ensuring zero-latency synchronization between frontend and backend states.

---

## 🛠 Tech Stack

This project is built with cutting-edge Web technologies to ensure peak performance and developer experience:

| Category | Technology | Description |
|----------|------------|-------------|
| **Core** | ![Svelte](https://img.shields.io/badge/-Svelte_5-ff3e00?style=flat-square&logo=svelte) | Using the latest Runes syntax for fine-grained reactivity |
| **Language** | ![TypeScript](https://img.shields.io/badge/-TypeScript-3178c6?style=flat-square&logo=typescript) | Full type safety with strict definitions |
| **Styling** | ![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS_4-38b2ac?style=flat-square&logo=tailwindcss) | Next-generation atomic CSS engine |
| **Icons** | ![Lucide](https://img.shields.io/badge/-Lucide-purple?style=flat-square) | Beautiful, consistent icon library |
| **Validation** | ![Zod](https://img.shields.io/badge/-Zod-3068b7?style=flat-square) | Runtime schema validation and error inference |

---

## 🔧 Technical Highlights

This project implements several advanced engineering practices, showcasing the architectural depth of a Modern Web App:

### 1. Svelte 5 Runes Architecture
We fully adopted Svelte 5's **Runes API** (`$state`, `$derived`, `$props`), moving away from traditional store patterns. This brings **Fine-grained Reactivity** and significantly reduces side effects that could lead to bugs, ensuring the UI remains fluid even when processing massive volumes of real-time UCP messages.

### 2. Dual-Layer Type Safety
We employ **TypeScript** for static checking at compile time and **Zod** for schema validation at runtime.
*   **Compile Time**: TS ensures correctness of components and function calls.
*   **Run Time**: Zod validates external UCP server responses on the fly. If a server returns data that violates the spec (e.g., missing fields or incorrect enums), the Browser intercepts and reports it immediately instead of failing silently.

### 3. Transparent Proxy Architecture
To allow the browser to communicate directly with any third-party UCP server (bypassing Browser CORS restrictions), we built a high-performance **SvelteKit Server Proxy** (`/api/proxy`).
*   Automatically forwards critical Headers (`UCP-Agent`, `X-UCP-API-Key`).
*   Preserves HTTP protocol integrity, allowing the frontend to capture exact Status Codes and Headers for a true "Network Inspector" experience.

### 4. Event-Driven Transaction Correlation Engine
The UCP protocol involves complex asynchronous flows (e.g., HTTP POST triggering an action, SSE pushing results). We implemented a specialized `TransactionStore` that traces and correlates scattered **HTTP Requests** and **SSE Events** under a single Transaction ID. This transforms chaotic logs into a structured, conversational view, drastically reducing debugging complexity.

---

## 🏁 Getting Started

### Prerequisites
*   Node.js 18+
*   npm 9+

### Installation & Running

```bash
# 1. Clone repository
git clone https://github.com/your-org/google-ucp-browser.git

# 2. Install dependencies
cd google-ucp-browser
npm install

# 3. Start development server
npm run dev
```

Open `http://localhost:5173` in your browser to see the UCP Browser dashboard.

### Connect Your UCP Server

1. Enter your UCP Server URL in the top input box (e.g., `http://localhost:8080`).
2. (Optional) Enter API Key if the server requires authentication.
3. Click the **"Discover"** button.
4. Start exploring your API!

---

## 🗺️ Roadmap

- [x] **Protocol Discovery**: Implementation of `.well-known` parsing.
- [x] **Product/Cart Flow**: Complete product and cart operations.
- [x] **Transaction Logs**: Detailed HTTP request logging and UI presentation.
- [ ] **MCP Support**: Integration of Model Context Protocol.
- [ ] **Advanced Payment**: Simulation of diverse payment processors.
- [ ] **Automated Testing Suite**: One-click compliance testing for target servers.

---

<p align="center">
  Built with ❤️ by the Google Advanced Agentic Coding Team
</p>
