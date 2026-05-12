import { logger } from "../logger";

/**
 * Send a password-reset email. If SMTP isn't configured (the default for a
 * fresh self-host install) we log the reset link to the server console so the
 * operator can copy it and hand it to the user. This makes first-run reset
 * flows usable without forcing SMTP setup.
 *
 * To wire up real SMTP, set SMTP_URL in `.env` and replace the body of this
 * function with a nodemailer call. We deliberately avoid pulling in nodemailer
 * by default to keep the dependency footprint small.
 */
export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  if (!process.env.SMTP_URL) {
    logger.info(
      { to: opts.to, resetUrl: opts.resetUrl },
      "[auth] SMTP not configured — password reset link printed to console",
    );
    // Also log to plain console for operators tailing stdout without pino-pretty.
    console.log(
      `\n[0docs] Password reset for ${opts.to}: ${opts.resetUrl}\n`,
    );
    return;
  }

  // Operator opted in to real email — defer the heavy import so users without
  // SMTP don't pay the dep cost. The string indirection keeps TypeScript
  // from resolving the optional package at build time.
  try {
    const modName = "nodemailer";
    const mod = (await import(/* @vite-ignore */ modName)) as unknown as {
      default?: { createTransport: Function };
      createTransport?: Function;
    };
    const create = mod.default?.createTransport ?? mod.createTransport;
    if (typeof create !== "function") throw new Error("nodemailer not installed");
    const transport = create(process.env.SMTP_URL);
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@0docs.local",
      to: opts.to,
      subject: "Reset your 0docs password",
      text: `Click the link below to reset your password. This link expires in 1 hour.\n\n${opts.resetUrl}\n\nIf you didn't request this, ignore this email.`,
    });
  } catch (err) {
    logger.error({ err }, "[auth] failed to send reset email");
    // Surface the link to the console so the operator can still recover.
    console.log(
      `\n[0docs] Password reset for ${opts.to} (SMTP failed): ${opts.resetUrl}\n`,
    );
  }
}

/**
 * Send an invitation email. Same fallback semantics as password reset:
 * when SMTP isn't configured the link is printed to the server console
 * so the admin can copy it and share it directly.
 */
export async function sendInviteEmail(opts: {
  to: string;
  inviteUrl: string;
  invitedByName?: string | null;
  makeAdmin?: boolean;
}): Promise<void> {
  const inviterLabel = opts.invitedByName?.trim() || "An admin";
  const roleLabel = opts.makeAdmin ? " as an admin" : "";

  if (!process.env.SMTP_URL) {
    logger.info(
      { to: opts.to, inviteUrl: opts.inviteUrl },
      "[auth] SMTP not configured — invite link printed to console",
    );
    console.log(
      `\n[0docs] Invite for ${opts.to}${roleLabel}: ${opts.inviteUrl}\n`,
    );
    return;
  }

  try {
    const modName = "nodemailer";
    const mod = (await import(/* @vite-ignore */ modName)) as unknown as {
      default?: { createTransport: Function };
      createTransport?: Function;
    };
    const create = mod.default?.createTransport ?? mod.createTransport;
    if (typeof create !== "function") throw new Error("nodemailer not installed");
    const transport = create(process.env.SMTP_URL);
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@0docs.local",
      to: opts.to,
      subject: `${inviterLabel} invited you to 0docs`,
      text: `${inviterLabel} has invited you to join their 0docs workspace${roleLabel}.\n\nAccept the invite and create your account:\n\n${opts.inviteUrl}\n\nThis link expires in 7 days.`,
    });
  } catch (err) {
    logger.error({ err }, "[auth] failed to send invite email");
    console.log(
      `\n[0docs] Invite for ${opts.to}${roleLabel} (SMTP failed): ${opts.inviteUrl}\n`,
    );
  }
}
