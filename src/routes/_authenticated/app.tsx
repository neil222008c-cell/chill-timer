import { createFileRoute, useServerFn } from "@tanstack/react-start";
import { createFileRoute as _crf } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Zap, Moon, Coffee, Sparkles, Save } from "lucide-react";
import { pickMovie, saveRecommendation } from "@/lib/recommendations.functions";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = _crf("/_authenticated/app")({
  component: PickPage,
  head: () => ({ meta: [{ title: "Pick a film — Dimlight" }] }),
});

type Mood = "fast-paced" | "sleepy" | "exact-time" | "chill";
type Energy = "wired" | "medium" | "sleepy";

const moods: { id: Mood; label: string; icon: typeof Zap; desc: string }[] = [
  { id: "exact-time", label: "I have exactly…", icon: Clock, desc: "Pin a runtime" },
  { id: "fast-paced", label: "Keep me awake", icon: Zap, desc: "Fast-paced" },
  { id: "sleepy", label: "Fall asleep to", icon: Moon, desc: "Ambient, quiet" },
  { id: "chill", label: "Just cozy", icon: Coffee, desc: "Low-stakes" },
];

function PickPage() {
  const [mood, setMood] = useState<Mood>("exact-time");
  const [minutes, setMinutes] = useState(90);
  const [energy, setEnergy] = useState<Energy>("medium");
  const [pick, setPick] = useState<Awaited<ReturnType<typeof pickMovie>> | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const qc = useQueryClient();

  const pickFn = useServerFn(pickMovie);
  const saveFn = useServerFn(saveRecommendation);

  const pickMut = useMutation({
    mutationFn: () =>
      pickFn({
        data: {
          mood,
          timeAvailable: mood === "exact-time" ? minutes : minutes,
          energy,
          exclude: excluded,
        },
      }),
    onSuccess: (data) => {
      setPick(data);
      setExcluded((prev) => [...prev, data.title]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      if (!pick) throw new Error("No pick");
      return saveFn({
        data: {
          title: pick.title,
          year: pick.year,
          runtime_minutes: pick.runtime_minutes,
          genre: pick.genre,
          why_it_fits: pick.why_it_fits,
          mood,
          time_available: minutes,
          energy,
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved to your history.");
      qc.invalidateQueries({ queryKey: ["recs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      {/* Filter panel */}
      <section>
        <h1 className="font-display text-4xl">What are you in the mood for?</h1>
        <p className="mt-2 text-muted-foreground">Tell us how much time you have and how awake you feel.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {moods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                mood === m.id
                  ? "border-primary bg-primary/10 shadow-ember"
                  : "border-border bg-card/60 hover:border-primary/40"
              }`}
            >
              <m.icon className={`h-5 w-5 ${mood === m.id ? "text-primary" : "text-muted-foreground"}`} />
              <div className="mt-3 font-medium">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card/60 p-5">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium">Time available</label>
            <span className="font-display text-2xl text-primary">{minutes} min</span>
          </div>
          <Slider
            value={[minutes]}
            min={30}
            max={240}
            step={5}
            onValueChange={(v) => setMinutes(v[0])}
            className="mt-4"
          />
          <div className="mt-4 flex gap-2">
            {(["wired", "medium", "sleepy"] as Energy[]).map((e) => (
              <button
                key={e}
                onClick={() => setEnergy(e)}
                className={`flex-1 rounded-md border px-3 py-2 text-xs capitalize transition ${
                  energy === e ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => pickMut.mutate()}
          disabled={pickMut.isPending}
          size="lg"
          className="mt-6 w-full shadow-ember"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {pickMut.isPending ? "Dimming the lights…" : pick ? "Show me another" : "Find my film"}
        </Button>
      </section>

      {/* Result panel */}
      <section className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {pick ? (
            <motion.div
              key={pick.title}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-border bg-card/70 p-8 shadow-ember backdrop-blur"
            >
              <div className="text-xs uppercase tracking-widest text-primary">Tonight's pick</div>
              <h2 className="mt-2 font-display text-4xl leading-tight">{pick.title}</h2>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{pick.year}</span>
                <span>·</span>
                <span>{pick.runtime_minutes} min</span>
                <span>·</span>
                <span className="capitalize">{pick.genre}</span>
              </div>
              <p className="mt-6 leading-relaxed text-foreground/90">{pick.why_it_fits}</p>
              <div className="mt-8 flex gap-3">
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} variant="secondary">
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button onClick={() => pickMut.mutate()} disabled={pickMut.isPending} variant="outline">
                  Not it — try another
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground"
            >
              <div>
                <div className="mx-auto h-12 w-12 rounded-full border border-border bg-card/50" />
                <p className="mt-4">Your pick will appear here.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
