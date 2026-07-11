import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type EmailPickInput = {
  title: string;
  year: number;
  runtime_minutes: number;
  genre: string;
  why_it_fits: string;
  poster_url?: string | null;
};

export const emailPick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EmailPickInput) => input)
  .handler(async ({ data, context }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    if (!lovableKey || !resendKey) throw new Error("Email service is not configured.");

    const to = context.claims?.email as string | undefined;
    if (!to) throw new Error("No email on your account.");

    const poster = data.poster_url
      ? `<img src="${data.poster_url}" alt="Poster for ${data.title}" style="max-width:220px;border-radius:12px;margin:16px 0;" />`
      : "";

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f0d0b;color:#f5efe6;padding:32px;border-radius:16px;max-width:560px;margin:auto;">
        <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#e0a267;">Tonight's pick from Dimlight</div>
        <h1 style="font-size:28px;margin:12px 0 4px;">${data.title}</h1>
        <div style="color:#b6a99a;font-size:14px;">${data.year} · ${data.runtime_minutes} min · ${data.genre}</div>
        ${poster}
        <p style="line-height:1.6;color:#eadfd0;">${data.why_it_fits}</p>
        <p style="color:#8a8172;font-size:12px;margin-top:24px;">Sent by Dimlight · your cozy movie picker</p>
      </div>
    `;

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: "Dimlight <onboarding@resend.dev>",
        to: [to],
        subject: `Tonight's pick: ${data.title}`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend failed [${res.status}]: ${body}`);
      throw new Error(`Failed to send email [${res.status}]`);
    }

    return { sent: true, to };
  });
