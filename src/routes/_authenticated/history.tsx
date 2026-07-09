import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listRecommendations, updateRecommendation, deleteRecommendation } from "@/lib/recommendations.functions";
import { Button } from "@/components/ui/button";
import { Star, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "History — Dimlight" }] }),
});

function HistoryPage() {
  const listFn = useServerFn(listRecommendations);
  const updateFn = useServerFn(updateRecommendation);
  const deleteFn = useServerFn(deleteRecommendation);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["recs"],
    queryFn: () => listFn(),
  });

  const upd = useMutation({
    mutationFn: (v: { id: string; watched?: boolean; rating?: number | null }) => updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recs"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed.");
      qc.invalidateQueries({ queryKey: ["recs"] });
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Loading history…</div>;

  if (!data?.length)
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
        No saved picks yet. Head to <span className="text-primary">AI search</span> to find one.
      </div>
    );

  return (
    <div>
      <h1 className="font-display text-4xl">Your history</h1>
      <p className="mt-2 text-muted-foreground">{data.length} saved {data.length === 1 ? "pick" : "picks"}.</p>

      <div className="mt-8 space-y-3">
        {data.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-5 md:flex-row md:items-center"
          >
            {r.poster_url ? (
              <img
                src={r.poster_url}
                alt={`Poster for ${r.title}`}
                className="h-24 w-16 flex-shrink-0 rounded-md object-cover shadow-md"
                loading="lazy"
              />
            ) : (
              <div className="h-24 w-16 flex-shrink-0 rounded-md border border-border bg-muted/30" />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-display text-xl">{r.title}</h3>
                <span className="text-sm text-muted-foreground">
                  {r.year} · {r.runtime_minutes}m · {r.genre}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {r.mood} · {r.energy ?? "—"} · {formatDistanceToNow(new Date(r.created_at))} ago
              </div>
              {r.why_it_fits && <p className="mt-2 text-sm text-foreground/80">{r.why_it_fits}</p>}
            </div>

            <div className="flex items-center gap-2">
              {/* rating */}
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => upd.mutate({ id: r.id, rating: n })}>
                    <Star
                      className={`h-4 w-4 ${
                        (r.rating ?? 0) >= n ? "fill-primary text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant={r.watched ? "default" : "outline"}
                onClick={() => upd.mutate({ id: r.id, watched: !r.watched })}
              >
                <Check className="mr-1 h-3 w-3" />
                {r.watched ? "Watched" : "Mark watched"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
