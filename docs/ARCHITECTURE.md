# CIIRS

**B2B circular-economy marketplace connecting waste generators (temples, apartments, restaurants, factories) with recycling startups that convert waste into new products.**

India has 400+ circular-economy startups (flowers→incense, plastic→fabric, food waste→biogas) that fail not because of bad tech, but because they can't find *consistent, verified* raw waste supply. CIIRS is the supply-chain layer that fixes that.

## Core # CIIRS — Architecture Specification

This document is the spec you paste (or reference) when prompting the AI coding agent. It defines every model, route, and file so the agent never has to guess or invent scope mid-build.

---

## 1. System overview

- **Pattern:** Monolithic Next.js 14 app (App Router), API routes as the backend, MongoDB Atlas as the single data store. No separate backend service — this keeps a 1-week solo build realistic and is still a legitimate production pattern (same as what Vercel itself recommends for this scale).
- **Auth:** NextAuth.js, Credentials provider, JWT session strategy, two roles: `supplier` and `startup` (+ optional `admin`).
- **AI is called server-side only**, from API routes — never expose Gemini/Claude/HF keys to the client.
- **Deployment:** Vercel (frontend + API routes together), MongoDB Atlas (managed, free M0 tier is enough for a demo/judge dataset).

---

## 2. Database models (Mongoose schemas)

### User
```
_id, role: 'supplier' | 'startup' | 'admin', name, email, passwordHash,
organizationName, organizationType (temple/apartment/restaurant/factory/startup),
phone, address, location: { type: 'Point', coordinates: [lng, lat] },
reliabilityScoreId (ref), greenCreditBalance: Number, createdAt
```

### WasteListing
```
_id, supplierId (ref User), wasteType, subType, quantityKg, unit,
photoUrls: [String] (Cloudinary), aiGrading: { grade, contaminationLevel, confidence, rawResponse },
status: 'listed' | 'matched' | 'requested' | 'confirmed' | 'scheduled' | 'otp_verified' | 'completed' | 'cancelled',
priceEstimate: Number, location, availableFrom, isRecurring: Boolean, recurrencePattern,
createdAt
```

### Contract
```
_id, listingId (ref), supplierId (ref), startupId (ref),
timeline: [{ stage, timestamp, note }],  // the 6-step tracker
scheduledPickupAt, otpCode (hashed), otpVerifiedAt,
greenCreditsAwarded, co2SavedKg, status, createdAt
```

### GreenCredit
```
_id, userId (ref), contractId (ref), amount, reason, balanceAfter, createdAt
```

### ReliabilityScore
```
_id, userId (ref), score: Number (0-850), lastCalculatedAt,
factors: { onTimeRate, cancellationRate, avgResponseTime, disputeRate, volumeConsistency,
completionRate, verifiedTransactionCount, tenureMonths, avgRating,
recurringContractRate, disputeResolutionRate, photoAccuracyRate },
history: [{ score, date }]
```

### ImpactCertificate
```
_id, contractId (ref), userId (ref), certificateNumber (unique, shareable),
co2SavedKg, wasteKg, wasteType, issuedAt, shareUrl, pdfUrl
```

### Dispute
```
_id, contractId (ref), raisedBy (ref User), reason, description, status: 'open'|'resolved'|'rejected',
resolutionNote, createdAt, resolvedAt
```

### Notification
```
_id, userId (ref), type, title, message, read: Boolean, link, createdAt
```

Each model gets its own file under `models/`. Do not combine models into one file — the agent handles single-model files far more reliably than a mega-schema file.

---

## 2a. Reliability Score & Waste Value Estimator — via Claude API (not hand-rolled math)

`lib/reliabilityScore.ts` and `lib/wasteValueEstimator.ts` both call Claude with a fixed system prompt that encodes the exact 12-factor formula and weights as instructions, plus the user's factor data as input, and require Claude to return strict JSON: `{ score: number, breakdown: {...}, reasoning: string }`. This keeps the *methodology* proprietary (you designed the weights and factors) while offloading the computation to the API — no numeric logic written in JS.

