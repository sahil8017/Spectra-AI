# 🌌 Spectra AI — Premium Intelligence Interface

**Spectra AI** is a state-of-the-art, high-performance AI chat interface designed with a focus on **minimalist aesthetics** and **premium user experience**. Powered by the latest **Google Gemini** models, it seamlessly blends general conversational intelligence with advanced tools for document analysis and video summarization.

![Spectra AI Banner](https://img.shields.io/badge/Spectra%20AI-State--of--the--Art-indigo?style=for-the-badge&logo=google-gemini)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

## ✨ Key Features

- **🚀 Dual-Model Intelligence**: Switch between **Spectra Flash** for lightning-fast tasks and **Spectra Pro** for complex reasoning and deep analysis.
- **💊 Premium Pill-Style UI**: A completely modernized interface utilizing a unified "pill" design language, semi-transparent glassmorphism, and smooth micro-animations.
- **📑 Document Intelligence (RAG)**: Advanced Retrieval-Augmented Generation mode. Upload PDFs, Text, or DOCX files to query your data with context-aware precision.
- **📹 YouTube Deep-Summary**: Extract insights, bullet points, and key takeaways from any YouTube video transcript instantly.
- **🧠 Personalized Memory**: Spectra learns your preferences and remembers key facts about you over time, providing a tailored conversational experience.
- **✏️ Seamless Inline Editing**: Manage your conversation history with modern inline renaming, pinning, and clean hover actions.
- **🔒 Privacy First**: All conversation history and personal settings are stored locally in your browser. No data tracking, just pure intelligence.

---

## 🎨 Design Philosophy: "The Pill Aesthetic"

Spectra AI is built on a design system that prioritizes **visual excellence** and **interaction flow**:
- **Unified Radii**: A global `border-radius: 100px` (pill-style) applied to all interactive elements for a soft, modern feel.
- **Curated Color Palette**: A deep, mysterious dark mode paired with vibrant indigo accents and glassmorphic elevations.
- **Hover Intelligence**: Actions like message timestamps and management buttons only appear when you need them, keeping the interface distraction-free.

---

## 🛠️ Technical Architecture

- **Frontend**: React 18 with Vite for blazing-fast HMR.
- **State Management**: Centralized `ChatContext` for unified state across navigation, settings, and conversation flow.
- **Icons**: Lucide React for a clean, consistent icon set.
- **API**: Custom integration with Google Gemini AI Services.
- **Styling**: Vanilla CSS with modern custom properties for a flexible and lightweight design system.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/Spectra-AI.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Launch the Experience**
   ```bash
   npm run dev
   ```

---

## 🛡️ Privacy & Compliance
Spectra AI is fully GDPR & CCPA compliant. We do not store your conversations on our servers. All history, memories, and personal instructions remain strictly on your local device.

---

## 🔮 Future Roadmap
- [ ] Multi-document cross-referencing
- [ ] Voice-to-Spectra interactive mode
- [ ] Export to PDF/Markdown/Word
- [ ] Real-time internet search integration

---
