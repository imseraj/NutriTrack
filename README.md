<p align="center">
  <img src="public/favicon.svg" width="64" alt="NutriTrack Logo" />
</p>

<h1 align="center">NutriTrack — Track · Learn · Thrive</h1>

<p align="center">
  A personalized daily nutrition &amp; hydration tracker built with React, TypeScript, and Firebase.<br/>
  Calculate dynamic macro &amp; micro RDA targets based on your profile, log meals, create custom foods, and monitor progress — all from a beautiful, responsive dashboard.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-Private-red" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Dev Server](#running-the-dev-server)
  - [Building for Production](#building-for-production)
- [Firebase Setup](#firebase-setup)
  - [Firestore Data Model](#firestore-data-model)
  - [Security Rules](#security-rules)
  - [Admin System](#admin-system)
- [Nutrition Science & RDA Engine](#nutrition-science--rda-engine)
- [Authentication](#authentication)
- [Offline / Guest Mode](#offline--guest-mode)
- [Testing](#testing)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**NutriTrack** is a full-featured nutrition tracking single-page application designed for individuals who want precise control over their dietary intake. Unlike simplified calorie counters, NutriTrack tracks **36 nutrients** (6 macronutrients + 30 micronutrients) and provides **personalized RDA targets** dynamically computed from your biometric profile using clinically-referenced formulas (Mifflin-St Jeor for adults, Schofield for children, with NIH DRI adjustments for age, gender, pregnancy, and lactation).

The app works in two modes:
1. **Cloud mode** — Firebase Authentication + Firestore real-time sync across devices.
2. **Guest / Offline mode** — All data persisted locally in `localStorage` with no account required.

---

## Key Features

### 🍽️ Food Logging & Search
- **Unified search bar** — search across the global foods database, your personal custom foods, and your saved meals simultaneously.
- **Category browsing** — browse foods by category (Protein, Fruit, Vegetable, Grain, Dairy, Nut, Fat, Beverage, Custom Foods) with visual food cards.
- **Debounced auto-suggest** with keyboard navigation (↑/↓/Enter/Escape).
- **Recent foods** — automatically tracks your last 8 used foods for quick re-add.
- **Duplicate prevention** — prevents adding the same food item twice with a friendly toast notification.

### 📊 Comprehensive Nutrition Table
- Displays **all 36 tracked nutrients** in a split-pane table with synchronized scrolling.
- **Left pane** (fixed): Food name, quantity controls (±/slider/input), unit selector, and 6 macro columns (Cal, Protein, Carbs, Fat, Fiber, Sugar).
- **Right pane** (scrollable): 30 micronutrient columns covering all fat-soluble vitamins (A, D, E, K), water-soluble vitamins (C, B1–B12), macrominerals (Ca, P, Mg, Na, K, Cl, S), and trace minerals (Fe, Zn, I, Se, Cu, Mn, F, Cr, Mo, Co).
- **Footer rows**: Total consumed, RDA target, and % Completed with color-coded indicators.
- **Expandable portion slider** per food item for fine-tuned quantity adjustment.
- **Responsive layout** — collapses macros into the scrollable pane on mobile breakpoints.

### 🎯 Dynamic RDA Computation
- Personalised calorie targets using **Mifflin-St Jeor** (adults) and **Schofield** (children <18) equations.
- Macro distribution follows **AMDR percentages** adjusted for goal (maintain, lose, gain, muscle_gain).
- **23 nutrients with official NIH RDA**, **9 with Adequate Intake (AI)**, and **4 with estimated/reference values**.
- Dynamic adjustments for: age, gender, activity level, pregnancy, and lactation.
- Safety floor: 1500 kcal (male), 1200 kcal (female).

### 💧 Hydration Tracker
- Animated **SVG water glass** with dual-layer wave effect.
- Quick-add presets: Glass (250ml), Bottle (500ml), Shaker (750ml).
- Custom amount input.
- Editable daily water goal (default 2000ml).
- Reset functionality.

### 🧠 Coaching & Insights Panel
- **Real-time rule-based insights** that recalculate as you modify your plate.
- Categories: Energy analysis, macronutrient gaps, micronutrient deficiencies, sodium warnings.
- Food-specific suggestions (e.g., "Try adding chicken breast, paneer, tofu..." for low protein).
- Color-coded severity badges: ✅ Success, ⚠️ Warning, ℹ️ Info, 🔴 Danger.

### 📈 Interactive Charts
- **Macro Breakdown** — donut/pie chart showing calorie contribution from protein, carbs, and fat.
- **Weekly Calorie Trend** — bar chart of daily logged calories with inline edit dialog to correct past entries.
- **Micronutrient Coverage** — bar chart showing % of RDA for 15 key vitamins & minerals with color thresholds.
- **RDA Comparison Table** — scrollable list of all 36 nutrients with animated progress bars.

### 🍱 Saved Meals
- Save your current plate as a named meal (e.g., "Recovery Breakfast").
- Load meals back onto the plate with re-generated unique IDs.
- **Quick log** — load a saved meal and simultaneously log it to your daily history.
- Search saved meals from the main search bar.
- Delete meals with confirmation.

### 🧪 Custom Food Creator
- Full-form builder for registering new foods with: name, emoji, category, base quantity, base unit, serving size, all 6 macros, and all 30 micronutrients.
- Edit existing custom foods inline.
- **Admin-only global food management** — admins can create, edit, and delete foods from the centralized global database that all users see.

### 📄 PDF Export
- Generate **A3 landscape PDF reports** with all 36 nutrient columns.
- Includes: profile summary, individual food rows, totals, RDA targets, and % completion.
- Green-branded header with timestamp.

### 🌙 Dark Mode
- Full light/dark theme toggle with class-based implementation.
- Custom **Sage & Cream** color palette for light mode, deep sage palette for dark mode.
- Theme persisted in `localStorage`.

### 🔐 Authentication
- **Email/Password** — sign up, sign in, password reset via Firebase Auth.
- **Google OAuth** — one-click Google sign-in popup.
- **Client-side rate limiting** — lockout after 5 failed login attempts (60 second cooldown).
- Dedicated full-page login screen with split-pane layout and ambient design.

### 📱 Responsive Design
- Fully responsive from mobile to desktop.
- Mobile-optimized food table with collapsed columns.
- `use-mobile` hook for adaptive UI patterns.

---

## Tech Stack

| Layer          | Technology                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| **Framework**  | [React 18](https://react.dev) with TypeScript                              |
| **Build Tool** | [Vite 5](https://vitejs.dev) + [SWC](https://swc.rs) (via `@vitejs/plugin-react-swc`) |
| **Styling**    | [Tailwind CSS 3.4](https://tailwindcss.com) + custom CSS variables + `tailwindcss-animate` |
| **UI Library** | [shadcn/ui](https://ui.shadcn.com) (Radix UI primitives + CVA)            |
| **State**      | React Context (`NutritionContext`) + `localStorage` / Firestore            |
| **Routing**    | [React Router DOM 6](https://reactrouter.com)                              |
| **Backend**    | [Firebase 12](https://firebase.google.com) (Auth + Firestore with offline persistence) |
| **Charts**     | [Recharts 2](https://recharts.org) (BarChart, PieChart)                    |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/)                         |
| **Forms**      | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) validation |
| **PDF**        | [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| **Fonts**      | [Outfit](https://fonts.google.com/specimen/Outfit) (display) + [Figtree](https://fonts.google.com/specimen/Figtree) (body) via `@fontsource` |
| **Testing**    | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) + jsdom |
| **Linting**    | ESLint 9 + `typescript-eslint` + `react-hooks` + `react-refresh` plugins   |
| **Toasts**     | [Sonner](https://sonner.emilkowal.dev) + Radix Toast                       |
| **Data Fetch** | [TanStack React Query 5](https://tanstack.com/query)                       |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────┐    ┌──────────────────────────────────────┐ │
│  │  Login Page │    │            Index (Dashboard)         │ │
│  │  /login     │    │  ┌──────┐ ┌───────┐ ┌────────────┐   │ │
│  │             │    │  │Search│ │FoodTbl│ │NutrSummary │   │ │
│  │ Email/Pass  │    │  └──────┘ └───────┘ └────────────┘   │ │
│  │ Google OAuth│    │  ┌──────┐ ┌───────┐ ┌────────────┐   │ │
│  │ Guest Mode  │    │  │Charts│ │Water  │ │ Insights   │   │ │
│  └──────┬──────┘    │  └──────┘ └───────┘ └────────────┘   │ │
│         │           │  ┌──────────┐ ┌─────────────────┐    │ │
│         │           │  │SavedMeals│ │ CustomFoodForm  │    │ │
│         │           │  └──────────┘ └─────────────────┘    │ │
│         │           └──────────────────┬───────────────────┘ │
│         └──────────────────┬───────────┘                     │
│                            │                                 │
│              ┌─────────────▼──────────────┐                  │
│              │    NutritionContext        │                  │
│              │  (Central State Provider)  │                  │
│              │  - Profile, RDA, Plate     │                  │
│              │  - Auth state, Admin       │                  │
│              │  - Meals, History, Water   │                  │
│              │  - Custom foods, Theme     │                  │
│              └─────────┬──────────────────┘                  │
│                        │                                     │
│            ┌───────────┴───────────┐                         │
│            ▼                       ▼                         │
│   ┌────────────────┐    ┌──────────────────┐                 │
│   │  localStorage  │    │    Firebase      │                 │
│   │  (Guest Mode)  │    │  Auth + Firestore│                 │
│   │  nutritrack:v1 │    │  Real-time sync  │                 │
│   └────────────────┘    └──────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

**Data flow**: All state mutations go through `NutritionContext`. If a Firebase user is logged in, changes are written to Firestore with optimistic UI updates and rollback on failure. If in guest mode, data is persisted to `localStorage` under the `nutritrack:v1` namespace. Real-time Firestore `onSnapshot` listeners keep the UI in sync across tabs/devices.

---

## Project Structure

```
glow-nutrition-hub-main/
├── public/                          # Static assets
│   ├── favicon.svg                  # App icon (leaf)
│   ├── favicon.ico                  # Legacy icon
│   ├── robots.txt                   # SEO crawl config
│   ├── _redirects                   # SPA redirect rules (Netlify)
│   └── placeholder.svg
│
├── src/
│   ├── main.tsx                     # App entry, font imports
│   ├── App.tsx                      # Root component (providers + routing)
│   ├── App.css                      # Minimal app-level styles
│   ├── index.css                    # Design system (Sage & Cream palette,
│   │                                #   dark mode vars, glass-card, bento-tile,
│   │                                #   gradient utilities, scrollbar styles)
│   ├── vite-env.d.ts                # Vite type declarations
│   │
│   ├── context/
│   │   └── NutritionContext.tsx      # ⭐ Central state provider (763 lines)
│   │                                 #   Profile, plate, meals, history, water,
│   │                                 #   auth, admin, Firebase sync, localStorage
│   │
│   ├── data/
│   │   └── foods.ts                 # Food type definitions, RDA_DEFAULT constants,
│   │                                #   UserProfile interface, computeRDA() engine
│   │
│   ├── lib/
│   │   ├── firebase.ts              # Firebase init (Auth + Firestore w/ offline cache)
│   │   ├── nutrition.ts             # Nutrition math (quantityFactor, calcNutrition,
│   │   │                            #   sumNutrition, MICRO_KEYS, formatNum)
│   │   ├── pdf.ts                   # PDF report generation (A3, 36 columns)
│   │   └── utils.ts                 # Tailwind cn() merge utility
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx           # Responsive breakpoint hook
│   │   └── use-toast.ts             # Toast notification hook
│   │
│   ├── pages/
│   │   ├── Index.tsx                # ⭐ Main dashboard (744 lines)
│   │   │                            #   DailyEnergyTile, MacrosTile, ItemsTile,
│   │   │                            #   MealsCountTile, SavedMealsTab, CustomFoodsTab,
│   │   │                            #   footer (Privacy, Terms, Contact dialogs)
│   │   ├── Login.tsx                # Full-page auth screen (Google + Email + Guest)
│   │   └── NotFound.tsx             # 404 page
│   │
│   ├── components/
│   │   ├── NavLink.tsx              # Navigation link component
│   │   │
│   │   ├── auth/
│   │   │   └── AuthDialog.tsx       # Modal auth dialog (sign in / sign up / forgot)
│   │   │
│   │   ├── nutrition/
│   │   │   ├── Header.tsx           # App header (branding, profile dialog, save & export, theme toggle, user menu)
│   │   │   ├── FoodSearch.tsx       # Search bar + auto-suggest + category chips + food shelf
│   │   │   ├── FoodTable.tsx        # ⭐ Split-pane nutrition table (620 lines, 36 columns)
│   │   │   ├── NutritionSummary.tsx # Sticky sidebar summary (pie chart + macro bars + calorie progress)
│   │   │   ├── RDATable.tsx         # Full 36-nutrient RDA comparison with animated progress bars
│   │   │   ├── Charts.tsx           # MicroBarChart, MacroPie, HistoryChart, StatCards
│   │   │   ├── WaterTracker.tsx     # SVG water glass with wave animation
│   │   │   ├── InsightsPanel.tsx    # Rule-based nutrition coaching engine
│   │   │   ├── ProfileCard.tsx      # Inline profile editor card
│   │   │   ├── SavedMeals.tsx       # Save/Load/Export/Log meal panel
│   │   │   ├── CustomFoodDialog.tsx # Dialog wrapper for custom food form
│   │   │   └── CustomFoodForm.tsx   # Full food registration form (name, emoji, macros, 30 micros)
│   │   │
│   │   └── ui/                      # 49 shadcn/ui primitives (accordion, button, card, chart,
│   │                                #   dialog, dropdown, form, input, select, slider, tabs,
│   │                                #   toast, tooltip, etc.)
│   │
│   └── test/
│       ├── setup.ts                 # Test setup (jsdom + testing-library matchers)
│       └── example.test.ts          # Example test
│
├── .env.example                     # Required Firebase env vars template
├── .env                             # Local Firebase credentials (gitignored)
├── .gitignore
├── components.json                  # shadcn/ui configuration
├── eslint.config.js                 # ESLint 9 flat config
├── firestore.rules                  # Firestore security rules
├── index.html                       # HTML entry (SEO meta, OG tags, Twitter cards)
├── package.json                     # Dependencies & scripts
├── postcss.config.js                # PostCSS (autoprefixer + tailwind)
├── tailwind.config.ts               # Tailwind config (custom fonts, colors, animations)
├── tsconfig.json                    # TypeScript base config
├── tsconfig.app.json                # App-specific TS config
├── tsconfig.node.json               # Node-specific TS config
├── vite.config.ts                   # Vite config (SWC, path aliases, HMR)
└── vitest.config.ts                 # Vitest config (jsdom, path aliases)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (or **bun** — the project includes a `bun.lockb`)
- A **Firebase project** (optional — the app works fully offline without it)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/glow-nutrition-hub.git
cd glow-nutrition-hub

# Install dependencies
npm install
# or
bun install
```

### Environment Variables

Copy the example file and fill in your Firebase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase project values:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Note**: If you leave these blank or omit the `.env` file entirely, the app will run in **offline-only guest mode** using `localStorage`. No login functionality will be available, but all tracking features work locally.

### Running the Dev Server

```bash
npm run dev
```

The app starts at **`http://localhost:8080`** with Hot Module Replacement enabled.

### Building for Production

```bash
npm run build
```

Output is written to `dist/`. Preview the production build with:

```bash
npm run preview
```

---

## Firebase Setup

### Firestore Data Model

```
firestore/
├── global_foods/                    # Global food database (admin-managed)
│   └── {foodId}                     # Food document (name, emoji, category, nutrition...)
│
├── admins/                          # Admin registry (read-only by user, write via console)
│   └── {userId}                     # Admin marker document
│
└── users/
    └── {userId}/
        ├── profile/
        │   └── settings             # Profile, plate, water, recent foods, recent quantities
        ├── saved_meals/
        │   └── {mealId}             # SavedMeal (name, items[], savedAt)
        ├── custom_foods/
        │   └── {foodId}             # User's custom food definitions
        └── daily_logs/
            └── {YYYY-MM-DD}         # DailyEntry (date, totals, itemCount)
```

### Security Rules

The included `firestore.rules` file enforces:

| Collection | Read | Write |
|---|---|---|
| `global_foods` | ✅ Anyone | 🔒 Admin only (custom claims or `admins` collection) |
| `admins` | 🔒 Own document only | ❌ Console only |
| `users/{userId}/**` | 🔒 Owner only | 🔒 Owner only |

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

### Admin System

Admin status is checked via two mechanisms (in priority order):

1. **Firebase Custom Claims** — `admin: true` on the ID token.
2. **Firestore `admins` collection** — document with the user's UID exists.

Admins can:
- Add, edit, and delete foods from the **global foods database**.
- Toggle between "Personal" and "Global" views in the Custom Foods tab.

To make a user an admin, either:
- Set custom claims via Firebase Admin SDK, or
- Add a document to `firestore > admins > {userId}` via the Firebase Console.

---

## Nutrition Science & RDA Engine

NutriTrack's RDA engine (`computeRDA()` in `src/data/foods.ts`) uses clinically-referenced formulas:

### Calorie Calculation

| Age Group | Formula |
|---|---|
| Adults (≥ 18) | **Mifflin-St Jeor**: `10×weight + 6.25×height − 5×age + gender_offset` |
| Children (< 18) | **Schofield equations** by age/gender bracket |

Multiplied by activity factor (1.2–1.9) with goal adjustments:

| Goal | Adjustment |
|---|---|
| Maintain | 0 |
| Lose weight | −500 kcal |
| Gain weight | +500 kcal |
| Build muscle | +300 kcal |
| Pregnant | +300 kcal |
| Lactating | +500 kcal |

### Macro Distribution (AMDR-based)

| Goal | Protein | Fat | Carbs |
|---|---|---|---|
| Maintain | 20% | 30% | 50% |
| Lose | 30% | 30% | 40% |
| Gain / Muscle | 25% | 25% | 50% |
| Age ≥ 65 | ≥ 25% | — | — |

Fiber calculated as **14g per 1000 kcal**.

### Tracked Nutrients (36 total)

| Category | Nutrients |
|---|---|
| **Macros** (6) | Calories, Protein, Carbohydrates, Fat, Fiber, Sugar |
| **Fat-soluble vitamins** (4) | A, D, E, K |
| **Water-soluble vitamins** (9) | C, B1, B2, B3, B5, B6, B7, B9, B12 |
| **Macrominerals** (7) | Calcium, Phosphorus, Magnesium, Sodium, Potassium, Chloride, Sulfur |
| **Trace minerals** (10) | Iron, Zinc, Iodine, Selenium, Copper, Manganese, Fluoride, Chromium, Molybdenum, Cobalt |

---

## Authentication

| Method | Details |
|---|---|
| **Email/Password** | Firebase `createUserWithEmailAndPassword` / `signInWithEmailAndPassword` |
| **Google OAuth** | `signInWithPopup` with `GoogleAuthProvider` |
| **Password Reset** | `sendPasswordResetEmail` |
| **Guest Mode** | No account required — `sessionStorage` flag + `localStorage` persistence |

### Rate Limiting

Client-side brute-force protection:
- After **5 failed login attempts**, the account is locked out for **60 seconds**.
- Counters tracked in `localStorage` (`nutritrack:login:failed_attempts`, `nutritrack:login:lockout_until`).
- Successful login resets all counters.

---

## Offline / Guest Mode

When Firebase is not configured or the user selects "Continue as Guest":

- All state (profile, plate, meals, history, custom foods, water, theme) is persisted in `localStorage` under the `nutritrack:v1` namespace.
- The global foods database is loaded from the last-synced localStorage cache.
- No authentication UI is shown when Firebase is completely unconfigured.
- Guest history retains the most recent 14 daily entries.

When a user later signs in:
- Firestore becomes the source of truth via real-time `onSnapshot` listeners.
- `localStorage` writes are disabled for the authenticated user.
- Signing out reloads guest data from `localStorage`.

---

## Testing

The project uses **Vitest** with **jsdom** and **Testing Library**:

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch
```

Test configuration:
- Environment: `jsdom`
- Setup file: `src/test/setup.ts` (extends `jest-dom` matchers)
- Pattern: `src/**/*.{test,spec}.{ts,tsx}`

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 8080 with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Development build with source maps |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm test` | Run Vitest test suite |
| `npm run test:watch` | Run Vitest in watch mode |

---

## Contributing

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/my-feature`)
3. **Commit** changes with descriptive messages
4. **Push** to your fork (`git push origin feature/my-feature`)
5. Open a **Pull Request** with a clear description

### Code Conventions

- **TypeScript strict mode** enabled
- **Path aliases**: `@/` maps to `src/`
- **Component structure**: `src/components/nutrition/` for domain components, `src/components/ui/` for primitives
- **State management**: All shared state flows through `NutritionContext`
- **Styling**: Tailwind utilities + custom CSS variables (no inline hex colors)
- **Fonts**: `Outfit` for headings/display, `Figtree` for body text

---

## License

This project is **private**. All rights reserved.

---

<p align="center">
  Built with 💚 — <strong>Track · Learn · Thrive</strong>
</p>