Same pattern for pricing: feed Claude the waste type, quantity, grade, and current market reference points; require a JSON response `{ estimatedPricePerKg, priceRange, reasoning }`.

Always validate the JSON shape server-side before writing to the DB (Claude can occasionally wrap output in prose) — use a small Zod schema and re-prompt once on parse failure.

## 3. API routes (Next.js App Router — `app/api/...`)

```
app/api/auth/[...nextauth]/route.ts     — NextAuth config
app/api/auth/register/route.ts          — signup (supplier/startup)

app/api/listings/route.ts               — GET (list/filter), POST (create)
app/api/listings/[id]/route.ts          — GET, PATCH, DELETE
app/api/listings/[id]/analyze/route.ts  — POST → Gemini Vision grading

app/api/match/route.ts                  — POST listingId → Claude matching engine, returns ranked startups

app/api/contracts/route.ts              — GET, POST
app/api/contracts/[id]/route.ts         — GET, PATCH (advance timeline stage)
app/api/contracts/[id]/otp/generate/route.ts  — POST → email OTP via Nodemailer
app/api/contracts/[id]/otp/verify/route.ts    — POST → verify, trigger credits+score update

app/api/credits/route.ts                — GET user's credit history
app/api/reliability/[userId]/route.ts   — GET current score + factor breakdown
app/api/reliability/recalculate/route.ts — POST (internal, called after OTP verify)

app/api/certificates/[contractId]/route.ts — GET → generate/fetch Impact Certificate

app/api/disputes/route.ts               — GET, POST
app/api/notifications/route.ts          — GET, PATCH (mark read)

app/api/chatbot/route.ts                — POST → WasteBot (Claude, with live DB context injected)
app/api/forecast/[wasteType]/route.ts   — GET → Hugging Face supply forecast

app/api/leaderboard/route.ts            — GET city-wise leaderboard
app/api/map/listings/route.ts           — GET geo-filtered listings for the live map
```

---

## 4. Frontend routes (`app/...`)

```
app/page.tsx                     — landing page
app/(auth)/login/page.tsx
app/(auth)/register/page.tsx

app/dashboard/page.tsx            — role-aware dashboard (supplier vs startup view)
app/listings/new/page.tsx         — 3-step listing form (details → photo upload+AI grade → confirm)
app/listings/[id]/page.tsx        — listing detail + matched startups
app/contracts/[id]/page.tsx       — 6-step tracker + OTP entry
app/wallet/page.tsx                — Green Credits wallet
app/reliability/page.tsx           — score breakdown, public profile view
app/certificates/[id]/page.tsx     — shareable certificate page (public route, no auth)
app/map/page.tsx                   — live waste map (Leaflet)
app/leaderboard/page.tsx           — public city leaderboard
app/forecast/page.tsx              — supply forecasting dashboard (startup-only)
app/chat/page.tsx                  — WasteBot full-screen chat
```

---

## 5. Full file tree

```
ciirs/
├── app/
│   ├── api/                     (see section 3)
│   ├── (auth)/
│   ├── dashboard/
│   ├── listings/
│   ├── contracts/
│   ├── wallet/
│   ├── reliability/
│   ├── certificates/
│   ├── map/
│   ├── leaderboard/
│   ├── forecast/
│   ├── chat/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                      (shadcn components — generated, don't hand-write)
│   ├── listings/ListingForm.tsx, ListingCard.tsx, PhotoUploader.tsx
│   ├── contracts/ContractTimeline.tsx, OtpInput.tsx
│   ├── map/WasteMap.tsx, MapMarker.tsx
│   ├── dashboard/StatsCard.tsx, RecentActivity.tsx
│   ├── chat/ChatWindow.tsx
│   └── layout/Navbar.tsx, Sidebar.tsx, Footer.tsx
├── lib/
│   ├── db.ts                    — Mongoose connection singleton
│   ├── auth.ts                  — NextAuth config export
│   ├── ai/gemini.ts              — Gemini Vision client
│   ├── ai/claude.ts              — Claude client (matching + chatbot)
│   ├── ai/huggingface.ts         — HF forecasting client
│   ├── reliabilityScore.ts       — custom scoring algorithm
│   ├── wasteValueEstimator.ts    — custom pricing algorithm
│   ├── otp.ts                    — OTP generation/hashing
│   ├── mailer.ts                 — Nodemailer setup
│   └── cloudinary.ts             — upload helper
├── models/
│   ├── User.ts, WasteListing.ts, Contract.ts, GreenCredit.ts,
│   ├── ReliabilityScore.ts, ImpactCertificate.ts, Dispute.ts, Notification.ts
├── types/
│   └── index.ts                  — shared TS types/interfaces
├── .env.local                    — secrets (never committed)
├── .env.example                  — template with empty values
├── next.config.js
├── tailwind.config.ts
├── package.json
├── README.md
└── vercel.json
```

