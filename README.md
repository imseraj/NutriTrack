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
- [USDA FoodData Central](#usda-fooddata-central)
- [Firebase Setup](#firebase-setup)
  - [Firestore Data Model](#firestore-data-model)
  - [Security Rules](#security-rules)
  - [Admin System](#admin-system)
- [Nutrition Science & RDA Engine](#nutrition-science--rda-engine)
- [Authentication](#authentication)
- [Testing](#testing)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**NutriTrack** is a full-featured nutrition tracking single-page application designed for individuals who want precise control over their dietary intake. It tracks **37 nutrient values** across core macros, fat profile, vitamins, minerals, and choline, with profile-based dietary reference targets where established.

An account is required. Firebase Authentication protects nutrition data in Firestore, and USDA FoodData Central is searched on demand through an authenticated Cloudflare Worker. The full USDA catalog is not copied into Firestore.

---

## Key Features

### 🍽️ Food Logging & Search
- **Unified search bar** — search SR Legacy foods first, alongside your personal foods, admin-curated foods, and saved meals.
- **USDA alternatives on demand** — search Foundation, Survey (FNDDS), and Branded foods only when you choose the alternate-source action.
- **Paged search results** — load another page at the bottom of the results instead of fetching the full USDA catalog.
- **On-demand food data** — FDC results are fetched as needed instead of importing thousands of food records into Firestore.
- **Debounced auto-suggest** with keyboard navigation (↑/↓/Enter/Escape).
- **Recent foods** — automatically tracks your last 8 used foods for quick re-add.
- **Duplicate prevention** — prevents adding the same food item twice with a friendly toast notification.

### 📊 Comprehensive Nutrition Table
- Displays **37 tracked nutrient values** in a split-pane table with synchronized scrolling, plus cholesterol as an informational value.
- **Left pane** (fixed): Food name, quantity controls (±/slider/input), unit selector, and 6 macro columns (Cal, Protein, Carbs, Fat, Fiber, Sugar).
- **Right pane** (scrollable): 30 micronutrient columns covering all fat-soluble vitamins (A, D, E, K), water-soluble vitamins (C, B1–B12), macrominerals (Ca, P, Mg, Na, K, Cl, S), and trace minerals (Fe, Zn, I, Se, Cu, Mn, F, Cr, Mo, Co).
- **Footer rows**: Total consumed, RDA target, and % Completed with color-coded indicators.
- **Expandable portion slider** per food item for fine-tuned quantity adjustment.
- **Responsive layout** — collapses macros into the scrollable pane on mobile breakpoints.

### 🎯 Dynamic RDA Computation
- Estimated energy targets using **2023 National Academies EER equations**, with age-, sex-, activity-, and life-stage-specific models.
- Macro distribution follows **AMDR percentages** adjusted for goal (maintain, lose, gain, muscle_gain).
- Reference targets use RDAs, AIs, and limits where established; mono/polyunsaturated fat and cholesterol are informational.
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
- **Reference Target Comparison** — scrollable list of tracked nutrients with RDA/AI/limit indicators where targets exist.

### 🍱 Saved Meals
- Save your current plate as a named meal (e.g., "Recovery Breakfast").
- Load meals back onto the plate with re-generated unique IDs.
- **Quick log** — load a saved meal and simultaneously log it to your daily history.
- Search saved meals from the main search bar.
- Delete meals with confirmation.

### 🧪 Custom Food Creator
- Full-form builder for registering new foods with: name, serving size, core macros, fat profile, cholesterol, vitamins, minerals, and choline.
- Edit existing custom foods inline.
- **Admin-only global food management** — admins can create, edit, and delete foods from the centralized global database that all users see.

### 📄 PDF Export
- Generate **A3 landscape PDF reports** with tracked nutrients and cholesterol.
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
| **State**      | React Context (`NutritionContext`) + Firestore                              |
| **Routing**    | [React Router DOM 6](https://reactrouter.com)                              |
| **Backend**    | [Firebase](https://firebase.google.com) (Auth + Firestore) + [Cloudflare Workers](https://workers.cloudflare.com) (USDA API proxy) |
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
│  │  Sign In    │    │  │Charts│ │Water  │ │ Insights   │   │ │
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
│   │ USDA FoodData  │    │    Firebase      │                 │
│   │ Central API    │    │ Auth + Firestore │                 │
│   │ via Worker     │    │  User data sync  │                 │
│   └────────────────┘    └──────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

**Data flow**: All state mutations go through `NutritionContext` and are stored in the signed-in user's Firestore records. Search requests go to a Cloudflare Worker, which verifies the Firebase ID token, calls FoodData Central with a server-side API key, and returns matching foods. USDA food records are not bulk-stored in Firestore.

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
│   │                                 #   auth, admin, Firebase sync, theme
│   │
│   ├── data/
│   │   └── foods.ts                 # Food type definitions, RDA_DEFAULT constants,
│   │                                #   UserProfile interface, computeRDA() engine
│   │
│   ├── lib/
│   │   ├── firebase.ts              # Firebase init (Auth + Firestore + Functions)
│   │   ├── foodDataCentral.ts       # FDC result mapping and callable search client
│   │   ├── nutrition.ts             # Nutrition math (quantityFactor, calcNutrition,
│   │   │                            #   sumNutrition, MICRO_KEYS, formatNum)
│   │   ├── pdf.ts                   # PDF report generation (A3, full nutrient profile)
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
│   │   ├── Login.tsx                # Full-page auth screen (Google + Email)
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
│   │   │   ├── FoodTable.tsx        # ⭐ Split-pane nutrition table
│   │   │   ├── NutritionSummary.tsx # Sticky sidebar summary (pie chart + macro bars + calorie progress)
│   │   │   ├── RDATable.tsx         # Dietary reference target comparison
│   │   │   ├── Charts.tsx           # MicroBarChart, MacroPie, HistoryChart, StatCards
│   │   │   ├── WaterTracker.tsx     # SVG water glass with wave animation
│   │   │   ├── InsightsPanel.tsx    # Rule-based nutrition coaching engine
│   │   │   ├── ProfileCard.tsx      # Inline profile editor card
│   │   │   ├── SavedMeals.tsx       # Save/Load/Export/Log meal panel
│   │   │   ├── CustomFoodDialog.tsx # Dialog wrapper for custom food form
│   │   │   └── CustomFoodForm.tsx   # Full food registration form (macros, fat profile, vitamins, minerals)
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
- A **Firebase project** with Authentication and Firestore enabled
- A **Cloudflare account** for the free Workers proxy
- A **USDA FoodData Central API key** from https://fdc.nal.usda.gov/api-key-signup

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

An authenticated Firebase account is required to use the dashboard. The public Worker URL is configured as `VITE_FDC_API_URL`; the USDA API key is stored as a Cloudflare Worker secret and must not be added to `.env` or any `VITE_*` variable.

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

## USDA FoodData Central

Food search calls USDA FDC through a Cloudflare Worker. The Worker verifies the user's Firebase ID token and reads the API key from Cloudflare Secrets. This keeps the key out of the browser and does not require Firebase Blaze or Firebase Cloud Functions.

Install and deploy the Worker from its directory:

```bash
cd workers/fdc-api
npm install
npx wrangler login
npx wrangler secret put FDC_API_KEY
npx wrangler deploy
```

For local development, copy `workers/fdc-api/.dev.vars.example` to `workers/fdc-api/.dev.vars` and put your key in that ignored local file. Start the Worker with `npx wrangler dev` and set `VITE_FDC_API_URL=http://127.0.0.1:8787` in the app's `.env`. For production, set `VITE_FDC_API_URL` to the `workers.dev` URL printed by deploy and rebuild the frontend.

The Worker allows local Vite origins, the default Firebase Hosting domains, and `https://nutriotrack.netlify.app`. Add a custom production origin to `ALLOWED_ORIGINS` in `workers/fdc-api/wrangler.jsonc`, without a trailing slash or path, then redeploy the Worker. Searches default to SR Legacy and return 12 foods per page; users can explicitly search the other supported data types, and more results are loaded on demand. Search results are not written to Firestore. USDA nutrient values are mapped into the app's per-100 g or package-serving model. USDA FoodData Central data is public domain; attribution is requested by USDA.

### Netlify deployment

The Netlify frontend and the Cloudflare Worker are deployed separately. Deploying the frontend does not deploy the Worker or upload its secret.

1. Deploy the Worker using the commands above. If it is already deployed, run `npx wrangler deploy` again after changing `ALLOWED_ORIGINS`.
2. In Netlify, open the site's **Project configuration > Environment variables** and set `VITE_FDC_API_URL` to the HTTPS Worker URL printed by Wrangler, for example `https://nutritrack-fdc-api.<your-subdomain>.workers.dev`. Make the variable available to builds in the Production deploy context. Do not use the example placeholder or a localhost URL.
3. Trigger a new production deploy. Vite embeds `VITE_*` variables during the build, so changing a Netlify environment variable does not update an existing deployment. Local `.env` files are ignored by Git and are not uploaded to Netlify.
4. Ensure `nutriotrack.netlify.app` is listed in **Firebase Console > Authentication > Settings > Authorized domains** for authentication on this domain.
5. Sign in on the deployed site and search for a food. `USDA search is not configured. Set VITE_FDC_API_URL.` means the frontend was built without the variable. A CORS error means the Worker must allow the site's exact origin and be redeployed.

Keep `FDC_API_KEY` only in Cloudflare Worker secrets. Never put the USDA key in a `VITE_*` variable or the frontend bundle.

---

## Firebase Setup

### Firestore Data Model

```
firestore/
├── global_foods/                    # Optional small admin-curated catalog (not the USDA dataset)
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
- Add, edit, and delete foods from the optional **admin-curated catalog**.
- Toggle between "Personal" and "Global" views in the Custom Foods tab.

To make a user an admin, either:
- Set custom claims via Firebase Admin SDK, or
- Add a document to `firestore > admins > {userId}` via the Firebase Console.

---

## Nutrition Science & RDA Engine

NutriTrack's target engine (`computeRDA()` in `src/data/foods.ts`) uses published dietary reference values and the **2023 National Academies Estimated Energy Requirement (EER)** equations. Energy estimates are not BMI targets or medical advice.

### Energy Estimate

| Age / life stage | Estimate |
|---|---|
| Infants and toddlers (< 3) | Sex-specific EER equations plus age-specific growth energy |
| Children and adolescents (3–18) | Sex-, age-, height-, weight-, and activity-category EER equations plus growth energy |
| Adults (19+) | Sex-, age-, height-, weight-, and activity-category EER equations |
| Pregnancy | First trimester uses the non-pregnant estimate. Second/third trimester estimate requires gestational week and pre-pregnancy weight. |
| Lactation | Uses the non-pregnant EER plus a selected early or later postpartum allowance. |

Activity level selects an EER activity category. Adult-only goal adjustments are applied to maintenance estimates:

| Goal | Adjustment |
|---|---|
| Maintain | 0 |
| Lose weight | −500 kcal |
| Gain weight | +500 kcal |
| Build muscle | +300 kcal |
Pregnancy and lactation have separate life-stage handling; adult weight-loss/gain adjustments are not applied to children or these life stages. Users can optionally override calories, protein, carbohydrates, fat, fiber, and total-sugar targets for eligible adult profiles. Micronutrient targets remain profile-based.

### Macro Distribution

| Goal | Protein | Fat | Carbs |
|---|---|---|---|
| Maintain | 20% | 30% | 50% |
| Lose | 30% | 30% | 40% |
| Gain / Muscle | 25% | 25% | 50% |
| Age ≥ 65 | ≥ 25% | — | — |

Fiber calculated as **14g per 1000 kcal**.

### Tracked Nutrients (37 total; cholesterol shown separately)

| Category | Nutrients |
|---|---|
| **Core macros** (6) | Calories, Protein, Carbohydrates, Total Fat, Fiber, Total Sugar |
| **Fat profile** (4) | Saturated Fat, Monounsaturated Fat, Polyunsaturated Fat, ALA (Omega-3) |
| **Vitamins** (13) | A, D, E, K, C, B1, B2, B3, B5, B6, B7, B9, B12 |
| **Minerals and electrolytes** (13) | Calcium, Phosphorus, Magnesium, Sodium, Potassium, Chloride, Iron, Zinc, Iodine, Selenium, Copper, Manganese, Molybdenum |
| **Other essential nutrient** (1) | Choline |

Dietary cholesterol is shown as an informational amount without a daily target. Saturated fat uses a calorie-based limit, ALA and choline use Adequate Intake targets, and mono/polyunsaturated fats have no percentage goal.

---

## Authentication

| Method | Details |
|---|---|
| **Email/Password** | Firebase `createUserWithEmailAndPassword` / `signInWithEmailAndPassword` |
| **Google OAuth** | `signInWithPopup` with `GoogleAuthProvider` |
| **Password Reset** | `sendPasswordResetEmail` |
| **Dashboard access** | Sign-in required; user nutrition data is stored in Firestore |

### Rate Limiting

Client-side brute-force protection:
- After **5 failed login attempts**, the account is locked out for **60 seconds**.
- Counters tracked in `localStorage` (`nutritrack:login:failed_attempts`, `nutritrack:login:lockout_until`).
- Successful login resets all counters.

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
