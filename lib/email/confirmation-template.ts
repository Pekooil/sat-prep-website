/**
 * confirmation-template.ts
 *
 * Branded signup confirmation email sent via Resend.
 * Uses inline styles for broad email-client compatibility.
 */

import { LEGAL } from '@/lib/legal/config'

export interface ConfirmationEmailData {
  firstName: string
  confirmUrl: string
  appUrl: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildConfirmationEmail(d: ConfirmationEmailData): {
  subject: string
  html: string
} {
  const subject = 'Confirm your SaturnPath account'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirm your SaturnPath account</title>
</head>
<body style="margin:0; padding:0; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; -webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc; padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%;">

        <!-- ── Header ─────────────────────────────────────────────────── -->
        <tr>
          <td style="
            background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
            border-radius:16px 16px 0 0;
            padding:32px 32px 28px;
          ">
            <p style="margin:0; font-size:12px; color:#c4b5fd; font-weight:600; letter-spacing:0.08em; text-transform:uppercase;">SaturnPath</p>
            <h1 style="margin:6px 0 0; font-size:24px; font-weight:700; color:#ffffff; line-height:1.2;">
              Confirm your email address
            </h1>
          </td>
        </tr>

        <!-- ── Body ───────────────────────────────────────────────────── -->
        <tr>
          <td style="
            background:#ffffff;
            padding:36px 32px 32px;
            border-radius:0 0 16px 16px;
            border:1px solid #e2e8f0;
            border-top:none;
          ">
            <p style="font-size:16px; color:#1e293b; margin:0 0 6px; font-weight:500;">
              Hi ${esc(d.firstName)},
            </p>
            <p style="font-size:15px; color:#475569; margin:0 0 28px; line-height:1.65;">
              Thanks for signing up for SaturnPath! Your personalized SAT study plan is ready and waiting. Click below to confirm your email address and get started.
            </p>

            <!-- CTA -->
            <div style="text-align:center; margin:0 0 32px;">
              <a href="${esc(d.confirmUrl)}"
                 style="
                   display:inline-block;
                   background:#7c3aed; color:#ffffff;
                   text-decoration:none; font-size:15px; font-weight:600;
                   padding:14px 40px; border-radius:10px;
                   letter-spacing:0.01em;
                 ">
                Confirm my account
              </a>
            </div>

            <!-- Fallback link -->
            <p style="font-size:13px; color:#94a3b8; margin:0 0 6px;">
              If the button doesn&apos;t work, copy and paste this URL into your browser:
            </p>
            <p style="font-size:12px; margin:0 0 28px; word-break:break-all;">
              <a href="${esc(d.confirmUrl)}" style="color:#7c3aed; text-decoration:underline;">${esc(d.confirmUrl)}</a>
            </p>

            <!-- Divider + security note -->
            <div style="border-top:1px solid #f1f5f9; padding-top:20px;">
              <p style="font-size:13px; color:#94a3b8; margin:0; line-height:1.6;">
                If you didn&apos;t create a SaturnPath account, you can safely ignore this email.
                This confirmation link expires in 24&nbsp;hours.
              </p>
            </div>
          </td>
        </tr>

        <!-- ── Footer ─────────────────────────────────────────────────── -->
        <tr>
          <td style="padding:20px 32px; text-align:center;">
            <p style="font-size:12px; color:#94a3b8; margin:0; line-height:1.6;">
              <a href="${esc(d.appUrl)}/settings" style="color:#7c3aed; text-decoration:underline;">Notification preferences</a>
              &nbsp;·&nbsp;
              <a href="${esc(d.appUrl)}/privacy" style="color:#7c3aed; text-decoration:underline;">Privacy Policy</a>
              <br />
              ${esc(LEGAL.legalEntity)}${LEGAL.mailingAddress ? `<br />${esc(LEGAL.mailingAddress)}` : ''}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}
