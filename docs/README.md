# CIIRS

**B2B circular-economy marketplace connecting waste generators (temples, apartments, restaurants, factories) with recycling startups that convert waste into new products.**

India has 400+ circular-economy startups (flowers→incense, plastic→fabric, food waste→biogas) that fail not because of bad tech, but because they can't find *consistent, verified* raw waste supply. CIIRS is the supply-chain layer that fixes that.

## Core flow

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