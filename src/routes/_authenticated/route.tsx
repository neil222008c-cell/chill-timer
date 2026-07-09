import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Film, History, BarChart3, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", replace: true });
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const nav_items = [
    { to: "/app", label: "Pick", icon: Film },
    { to: "/history", label: "History", icon: History },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/app" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary shadow-ember" />
            <span className="font-display text-lg">Dimlight</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav_items.map((n) => {
              const active = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); nav({ to: "/auth", replace: true }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="flex justify-around border-t border-border py-2 md:hidden">
          {nav_items.map((n) => (
            <Link key={n.to} to={n.to} className="flex flex-col items-center text-xs text-muted-foreground">
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
