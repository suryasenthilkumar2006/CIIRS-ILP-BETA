"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Info,
  SlidersHorizontal,
} from "lucide-react";

interface WeeklyForecast {
  week: string;
  predictedKg: number;
}

interface HistoricalDataPoint {
  date: string;
  quantityKg: number;
}

interface ForecastApiResponse {
  wasteType?: string;
  forecast: WeeklyForecast[];
  historicalData?: HistoricalDataPoint[];
  trend: "increasing" | "stable" | "decreasing";
  confidence: number;
  message?: string;
  error?: string;
}

const WASTE_CATEGORIES = [
  { value: "organic", label: "Organic (Food & Temple Waste)", color: "#10b981" },
  { value: "plastic", label: "Plastic (PET, HDPE & Polymers)", color: "#3b82f6" },
  { value: "textile", label: "Textile (Fabric Scraps & Cotton)", color: "#a855f7" },
  { value: "e-waste", label: "E-Waste (Electronics & PCBs)", color: "#f59e0b" },
  { value: "metal", label: "Metal (Aluminium, Steel & Copper)", color: "#06b6d4" },
  { value: "paper", label: "Paper & Cardboard", color: "#84cc16" },
  { value: "rubber", label: "Rubber & Industrial Scrap", color: "#ec4899" },
  { value: "glass", label: "Glass & Cullet", color: "#14b8a6" },
];

