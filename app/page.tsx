import React from "react";
import Link from "next/link";
import {
  Recycle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  Leaf,
  CheckCircle2,
  Lock,
  Calendar,
  Building2,
  Factory,
  Eye,
  Award,
  BarChart3,
  MapPin,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-600 selection:text-white">
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/20">
              <Recycle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">CIIRS</span>
              <span className="ml-1.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                ILP BETA
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
            <Link href="/listings/new" className="hover:text-white transition-colors">
              List Waste
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Startup Portal
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
              <Link href="/login">Portal Login</Link>
            </Button>
            <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20">
              <Link href="/listings/new" className="flex items-center gap-1.5">
                <span>List Waste Batch</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[600px] rounded-full bg-gradient-to-tr from-blue-600/15 via-emerald-500/15 to-transparent blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 mb-6 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Driven B2B Circular Economy Supply Chain</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Transform Institutional Waste into Verified{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Raw Supply
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            CIIRS connects institutional waste generators (temples, apartments, restaurants & factories) with circular valorization startups using automated <strong>Gemini Vision quality inspection</strong>, <strong>Claude AI matchmaking</strong>, and <strong>OTP-verified custody handovers</strong>.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-600/25 px-8 font-semibold text-base">
              <Link href="/listings/new" className="flex items-center gap-2">
                <span>Create Waste Listing</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-zinc-800 bg-zinc-900/90 text-zinc-100 hover:bg-zinc-800 px-8 text-base">
              <Link href="/login" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-400" />
                <span>Enter Startup Portal</span>
              </Link>
            </Button>
          </div>

          {/* Live Status Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MongoDB Atlas Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Gemini 2.5 Vision Active</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Claude 3.5 Sonnet Matching Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE 6-STAGE VALUE STREAM WORKFLOW */}
      <section className="border-y border-zinc-800/80 bg-zinc-950/60 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              End-to-End Circular Architecture
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              From Waste Generation to Verified Impact
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              A cryptographically locked 6-stage lifecycle ensuring quality, logistical certainty, and verified green credits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                step: "01",
                title: "Listed",
                desc: "Supplier specifies volume, type & uploads batch photos.",
                icon: Layers,
                color: "text-zinc-300",
              },
              {
                step: "02",
                title: "AI Inspected",
                desc: "Gemini grades purity (A/B/C) & contamination level.",
                icon: Eye,
                color: "text-emerald-400",
              },
              {
                step: "03",
                title: "Matched",
                desc: "Claude engine ranks startups by domain fit & capacity.",
                icon: Cpu,
                color: "text-blue-400",
              },
              {
                step: "04",
                title: "Scheduled",
                desc: "Pickup slot locked between generator and startup.",
                icon: Calendar,
                color: "text-amber-400",
              },
              {
                step: "05",
                title: "OTP Verified",
                desc: "On-site custody handover verified via secret OTP.",
                icon: Lock,
                color: "text-indigo-400",
              },
              {
                step: "06",
                title: "Completed",
                desc: "Green credits awarded & CO₂ savings certificate issued.",
                icon: Award,
                color: "text-emerald-400",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono mb-3">
                    <span>STAGE {s.step}</span>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{s.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. PLATFORM QUICK ACCESS DIRECTORY */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Platform Action Portals
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Explore the active workflows, AI inspection, and verified contract management.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Listing Creation */}
            <Card className="border-zinc-800 bg-zinc-900/40 text-zinc-100 hover:border-emerald-500/40 transition-all duration-300 group">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 group-hover:scale-110 transition-transform">
                  <Factory className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-white">Waste Generator Flow</CardTitle>
                <CardDescription className="text-zinc-400">
                  Upload batch details, run Gemini Vision automated inspection, and publish to the circular marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-xs text-zinc-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>3-Step interactive form with coordinate picker</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Direct Cloudinary CDN upload streaming</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Instant Grade A / B / C quality feedback</span>
                  </li>
                </ul>
                <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700 mt-2">
                  <Link href="/listings/new" className="flex items-center justify-center gap-2">
                    <span>Launch Listing Creator</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Card 2: AI Matching & Contracts */}
            <Card className="border-zinc-800 bg-zinc-900/40 text-zinc-100 hover:border-blue-500/40 transition-all duration-300 group">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3 group-hover:scale-110 transition-transform">
                  <Cpu className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-white">AI Matching Engine</CardTitle>
                <CardDescription className="text-zinc-400">
                  Claude 3.5 Sonnet performs deep reasoning to rank startups by material domain compatibility, volume, and distance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-xs text-zinc-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>POST /api/match automated scoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>6-Step Contract Tracker with Framer Motion</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>Audit trail & activity log persistence</span>
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full border-zinc-700 bg-zinc-800/80 text-zinc-100 hover:bg-zinc-800 mt-2">
                  <Link href="/login" className="flex items-center justify-center gap-2">
                    <span>Access Startup Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Card 3: Verified Custody & Impact */}
            <Card className="border-zinc-800 bg-zinc-900/40 text-zinc-100 hover:border-teal-500/40 transition-all duration-300 group">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-white">Verified ESG & Custody</CardTitle>
                <CardDescription className="text-zinc-400">
                  Cryptographic OTP verification on physical handover with automated Green Credit issuance and carbon offset tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-xs text-zinc-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                    <span>Secret OTP handover verification protocol</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                    <span>Automated Green Credit wallet rewards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                    <span>12-factor reliability scoring calculation</span>
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full border-zinc-700 bg-zinc-800/80 text-zinc-100 hover:bg-zinc-800 mt-2">
                  <Link href="/login" className="flex items-center justify-center gap-2">
                    <span>Sign In to Verify Contracts</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. SUPPORTED CIRCULAR WASTE STREAMS */}
      <section className="border-t border-zinc-800/80 bg-zinc-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Material Supply Categories
            </h2>
            <p className="mt-1 text-2xl font-bold text-white">
              Targeted Industrial & Institutional Waste Streams
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: "Temple Flowers", use: "Incense & Dyes", tag: "Organic" },
              { name: "PET Plastics", use: "Polyester & Flakes", tag: "Polymer" },
              { name: "Kitchen Waste", use: "Biogas & Compost", tag: "Bio" },
              { name: "E-Waste", use: "Precious Metals", tag: "Electronic" },
              { name: "Textile Scraps", use: "Recycled Yarn", tag: "Fiber" },
              { name: "Industrial Scrap", use: "Foundry Feedstock", tag: "Metal" },
            ].map((w, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-left"
              >
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                  {w.tag}
                </span>
                <span className="text-sm font-bold text-zinc-100 block mt-0.5">
                  {w.name}
                </span>
                <span className="text-xs text-zinc-500 block mt-1">
                  → {w.use}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-10 text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-emerald-600 flex items-center justify-center text-white">
              <Recycle className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-zinc-300">CIIRS ILP Platform</span>
            <span>• Circular Industrial & Institutional Resource Recovery System</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/listings/new" className="hover:text-zinc-300 transition-colors">
              List Waste
            </Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Startup Portal
            </Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
