import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, Zap, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen overflow-hidden bg-ember-radial">
      {/* subtle grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:4px_4px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary shadow-ember" />
          <span className="font-display text-xl tracking-tight">Dimlight</span>
        </div>
        <nav className="flex items-center gap-3">
          {user ? (
            <Button asChild variant="secondary">
              <Link to="/app">Open app</Link>
            </Button>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Button asChild>
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            AI-picked, mood-matched
          </div>
          <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
            It's late.
            <br />
            <span className="text-primary">Pick something</span> that fits.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            A tiny recommender that respects your runtime and your eyelids. Tell it how much time
            you have and how awake you feel — it does the scrolling for you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-ember">
              <Link to={user ? "/app" : "/auth"}>Find me something →</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">How it works</a>
            </Button>
          </div>
        </motion.div>

        <section id="how" className="mt-28 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Clock,
              title: "Exactly 90 minutes",
              body: "Give it a hard runtime cap. It picks a film that ends when your window closes.",
            },
            {
              icon: Zap,
              title: "Keep me awake",
              body: "Kinetic, fast-cut, high-energy picks — no slow-burn character studies here.",
            },
            {
              icon: Moon,
              title: "Fall asleep to it",
              body: "Ambient, low-stakes, familiar. Something that lets your brain finally clock out.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur transition hover:border-primary/50 hover:shadow-ember"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-28 rounded-3xl border border-border bg-card/60 p-8 backdrop-blur md:p-12">
          <h2 className="font-display text-3xl md:text-4xl">Built for the 10:30 PM decision.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Save every pick to your history, rate them, and track your patterns in a cozy little
            analytics dashboard. Because knowing you fall asleep to dramas 70% of the time is a
            useful thing to admit.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to={user ? "/app" : "/auth"}>Start browsing less</Link>
          </Button>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        Made with dim lighting · Dimlight © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