function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
          <Calendar className="h-3.5 w-3.5 text-emerald-400" />
          <span>{label}</span>
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-base font-bold text-emerald-400">
            {Number(data.predictedKg).toLocaleString()} kg
          </p>
          <p className="text-[11px] text-zinc-400">
            Projected supply volume for this week
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export default function ForecastPage() {
  const [wasteType, setWasteType] = useState<string>("organic");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ForecastApiResponse | null>(null);

  const fetchForecast = async (type: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/forecast/${encodeURIComponent(type)}`);
      const json: ForecastApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch supply forecast.");
      }

      setData(json);
    } catch (err: any) {
      console.error("Error fetching forecast:", err);
      setError(err.message || "Failed to load supply forecasting data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(wasteType);
  }, [wasteType]);

  const activeCategory = useMemo(() => {
    return (
      WASTE_CATEGORIES.find((c) => c.value === wasteType) || {
        value: wasteType,
        label: wasteType,
        color: "#10b981",
      }
    );
  }, [wasteType]);

  // Calculations for summary metrics
  const hasForecast = Boolean(data && data.forecast && data.forecast.length > 0);

  const totalProjectedKg = useMemo(() => {
    if (!hasForecast || !data?.forecast) return 0;
    return data.forecast.reduce((acc, curr) => acc + (curr.predictedKg || 0), 0);
  }, [hasForecast, data]);

  const avgWeeklyKg = useMemo(() => {
    if (!hasForecast || !data?.forecast || data.forecast.length === 0) return 0;
    return Math.round(totalProjectedKg / data.forecast.length);
  }, [hasForecast, data, totalProjectedKg]);

  const peakWeek = useMemo(() => {
    if (!hasForecast || !data?.forecast || data.forecast.length === 0) return null;
    return [...data.forecast].sort((a, b) => b.predictedKg - a.predictedKg)[0];
  }, [hasForecast, data]);

  const confidencePct = useMemo(() => {
    if (!data || typeof data.confidence !== "number") return 0;
    return Math.round(Math.min(1, Math.max(0, data.confidence)) * 100);
  }, [data]);

  const trendConfig = useMemo(() => {
    const trend = data?.trend || "stable";
    switch (trend) {
      case "increasing":
        return {
          label: "Increasing Supply",
          sublabel: "Upward Growth Trajectory",
          badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: TrendingUp,
          directionIcon: ArrowUpRight,
          accentColor: "text-emerald-400",
          desc: "Listing volumes are accelerating across connected suppliers.",
        };
      case "decreasing":
        return {
          label: "Decreasing Supply",
          sublabel: "Downward Contraction Trajectory",
          badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          icon: TrendingDown,
          directionIcon: ArrowDownRight,
          accentColor: "text-rose-400",
          desc: "Listing volumes are tightening. Consider securing forward contracts.",
        };
      case "stable":
      default:
        return {
          label: "Stable Supply",
          sublabel: "Steady Linear Velocity",
          badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: Minus,
          directionIcon: SlidersHorizontal,
          accentColor: "text-blue-400",
          desc: "Listing volumes remain consistent with historical patterns.",
        };
    }
  }, [data?.trend]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Hugging Face AI Time-Series Engine
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Supply Forecasting
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Project future raw material supply volumes over the next 4 weeks based on historical listing trends to plan procurement cycles.
            </p>
          </div>

          {/* Waste Type Selector Controls */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="w-64">
              <Select
                value={wasteType}
                onValueChange={(val) => setWasteType(val)}
                disabled={loading}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800/80 focus:ring-emerald-500">
                  <SelectValue placeholder="Select waste category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {WASTE_CATEGORIES.map((cat) => (
                    <SelectItem
                      key={cat.value}
                      value={cat.value}
                      className="focus:bg-zinc-800 focus:text-white cursor-pointer"
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchForecast(wasteType)}
              disabled={loading}
              className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              title="Refresh Forecast"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <Sparkles className="h-5 w-5 text-emerald-400 absolute" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-zinc-200">
                Running Hugging Face Time-Series Forecast...
              </p>
              <p className="text-xs text-zinc-500">
                Analyzing historical listing volumes for {activeCategory.label}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card className="border-rose-900/50 bg-rose-950/20 backdrop-blur-sm">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <h3 className="font-semibold text-rose-200">Forecasting Query Failed</h3>
                <p className="text-xs text-rose-300/80">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchForecast(wasteType)}
                className="border-rose-800 text-rose-200 hover:bg-rose-900/50 hover:text-white shrink-0"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Insufficient Data State */}
        {!loading && !error && (!hasForecast || (data && data.forecast.length === 0)) && (
          <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center text-center p-12 space-y-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-bold text-zinc-100">
                  Insufficient Data for {activeCategory.label}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {data?.message ||
                    `At least 3 weeks of historical supply listings are required to run time-series projection. As more suppliers list ${activeCategory.label.toLowerCase()} on CIIRS, predictive forecasting will unlock automatically.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2.5 py-1 text-zinc-300 border border-zinc-700">
                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                  Minimum 3 weeks required
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2.5 py-1 text-zinc-300 border border-zinc-700">
                  Found: {data?.historicalData?.length || 0} recorded weeks
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Forecast Dashboard View */}
        {!loading && !error && hasForecast && data && (
          <div className="space-y-6">
            {/* Top KPI Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Trend Card */}
              <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">Projected Trend</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${trendConfig.badgeBg}`}
                    >
                      <trendConfig.icon className="h-3.5 w-3.5" />
                      {trendConfig.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold tracking-tight capitalize ${trendConfig.accentColor}`}>
                      {data.trend}
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-tight">
                    {trendConfig.desc}
                  </p>
                </CardContent>
              </Card>

              {/* Confidence Card */}
              <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">Model Confidence</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {confidencePct}%
                    </p>
                    <span className="text-xs text-zinc-400 font-medium">
                      {confidencePct >= 80
                        ? "High accuracy"
                        : confidencePct >= 60
                        ? "Moderate accuracy"
                        : "Low sample size"}
                    </span>
                  </div>
                  {/* Visual Confidence Bar */}
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Total 4-Week Volume */}
              <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">4-Week Supply Pool</span>
                    <Package className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {totalProjectedKg.toLocaleString()}{" "}
                      <span className="text-sm font-normal text-zinc-400">kg</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Avg ~{avgWeeklyKg.toLocaleString()} kg projected per week
                  </p>
                </CardContent>
              </Card>

              {/* Peak Week Card */}
              <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">Peak Supply Volume</span>
                    <Layers className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {peakWeek?.week || "Week 1"}
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Highest expected volume: {peakWeek?.predictedKg.toLocaleString()} kg
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Interactive Recharts Forecast Chart */}
            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                    Predicted Weekly Supply Curve
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400 mt-0.5">
                    Projected {activeCategory.label.toLowerCase()} supply volume (in kilograms) over the next 4 consecutive weeks
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    AI Projected Output
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.forecast}
                      margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="forecastAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="week"
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#3f3f46" }}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val} kg`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="predictedKg"
                        name="Predicted Supply"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#forecastAreaGradient)"
                        activeDot={{
                          r: 6,
                          fill: "#10b981",
                          stroke: "#064e3b",
                          strokeWidth: 3,
                        }}
                        dot={{
                          r: 4,
                          fill: "#10b981",
                          stroke: "#18181b",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed 4-Week Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.forecast.map((item, idx) => {
                const prevKg = idx > 0 ? data.forecast[idx - 1].predictedKg : null;
                const diffPct =
                  prevKg !== null && prevKg > 0
                    ? Math.round(((item.predictedKg - prevKg) / prevKg) * 100)
                    : null;
                const shareOfTotal =
                  totalProjectedKg > 0
                    ? Math.round((item.predictedKg / totalProjectedKg) * 100)
                    : 25;

                return (
                  <Card key={item.week} className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">{item.week}</span>
                        {diffPct !== null ? (
                          <span
                            className={`text-[11px] font-medium inline-flex items-center ${
                              diffPct >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {diffPct >= 0 ? `+${diffPct}%` : `${diffPct}%`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Base projection</span>
                        )}
                      </div>
                      <p className="text-xl font-bold text-white">
                        {item.predictedKg.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">kg</span>
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800">
                        <span>Share of 4-week total</span>
                        <span className="font-semibold text-zinc-300">{shareOfTotal}%</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
