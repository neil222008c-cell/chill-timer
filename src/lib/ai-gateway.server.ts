// Server-only Lovable AI Gateway helper (OpenAI-compatible chat completions).
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callAI<T = unknown>(opts: {
  messages: ChatMessage[];
  model?: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}): Promise<T | string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-3-flash-preview",
    messages: opts.messages,
  };
  if (opts.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: opts.jsonSchema.name, schema: opts.jsonSchema.schema, strict: false },
    };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up in workspace billing.");
    throw new Error(`AI gateway ${res.status}: ${text}`);
  }

  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  if (opts.jsonSchema) {
    try {
      return JSON.parse(content) as T;
    } catch {
      // fallback: try to extract JSON block
      const m = content.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]) as T;
      throw new Error("AI returned non-JSON output");
    }
  }
  return content;
}
