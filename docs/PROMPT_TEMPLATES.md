# CIIRS — Prompt templates for the AI coding agent

## The one rule that prevents the collapse you had before

**One file (or one tightly-scoped feature touching 2-3 files max) per prompt.** Never say "build the contract system" — that's 6 files and the agent will either truncate, drift, or leave stubs. Break it down yourself before you prompt.

## The template (use for every single prompt)

```
CONTEXT: This is CIIRS, a Next.js 14 (App Router, TypeScript) B2B waste
marketplace. Stack: MongoDB Atlas + Mongoose, NextAuth.js (Credentials, JWT),
Tailwind + shadcn/ui, Cloudinary, Gemini/Claude/HuggingFace APIs.
[paste the relevant section of ARCHITECTURE.md — e.g. just the WasteListing
schema, or just the /api/listings/[id]/analyze route spec. Never paste the
whole architecture doc into every prompt — just the part this file needs.]

FILE: [exact path, e.g. models/WasteListing.ts]

TASK: [one specific, bounded task — e.g. "Create the Mongoose schema and
model for WasteListing exactly as specified above, with proper TypeScript
types and a geospatial index on location."]

REQUIREMENTS:
- Complete file, no placeholders, no "// TODO: implement this later"
- No omitted error handling
- Follow the exact field names given above (nothing renamed or reinterpreted)
- If this file imports from another file that doesn't exist yet, use the
  exact expected export name/signature so nothing breaks when that file is
  built next

Do not modify any other file. Do not create additional files beyond what I
asked for.
```

## After every prompt (your checklist, not the agent's)

1. Accept the change
2. Save (Ctrl+S) if it doesn't auto-save
3. Confirm the file exists on disk and actually has content (open it)
4. Run `npm run dev` (or `npm run build` for a stricter check) if you've hit a natural checkpoint (e.g. end of a model batch, end of a route batch)
5. Fix errors *before* moving to the next file — don't stack unresolved errors across prompts

## Day-by-day prompt sequence

### Day 1 — Foundation
1. `package.json` + project scaffolding prompt ("Next.js 14 App Router + TS project with these exact dependencies: [list from README stack table]")
2. `.env.example` (just the variable names, no values)
3. `lib/db.ts` — Mongoose singleton connection helper
4. One prompt per model (8 separate prompts): `models/User.ts`, `models/WasteListing.ts`, `models/Contract.ts`, `models/GreenCredit.ts`, `models/ReliabilityScore.ts`, `models/ImpactCertificate.ts`, `models/Dispute.ts`, `models/Notification.ts`

### Day 2 — Auth
1. `lib/auth.ts` — NextAuth config (Credentials provider, JWT, bcrypt password check against `User` model)
2. `app/api/auth/[...nextauth]/route.ts`
3. `app/api/auth/register/route.ts`
4. `app/(auth)/login/page.tsx`
5. `app/(auth)/register/page.tsx`
6. `middleware.ts` — role-based route protection

### Day 3 — Listings + AI grading
1. `lib/cloudinary.ts`
2. `lib/ai/gemini.ts` — client wrapper, function `analyzeWastePhoto(imageUrl, wasteType)` returning `{ grade, contaminationLevel, confidence }`
3. `app/api/listings/route.ts`
4. `app/api/listings/[id]/analyze/route.ts`
5. `components/listings/PhotoUploader.tsx`
6. `components/listings/ListingForm.tsx` (3-step form)
7. `app/listings/new/page.tsx`

### Day 4 — Matching + contracts
1. `lib/ai/claude.ts` — client wrapper, function `matchListingToStartups(listing, candidateStartups)` returning ranked list with reasoning
2. `app/api/match/route.ts`
3. `app/api/contracts/route.ts`
4. `components/contracts/ContractTimeline.tsx`
5. `app/contracts/[id]/page.tsx`

### Day 5 — OTP + scoring + credits
1. `lib/otp.ts`
2. `lib/mailer.ts`
3. `app/api/contracts/[id]/otp/generate/route.ts`
4. `app/api/contracts/[id]/otp/verify/route.ts`
5. `lib/reliabilityScore.ts` — the 12-factor algorithm (paste your existing formula spec into the prompt if you already have it designed)
6. `app/api/reliability/recalculate/route.ts`
7. `app/wallet/page.tsx`

### Day 6 — Certificates, map, leaderboard, WasteBot
1. `lib/wasteValueEstimator.ts`
2. `app/api/certificates/[contractId]/route.ts`
3. `app/certificates/[id]/page.tsx` (public, shareable)
4. `components/map/WasteMap.tsx` (React Leaflet + CartoDB dark tiles)
5. `app/api/leaderboard/route.ts` + `app/leaderboard/page.tsx`
6. `app/api/chatbot/route.ts` — inject live DB stats into Claude system prompt
7. `components/chat/ChatWindow.tsx`

### Day 7 — Forecasting, polish, deploy
1. `lib/ai/huggingface.ts` + `app/api/forecast/[wasteType]/route.ts`
2. `app/forecast/page.tsx` (Recharts)
3. UI polish pass: `app/dashboard/page.tsx`, `components/layout/Navbar.tsx`, empty states, loading skeletons
4. Seed script for demo data (temples/apartments/restaurants as suppliers, 3-4 realistic startups)
5. `vercel.json` + deploy + set env vars in Vercel dashboard + connect MongoDB Atlas network access to `0.0.0.0/0` (or Vercel's IP ranges) for production

## Example filled-in prompt (Day 1, User model)

```
CONTEXT: This is CIIRS, a Next.js 14 (App Router, TypeScript) B2B waste
marketplace. Stack: MongoDB Atlas + Mongoose, NextAuth.js (Credentials, JWT).

Schema needed:
_id, role: 'supplier' | 'startup' | 'admin', name, email, passwordHash,
organizationName, organizationType (temple/apartment/restaurant/factory/startup),
phone, address, location: { type: 'Point', coordinates: [lng, lat] },
reliabilityScoreId (ref ReliabilityScore), greenCreditBalance: Number, createdAt

FILE: models/User.ts

TASK: Create the Mongoose schema and model for User exactly as specified
above, with proper TypeScript interface + geospatial 2dsphere index on
location + unique index on email. Export both the Mongoose model and the
TS interface.

REQUIREMENTS:
- Complete file, no placeholders
- Handle the Next.js hot-reload model re-registration issue
  (mongoose.models.User || mongoose.model(...))
- Do not modify any other file
```