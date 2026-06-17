import { supabase } from './supabase';

// Sends a real email through the Supabase `send-email` Edge Function (Resend).
//
// It never throws: if email isn't configured yet (e.g. you haven't deployed the
// function or set RESEND_API_KEY), it logs a warning and returns false so the
// app keeps working. Callers can still show the code on-screen as a fallback.

interface SendEmailArgs {
  to: string;
  subject: string;
  template?: 'invite' | 'otp' | 'alert';
  data?: Record<string, string>;
  html?: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: args,
    });

    if (error) {
      console.warn('[email] send failed:', error.message);
      return false;
    }
    if (data && (data as { error?: string }).error) {
      console.warn('[email] send returned error:', (data as { error?: string }).error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[email] send threw:', err);
    return false;
  }
}

// Convenience wrappers for the two flows your app uses most.

export function sendInviteEmail(to: string, code: string) {
  return sendEmail({
    to,
    subject: 'Your Naatya Script Room invite code',
    template: 'invite',
    data: { code },
  });
}

export function sendOtpEmail(to: string, code: string) {
  return sendEmail({
    to,
    subject: 'Your Naatya Script Room verification code',
    template: 'otp',
    data: { code },
  });
}
