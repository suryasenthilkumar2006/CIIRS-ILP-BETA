import nodemailer from "nodemailer";

/**
 * Creates and returns a Nodemailer transporter configured for Gmail SMTP.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.
 */
export function getMailTransporter(): nodemailer.Transporter {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD must be configured in environment variables to send emails."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends a pickup verification OTP email with clean HTML formatting.
 *
 * @param toEmail - Recipient email address
 * @param otp - 6-digit OTP code string
 * @param wasteType - Category/type of waste being picked up
 * @returns SentMessageInfo from nodemailer
 * @throws Error if environment variables are missing or email sending fails
 */
export async function sendOTPEmail(
  toEmail: string,
  otp: string,
  wasteType: string
): Promise<nodemailer.SentMessageInfo> {
  const user = process.env.GMAIL_USER;
  const transporter = getMailTransporter();

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"CIIRS Marketplace" <${user}>`,
    to: toEmail,
    subject: `[CIIRS] Waste Pickup Verification Code: ${otp}`,
    text: `Your CIIRS waste pickup verification code for ${wasteType} is: ${otp}\n\nThis code is valid for 15 minutes.\nProvide this code upon physical collection to confirm handoff and claim your Green Credits.`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CIIRS Pickup Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background: linear-gradient(135deg, #059669 0%, #2563eb 100%); text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">CIIRS</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #d1fae5; font-weight: 500;">Circular Industrial &amp; Institutional Resource System</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #fafafa;">Waste Pickup Verification Code</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                A physical waste collection has been scheduled for your <strong style="color: #f4f4f5;">${wasteType}</strong> batch. Please provide this One-Time Password (OTP) to the driver/collection partner to verify the physical handoff.
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #09090b; border: 1px dashed #3b82f6; border-radius: 8px; padding: 24px 16px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #60a5fa; letter-spacing: 1.5px; margin-bottom: 8px;">Your 6-Digit Pickup OTP</span>
                <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', Courier, monospace; line-height: 1.2;">${otp}</span>
                <span style="display: block; font-size: 12px; color: #fbbf24; margin-top: 10px; font-weight: 500;">⏱ Valid for 15 minutes</span>
              </div>

              <div style="background-color: #27272a; border-left: 3px solid #10b981; padding: 12px 16px; border-radius: 4px; margin-top: 20px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #d4d4d8;">
                  <strong>Why verify?</strong> Submitting this OTP confirms batch handover, advances your contract timeline, and immediately unlocks your <strong>Green Credits</strong> and verified <strong>CO₂ savings</strong>.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #09090b; border-top: 1px solid #27272a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #71717a;">
                If you did not initiate this pickup request, please ignore this email or contact support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error: any) {
    throw new Error(
      `Failed to send OTP email to "${toEmail}": ${error.message || error}`
    );
  }
}
