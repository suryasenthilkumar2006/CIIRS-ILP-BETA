import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Recycle,
  PlusCircle,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Dashboard | CIIRS",
  description: "User dashboard and operations portal for CIIRS marketplace.",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-black/95 p-4 sm:p-6 lg:p-8 text-zinc-100 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Welcome Card */}
        <Card className="border-zinc-800 bg-zinc-950/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/20">
                <Recycle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  CIIRS Dashboard
                </span>
                <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
                  Welcome back, {user.name || "Member"}
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-zinc-400">
              Logged in to your circular economy marketplace workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* User Profile Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <span className="text-xs font-medium text-zinc-400 block mb-1">
                  Account Role
                </span>
                <div className="flex items-center gap-2">
                  <span className="capitalize font-semibold text-zinc-100 text-base">
                    {user.role || "User"}
                  </span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 capitalize">
                    {user.role === "startup" ? "Buyer / Startup" : "Waste Generator"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <span className="text-xs font-medium text-zinc-400 block mb-1">
                  Organization
                </span>
                <span className="font-semibold text-zinc-100 text-base block truncate">
                  {user.organizationName || "Registered Organization"}
                </span>
                <span className="text-xs text-zinc-500 block truncate">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                asChild
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 font-medium py-2.5"
              >
                <Link href="/listings/new" className="flex items-center justify-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>List Waste Batch</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 py-2.5"
              >
                <Link href="/" className="flex items-center justify-center gap-2">
                  <span>Back to Home</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
