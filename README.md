# 🧙 Math Wizard — AI-Powered Adaptive Math Learning App

[![Live App](https://img.shields.io/badge/Live-sansin.github.io%2Fmath--wizard-7C3AED?style=for-the-badge)](https://sansin.github.io/math-wizard/)
[![Tests](https://img.shields.io/badge/tests-48%20passed-10B981?style=flat-square)]()
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)](https://react.dev)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)]()

A **web-based, AI-driven adaptive math learning platform** for kids aged 4–18.  
Personalised question generation · real-time analytics · gamified XP system · parent dashboard.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **AI Question Generation** | GPT-3.5 Turbo generates contextual, grade-appropriate questions |
| **Adaptive Difficulty** | Adjusts difficulty in real-time based on accuracy & streak |
| **Play & Test Modes** | Unlimited adaptive practice or structured 10-question tests |
| **XP & Level System** | 10 levels with streak bonuses, daily goals, and level-up celebrations |
| **Parent Dashboard** | Read-only progress reports, weekly trends, topic mastery, activity feed |
| **Analytics Dashboard** | Line/bar charts for accuracy trends & topic breakdown |
| **10 Grade Ranges** | KG–1 through 9+, covering 60+ math topics per grade |
| **Mobile-First** | Responsive Tailwind CSS design with touch-friendly targets |
| **Cloud Sync** | Firebase Auth + Firestore keeps progress across devices |
| **Accessibility** | Skip-to-content, focus-visible rings, aria-live feedback |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, Tailwind CSS 3.3 |
| State | React hooks + Context |
| Backend | Firebase Firestore + Auth |
| AI | OpenAI GPT-3.5 Turbo (optional — falls back to rule-based) |
| Charts | Chart.js 4 + react-chartjs-2 |
| Testing | Jest + React Testing Library (48 tests) |
| Deploy | GitHub Pages via `gh-pages` |
| Performance | React.lazy code-splitting, useMemo, React.memo |

## 🚀 Quick Start

```bash
# Clone & install
git clone https://github.com/sansin/math-wizard.git
cd math-wizard
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Firebase + OpenAI credentials

# Run locally
npm start

# Run tests
npm test

# Build & deploy to GitHub Pages
npm run build
npm run deploy
```

### Environment Variables (`.env.local`)

```env
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456
REACT_APP_FIREBASE_APP_ID=1:123456:web:abc
REACT_APP_OPENAI_API_KEY=sk-...   # Optional — app works without it
```

## 📁 Project Structure

```
src/
├── App.jsx                 # Main shell — nav, routing, XP state
├── App.css                 # Custom animations (confetti, shake, skeleton)
├── components/
│   ├── AnalyticsDashboard  # Charts, KPIs, focus areas
│   ├── ModuleSelector      # Grade & module selection → starts sessions
│   ├── ParentDashboard     # Read-only parent progress view
│   ├── ProfileSettings     # Edit profile, change password
│   ├── QuestionCard        # Core gameplay (~1270 lines)
│   └── Registration        # Login / register / guest flow
├── data/
│   └── mathModules.js      # 60+ topics per grade, difficulty thresholds
├── services/
│   ├── aiService.js        # OpenAI + fallback question generation
│   ├── databaseService.js  # Firestore CRUD (profiles, answers, stats)
│   └── xpService.js        # XP/level system with atomic Firestore ops
└── __tests__/              # Jest unit + integration tests (48 tests)
```

## 🧪 Testing

```bash
npm test                    # Interactive watch mode
npm test -- --watchAll=false --verbose  # CI mode
```

**Coverage:** 5 test suites, 48 tests covering:
- XP calculations (levels, thresholds, streak/difficulty bonuses)
- Database service (Firestore mocked — CRUD operations, stats computation)
- Math modules data integrity (grade ranges, module structure, topic uniqueness)
- Registration component (form rendering, validation, input constraints)
- ModuleSelector component (grade cards, module display, mode buttons)

## 🔒 Privacy & Security

- COPPA-compliant — minimal data collection
- No ads or tracking
- API keys in environment variables (never committed)
- Firestore security rules enforce user-scoped access
- Password changes require recent authentication

## 📄 License

MIT © 2026

---

**Made with 💙 for curious minds**