import nodemailer from "nodemailer";

export default async function sendInviteEmail(
  to: string,
  token: string,
  inviterName: string,
  workspaceName: string
) {
  // 1️⃣ Build the invite link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/accept?token=${token}`;

  // 2️⃣ Configure Mailtrap SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 3️⃣ Build email content
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>🎉 You've been invited to join <b>${workspaceName}</b></h2>
      <p>${inviterName} has invited you to collaborate in <b>${workspaceName}</b>.</p>
      <p>
        <a href="${inviteLink}" 
           style="display:inline-block;padding:10px 18px;background:#4F46E5;color:white;text-decoration:none;border-radius:6px;">
          Accept Invitation
        </a>
      </p>
      <p>Or copy this link:<br/><a href="${inviteLink}">${inviteLink}</a></p>
      <hr/>
      <small>This invitation link will expire soon.</small>
    </div>
  `;

  // 4️⃣ Send email via Mailtrap
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${workspaceName}" <${process.env.SMTP_USER}>`,
      to,
      subject: `You're invited to join ${workspaceName}`,
      html,
    });

    console.log(`✅ Invitation email sent (Mailtrap) → ${to}`);
    console.log(`🔗 Invite Link: ${inviteLink}`);
  } catch (error) {
    console.error("❌ Error sending invitation email:", error);
    throw new Error("Failed to send invitation email");
  }
}
