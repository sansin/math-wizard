# 🧙 Math Wizard - AI-Powered Adaptive Math Learning App

![Math Wizard Badge](https://img.shields.io/badge/Math%20Wizard-AI%20Learning-FFD700?style=for-the-badge)

## 📚 Overview

Math Wizard is a **web-based, AI-driven adaptive math learning platform** designed for kids aged 4-18. It combines personalized question generation, real-time progress tracking, and gamified learning to make math engaging and effective.

**Key Highlights:**
- 🤖 AI-Powered Questions with dynamic, story-based problems
- 📊 Real-time Analytics tracking accuracy and weak areas
- ☁️ Cloud-Based progress syncing via Firebase
- 📱 Mobile-First PWA support for offline learning
- 🎮 Two Learning Modes: Play (adaptive) & Test (structured)
- 🔒 COPPA-Compliant and privacy-focused
- 🚀 Free Hosting on GitHub Pages or Vercel

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- GitHub account
- Firebase account (free)

### Setup (5 minutes)

```bash
git clone https://github.com/YOUR_USERNAME/math-wizard.git
cd math-wizard
npm install
cp .env.example .env.local
```

### Configure Firebase
1. Create project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication & Firestore
3. Copy credentials to `.env.local`

### Run Locally
```bash
npm start
```

### Deploy to GitHub Pages
```bash
npm run build
npm run deploy
```

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.

## 🛠️ Tech Stack

- **Frontend**: React 18 + Tailwind CSS
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **AI**: OpenAI API (optional)
- **Analytics**: Chart.js
- **Deployment**: GitHub Pages / Vercel

## 🔒 Privacy & Security

- ✅ COPPA-compliant
- ✅ No tracking or ads
- ✅ Minimal data collection
- ✅ Firestore security rules

## 📄 License

MIT License © 2026

---

**Made with 💙 for curious minds** | See [SETUP_GUIDE.md](SETUP_GUIDE.md) & [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)