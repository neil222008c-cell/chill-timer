import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listRecommendations } from "@/lib/recommendations.functions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics — Dimlight" }] }),
});

const CHART_COLORS = ["oklch(0.78 0.13 70)", "oklch(0.55 0.19 40)", "oklch(0.65 0.10 55)", "oklch(0.85 0.08 80)"];

function AnalyticsPage() {
  const listFn = useServerFn(listRecommendations);
  const { data, isLoading } = useQuery({ queryKey: ["recs"], queryFn: () => listFn() });

  const stats = useMemo(() => {
    if (!data?.length) return null;
    const total = data.length;
    const watched = data.filter((d) => d.watched).length;
    const avgRuntime = Math.round(data.reduce((s, d) => s + (d.runtime_minutes ?? 0), 0) / total);
    const rated = data.filter((d) => d.rating);
    const avgRating = rated.length ? (rated.reduce((s, d) => s + (d.rating ?? 0), 0) / rated.length).toFixed(1) : "—";

    const byMood = Object.entries(
      data.reduce<Record<string, number>>((acc, d) => {
        acc[d.mood] = (acc[d.mood] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([mood, count]) => ({ mood, count }));

    const byGenre = Object.entries(
      data.reduce<Record<string, number>>((acc, d) => {
        const g = d.genre ?? "unknown";
        acc[g] = (acc[g] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // last 14 days activity
    const now = new Date();
    const days: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = data.filter((r) => r.created_at.slice(0, 10) === key).length;
      days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count });
    }

    return { total, watched, avgRuntime, avgRating, byMood, byGenre, days };
  }, [data]);

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!stats)
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
        Save a few picks first — analytics will appear here.
      </div>
    );

  return (
    <div>
      <h1 className="font-display text-4xl">Your patterns</h1>
      <p className="mt-2 text-muted-foreground">Because knowing what you actually watch is useful.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Total picks" value={stats.total} />
        <Stat label="Watched" value={`${stats.watched}/${stats.total}`} />
        <Stat label="Avg runtime" value={`${stats.avgRuntime} min`} />
        <Stat label="Avg rating" value={stats.avgRating} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Picks by mood">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byMood}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 45)" />
              <XAxis dataKey="mood" stroke="oklch(0.72 0.03 70)" fontSize={12} />
              <YAxis stroke="oklch(0.72 0.03 70)" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.20 0.020 45)",
                  border: "1px solid oklch(0.28 0.02 45)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="count" fill="oklch(0.78 0.13 70)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Genre mix">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.byGenre} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                {stats.byGenre.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "oklch(0.20 0.020 45)",
                  border: "1px solid oklch(0.28 0.02 45)",
                  borderRadius: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Last 14 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.days}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 45)" />
              <XAxis dataKey="day" stroke="oklch(0.72 0.03 70)" fontSize={11} />
              <YAxis stroke="oklch(0.72 0.03 70)" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.20 0.020 45)",
                  border: "1px solid oklch(0.28 0.02 45)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="count" fill="oklch(0.55 0.19 40)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl text-primary">{value}</div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card/60 p-5 ${className}`}>
      <h3 className="mb-4 font-display text-lg">{title}</h3>
      {children}
    </div>
  );
}
