import * as client from "openid-client";

export const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";

let oidcConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    if (!process.env.REPL_ID) {
      throw new Error(
        "REPL_ID env var is required for AUTH_MODE=replit. " +
          "Switch AUTH_MODE=selfhost or set REPL_ID.",
      );
    }
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID,
    );
  }
  return oidcConfig;
}
