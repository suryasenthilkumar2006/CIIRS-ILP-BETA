"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Recycle,
  LayoutDashboard,
  Layers,
  Handshake,
  Map,
  Coins,
  Trophy,
  TrendingUp,
  ShieldCheck,
  Bell,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Building2,
  Factory,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/layout/NotificationBell";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Hide Navbar completely on auth pages (login and register)
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }

  const user = session?.user as any;
  const isStartup = user?.role === "startup";
  const isAdmin = user?.role === "admin";
  const isSupplier = user?.role === "supplier" || (!isStartup && !isAdmin && Boolean(user));

  // Compute user initials for avatar
  const initials = (user?.organizationName || user?.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Navigation items config
  const navLinks = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
      show: Boolean(session),
    },
    {
      name: isStartup ? "Material Supply" : "My Listings",
      href: "/listings",
      icon: Layers,
      active: pathname.startsWith("/listings") && pathname !== "/listings/new",
      show: Boolean(session),
    },
    {
      name: "Contracts",
      href: "/contracts",
      icon: Handshake,
      active: pathname.startsWith("/contracts"),
      show: Boolean(session),
    },
    {
      name: "Resource Map",
      href: "/map",
      icon: Map,
      active: pathname === "/map",
      show: Boolean(session),
    },
    {
      name: "Green Wallet",
      href: "/wallet",
      icon: Coins,
      active: pathname === "/wallet",
      show: Boolean(session),
    },
    {
      name: "Leaderboard",
      href: "/leaderboard",
      icon: Trophy,
      active: pathname === "/leaderboard",
      show: Boolean(session),
    },
    {
      name: "Supply Forecast",
      href: "/forecast",
      icon: TrendingUp,
      active: pathname === "/forecast",
      show: Boolean(session) && isStartup,
    },
    {
      name: "Reliability",
      href: "/reliability",
      icon: ShieldCheck,
      active: pathname === "/reliability",
      show: Boolean(session),
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Brand Logo & Persona Badge */}
        <div className="flex items-center gap-3">
          <Link
            href={session ? "/dashboard" : "/login"}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Recycle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-white">CIIRS</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  B2B
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 hidden sm:block">
                Circular Resource Network
              </p>
            </div>
          </Link>

          {/* Active Persona Tag in Header (Desktop) */}
          {session && (
            <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-zinc-800">
              {isStartup ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">
                  <Building2 className="h-3 w-3" />
                  Startup Mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <Factory className="h-3 w-3" />
                  Supplier Mode
                </span>
              )}
            </div>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-medium text-zinc-300">
          {session ? (
            navLinks
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                      link.active
                        ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                        : "hover:bg-zinc-900 hover:text-white text-zinc-300"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${link.active ? "text-emerald-400" : "text-zinc-400"}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })
          ) : (
            <div className="flex items-center gap-4 text-xs">
              <Link href="/login" className="text-zinc-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </nav>

        {/* Right Header Area: Notifications & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {status === "loading" ? (
            <div className="h-9 w-28 animate-pulse rounded-xl bg-zinc-900 border border-zinc-800" />
          ) : session ? (
            <>
              {/* Quick Action: List Waste (for suppliers) */}
              {isSupplier && (
                <Button
                  asChild
                  size="sm"
                  className="hidden sm:inline-flex bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 text-xs font-semibold h-8"
                >
                  <Link href="/listings/new" className="flex items-center gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>List Waste</span>
                  </Link>
                </Button>
              )}

              {/* Notification Bell Component */}
              <NotificationBell />

              {/* User Menu Profile Card */}
              <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 shadow-sm">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white shadow-inner ${
                    isStartup
                      ? "bg-gradient-to-tr from-blue-600 to-cyan-500"
                      : "bg-gradient-to-tr from-emerald-600 to-teal-500"
                  }`}
                >
                  {initials}
                </div>

                <div className="flex flex-col text-left">
                  <span className="font-semibold text-xs text-white max-w-[120px] truncate leading-tight">
                    {user?.organizationName || user?.name || "User"}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wide border ${
                        isStartup
                          ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      }`}
                    >
                      {isStartup ? "Startup" : "Supplier"}
                    </span>
                    {user?.greenCreditBalance !== undefined && (
                      <span className="text-[10px] font-mono text-emerald-400 font-medium">
                        {user.greenCreditBalance} GC
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign Out"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 text-xs"
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 text-xs font-semibold"
              >
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          {session && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex lg:hidden h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {session && mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-800/80 bg-zinc-950/98 px-4 py-4 space-y-3 backdrop-blur-2xl">
          {/* Mobile User Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white ${
                  isStartup
                    ? "bg-gradient-to-tr from-blue-600 to-cyan-500"
                    : "bg-gradient-to-tr from-emerald-600 to-teal-500"
                }`}
              >
                {initials}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {user?.organizationName || user?.name}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {isStartup ? "Startup Procurement" : "Waste Supplier"} • {user?.greenCreditBalance ?? 0} GC
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="border-zinc-800 text-rose-400 hover:bg-rose-950/30 text-xs h-7 px-2"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Sign Out
            </Button>
          </div>

          {/* Mobile Nav Links */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {navLinks
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      link.active
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold"
                        : "bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${link.active ? "text-emerald-400" : "text-zinc-400"}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
          </div>

          {isSupplier && (
            <div className="pt-2">
              <Button
                asChild
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold h-9"
              >
                <Link href="/listings/new" onClick={() => setMobileMenuOpen(false)}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  <span>List New Waste Batch</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