---

## 6. Environment variables (`.env.example`)

```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

GEMINI_API_KEY=
ANTHROPIC_API_KEY=
HUGGINGFACE_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GMAIL_USER=
GMAIL_APP_PASSWORD=
```

---

## 7. Build order (matches the 1-week / 1hr-a-day plan)

| Day | Scope |
|---|---|
| 1 | Project init, `.env.example`, `lib/db.ts`, all 8 Mongoose models |
| 2 | NextAuth setup, register/login pages, role-aware middleware |
| 3 | Listing creation flow + Cloudinary upload + Gemini grading route |
| 4 | Claude matching engine + contract creation + 6-step timeline UI |
| 5 | OTP flow (generate/verify) + Reliability Score engine + Green Credits |
| 6 | Impact Certificate generation, live map, leaderboard, WasteBot |
| 7 | Forecasting dashboard, polish/UI pass, Vercel deployment, demo data seeding |

One file (or tightly-scoped group of 2-3 files) per prompt — never ask the agent to build a whole feature end-to-end in one shot. See `PROMPT_TEMPLATES.md` for the exact prompt structure per day.

```
Supplier lists waste
      ↓
AI grades photo + matches to best-fit startups (Claude reasoning engine)
      ↓
Startup requests pickup → Contract created
      ↓
Physical pickup happens → OTP verifies it actually occurred
      ↓
Green Credits + Reliability Score update automatically
      ↓
Impact Certificate auto-generated (shareable, WhatsApp-ready)
```

## Why this isn't "just a broker app"

Reliability Score, Green Credits, and the verified Waste Passport transaction trail exist **only on-platform**. A supplier or startup that "found each other once" and moved to WhatsApp loses all of this — no score, no certificate, no credit history for future carbon-credit programs. That lock-in is the actual product, not the listing board — and not the specific API calls behind it either. The 12-factor scoring *methodology* and the verified transaction data it runs on are what's proprietary, not the arithmetic.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui, Framer Motion, Recharts |
| Backend | Next.js API Routes |
| Database | MongoDB Atlas + Mongoose |
| Auth | NextAuth.js (Credentials provider, JWT sessions) |
| Maps | React Leaflet + CartoDB dark tiles |
| Photos | Cloudinary (free tier) |
| OTP delivery | Nodemailer + Gmail App Password |
| AI — vision | Gemini (photo grading: type/grade/quantity/contamination) |
| AI — matching + chat | Claude API (matching engine + WasteBot) |
| AI — forecasting | Hugging Face Inference API (time series) |
| Scoring/pricing | Claude API, driven by a fixed proprietary prompt encoding the 12-factor scoring formula |
| Deployment | Vercel + GitHub |

Full architecture, database schemas, and file structure: see `ARCHITECTURE.md`.
Prompt-by-prompt build order for the AI coding agent: see `PROMPT_TEMPLATES.md`.

## Revenue model

Startup subscriptions (₹999–₹9,999/mo) + 2-3% transaction fee + ESG/EPR compliance reports for corporates (₹25K–₹1L) + Quality Verified badge (₹99/mo) + Green Credit brand partnerships.

## SDG alignment

SDG 12 (Responsible Consumption & Production), SDG 11 (Sustainable Cities & Communities), SDG 9 (Industry, Innovation & Infrastructure).