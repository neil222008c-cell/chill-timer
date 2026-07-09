import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI } from "./ai-gateway.server";

const MoodEnum = z.enum(["fast-paced", "sleepy", "exact-time", "chill"]);
const EnergyEnum = z.enum(["wired", "medium", "sleepy"]);

// --- AI-powered pick ---
const PickInput = z.object({
  mood: MoodEnum,
  timeAvailable: z.number().int().min(15).max(360).optional(),
  energy: EnergyEnum.optional(),
  exclude: z.array(z.string()).optional(),
});

interface Pick {
  title: string;
  year: number;
  runtime_minutes: number;
  genre: string;
  why_it_fits: string;
  poster_url: string | null;
}

// Fetch a poster from iTunes Search API (no key needed, CORS-friendly).
async function fetchPoster(title: string, year?: number): Promise<string | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=movie&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: Array<{ artworkUrl100?: string; releaseDate?: string }> };
    const results = json.results ?? [];
    let best = results[0];
    if (year) {
      const match = results.find((r) => r.releaseDate?.startsWith(String(year)));
      if (match) best = match;
    }
    if (!best?.artworkUrl100) return null;
    // Upscale from 100x100 → 600x600
    return best.artworkUrl100.replace(/\/\d+x\d+bb\.jpg$/, "/600x600bb.jpg");
  } catch {
    return null;
  }
}

export const pickMovie = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => PickInput.parse(raw))
  .handler(async ({ data }) => {
    const moodDescription: Record<z.infer<typeof MoodEnum>, string> = {
      "fast-paced": "high-energy, kinetic, keeps you wide awake — action, thriller, propulsive comedy",
      sleepy: "slow, hypnotic, ambient — a soft-lit background film you can drift off to",
      "exact-time": `must fit almost exactly in ${data.timeAvailable ?? 90} minutes (±10 min runtime)`,
      chill: "warm, low-stakes, cozy — feel-good, gentle pacing, no heavy stress",
    };

    const excludeStr = data.exclude?.length
      ? `Do NOT suggest any of: ${data.exclude.join(", ")}.`
      : "";

    const result = await callAI<Omit<Pick, "poster_url">>({
      messages: [
        {
          role: "system",
          content:
            "You are a thoughtful, non-obvious movie curator. Pick ONE real, well-known film that matches the user's physical state and available time. Prefer variety — avoid the top 20 most obvious blockbusters. Return strict JSON.",
        },
        {
          role: "user",
          content: `Mood: ${data.mood} — ${moodDescription[data.mood]}.
Energy level: ${data.energy ?? "unspecified"}.
Time available: ${data.timeAvailable ?? "flexible"} minutes.
${excludeStr}
Return one movie.`,
        },
      ],
      jsonSchema: {
        name: "movie_pick",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            year: { type: "integer" },
            runtime_minutes: { type: "integer" },
            genre: { type: "string" },
            why_it_fits: { type: "string" },
          },
          required: ["title", "year", "runtime_minutes", "genre", "why_it_fits"],
          additionalProperties: false,
        },
      },
    });

    const pick = result as Omit<Pick, "poster_url">;
    const poster_url = await fetchPoster(pick.title, pick.year);
    return { ...pick, poster_url } satisfies Pick;
  });

// --- Save (CRUD Create) ---
const SaveInput = z.object({
  title: z.string().min(1),
  year: z.number().int().nullable().optional(),
  runtime_minutes: z.number().int().nullable().optional(),
  genre: z.string().nullable().optional(),
  why_it_fits: z.string().nullable().optional(),
  poster_url: z.string().nullable().optional(),
  mood: MoodEnum,
  time_available: z.number().int().nullable().optional(),
  energy: EnergyEnum.nullable().optional(),
});

export const saveRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SaveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("recommendations")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// --- List (Read) ---
export const listRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("recommendations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// --- Update ---
const UpdateInput = z.object({
  id: z.string().uuid(),
  watched: z.boolean().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});
export const updateRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("recommendations")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// --- Delete ---
export const deleteRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("recommendations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
