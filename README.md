# PrintQueue Pro ⚡️

PrintQueue Pro is the ultimate **Neo-Brutalist Printing SaaS** solution. It provides a stunning, high-contrast, lightning-fast interface bridging the gap between web uploads and physical printing infrastructure.

This repository contains the complete frontend architecture built with a modern, high-performance tech stack.

---

## 🎨 Aesthetic Foundation
The UI is strictly designed using uncompromising **Neo-brutalist** principles:
- **No Softness**: Pure black borders (4px thick), stark white (or pitch black in Dark Mode) backgrounds, and massive bold monospaced typography (`Space Grotesk`, `Space Mono`, `Major Mono Display`).
- **High Contrast**: A clashing neon color palette featuring Magenta (`#FF00FF`), Cyan (`#00FFFF`), and Yellow (`#FFFF00`).
- **Heavy Animation**: Using Framer Motion, transitions are abrupt, geometric, and dynamic.
- **True Dark Mode**: Fluid CSS-variable-based dark mode that flips the script from blinding white to high-contrast dark.

---

## 🛠 Tech Stack
- **Framework:** React + Vite
- **Styling:** Vanilla CSS (CSS Variables for themes) + Framer Motion (Animation)
- **Icons:** Lucide-React (rendered with heavy strokes)
- **Database / Auth:** Supabase (PostgreSQL, Storage, OAuth)
- **PDF Generation:** jsPDF (Client-side Image-to-PDF & Receipt generation)

---

## ✨ Key Features
1. **Intelligent Upload Zone:** Drag & Drop PDF and Images. Images (PNG, JPG, WEBP, GIF, BMP) are instantly converted into 1-page PDFs directly in the browser via `jsPDF`.
2. **Dynamic Configuration:** Real-time price calculation based on pages, color mode, duplex settings, copies, and priority queues.
3. **Queue Dashboard:** Track your print job in real-time, play a custom built-in Snake game while waiting, and seamlessly upload new files to keep printing.
4. **Google Authentication & Profiles:** Secure OAuth via Supabase. Track all print history and instantly download PDF receipts of past jobs.
5. **Admin Control:** Secure `AdminPanel` toggle (via `Ctrl+Shift+A` for authorized roles) to view printer status and manage global queues.

---

## 🚀 Setup & Installation

### 1. Local Development
```bash
# Clone the repository
git clone https://github.com/ompop-pro21/printing-c2c.git
cd printqueue-pro

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your Supabase details. If these are missing, the app defaults to **Mock Mode** for safe testing.
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Schema
Apply the SQL file found in `supabase/schema.sql` to your Supabase SQL editor to create the necessary tables (`profiles`, `print_jobs`, `receipts`) and Row Level Security (RLS) policies.

---

## 🌍 Deployment (Netlify)
This project is configured out-of-the-box for **Netlify**.
- A `netlify.toml` file is included to handle single-page application (SPA) routing correctly.
- Ensure your Node environment is set to `20` in the build settings.
- Build command: `npm run build`
- Publish directory: `dist`

*For an in-depth deployment walkthrough, please refer to the `DEPLOYMENT.md` guide.*

---
*Built for speed. Designed for impact. Welcome to PrintQueue Pro.*
