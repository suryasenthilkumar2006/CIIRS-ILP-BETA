"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Factory,
  Building2,
  Recycle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "startup" ? "startup" : "supplier";

  const [activeRole, setActiveRole] = useState<"supplier" | "startup">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "startup" || roleParam === "supplier") {
      setActiveRole(roleParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all required fields.");
      return;
    }

    setIsLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email: email.trim().toLowerCase(),
      password,
    });

    if (res?.error) {
      setError(res.error || "Invalid email or password.");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black/95 p-4 py-12">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-4">
          {/* Brand Logo */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/20">
            <Recycle className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
              CIIRS Portal Sign In
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Circular Industrial &amp; Institutional Resource System
            </CardDescription>
          </div>

          {/* Supplier vs Startup Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveRole("supplier")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeRole === "supplier"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Factory className="h-3.5 w-3.5" />
              <span>Supplier Login</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRole("startup")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeRole === "startup"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Startup Login</span>
            </button>
          </div>

          {/* Persona Clarification Banner */}
          <div
            className={`rounded-lg border px-3 py-2 text-left text-xs ${
              activeRole === "supplier"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span>
                {activeRole === "supplier"
                  ? "🏭 Waste Generator & Supplier"
                  : "🚀 Circular Valorization Startup"}
              </span>
              <span className="text-[10px] uppercase tracking-wider rounded bg-zinc-900/80 px-1.5 py-0.5 border border-zinc-700">
                {activeRole} mode
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {activeRole === "supplier"
                ? "Temples, bulk generators, restaurants, societies, & factories listing waste batches."
                : "Recyclers, innovators, & buyers procuring raw waste streams for circular production."}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wider text-zinc-300"
              >
                {activeRole === "supplier" ? "Supplier Email" : "Startup Email"}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={
                  activeRole === "supplier"
                    ? "admin@meenakshitemple.org"
                    : "procurement@ecoplastlabs.com"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wider text-zinc-300"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium text-red-400 text-center rounded-lg bg-red-500/10 border border-red-500/20 p-2.5">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className={`w-full text-white font-semibold shadow-md transition-all ${
                activeRole === "supplier"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Sign In to {activeRole === "supplier" ? "Supplier" : "Startup"} Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2 border-t border-zinc-800/80">
          <div className="text-center text-xs text-zinc-400">
            Don&apos;t have a CIIRS account?{" "}
            <Link
              href="/register"
              className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
            >
              Register your organization
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

