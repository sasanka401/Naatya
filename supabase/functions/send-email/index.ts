// Naatya — send-email Edge Function
// Sends real transactional emails (invite codes, OTP codes, alerts) via Resend.
//
// Deploy:  supabase functions deploy send-email
// Secrets: supabase secrets set RESEND_API_KEY=re_xxx
//          supabase secrets set EMAIL_FROM="Naatya <onboarding@resend.dev>"
//
// The frontend calls this with supabase.functions.invoke('send-email', { body: {...} })

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailPayload {
  to: string;
  subject: string;
  // Either pass raw html, or pass a known template + data and let the function build it.
  html?: string;
  template?: "invite" | "otp" | "alert";
  data?: Record<string, string>;
}

function buildTemplate(template: string, data: Record<string, string>): string {
  const wrap = (inner: string) => `
    <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f1115;color:#e5e7eb;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:24px;font-weight:700;letter-spacing:2px;color:#8b5cf6;">NAATYA</span>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Theatre Production Management</div>
      </div>
      ${inner}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1f2937;font-size:11px;color:#6b7280;text-align:center;">
        This is an automated message from Naatya. Please do not share your codes with anyone.
      </div>
    </div>`;

  if (template === "invite") {
    return wrap(`
      <p style="font-size:15px;line-height:1.6;">You have been invited to join a production's <strong>Script Room</strong> on Naatya.</p>
      <p style="font-size:14px;color:#9ca3af;">Use this one-time invite code to gain access:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;font-size:28px;font-weight:700;letter-spacing:6px;color:#fff;background:#1f2937;padding:16px 28px;border-radius:12px;border:1px solid #374151;">${data.code ?? ""}</span>
      </div>
      <p style="font-size:13px;color:#9ca3af;">Open Naatya, sign up or log in, then paste this code on the Script Room page. The code works once.</p>`);
  }

  if (template === "otp") {
    return wrap(`
      <p style="font-size:15px;line-height:1.6;">Here is your <strong>Script Room verification code</strong>.</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:#fff;background:#1f2937;padding:16px 28px;border-radius:12px;border:1px solid #374151;">${data.code ?? ""}</span>
      </div>
      <p style="font-size:13px;color:#9ca3af;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`);
  }

  // alert
  return wrap(`
    <p style="font-size:15px;line-height:1.6;color:#fca5a5;"><strong>Security Alert</strong></p>
    <p style="font-size:14px;line-height:1.6;">${data.body ?? "A security event was detected in your Script Room."}</p>`);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const EMAIL_FROM =
      Deno.env.get("EMAIL_FROM") ?? "Naatya <onboarding@resend.dev>";

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured on the server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = (await req.json()) as EmailPayload;
    if (!payload?.to || !payload?.subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html =
      payload.html ??
      (payload.template
        ? buildTemplate(payload.template, payload.data ?? {})
        : "<p>(no content)</p>");

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [payload.to],
        subject: payload.subject,
        html,
      }),
    });

    const result = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({ error: "Email send failed", details: result }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
