export interface RuntimeConfig {
  backendUrl?: string;
  publishableKey?: string;
  projectId?: string;
  functionsUrl?: string;
  mode?: "managed" | "self-hosted";
}

declare global {
  interface Window {
    __ZD_RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

const CONFIG_PATH = "/config.json";

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (typeof window === "undefined") return {};

  try {
    const response = await fetch(CONFIG_PATH, { cache: "no-store" });
    if (!response.ok) return {};

    const config = (await response.json()) as RuntimeConfig;
    window.__ZD_RUNTIME_CONFIG__ = config;
    return config;
  } catch {
    return {};
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") return {};
  return window.__ZD_RUNTIME_CONFIG__ || {};
}

export function getFunctionsUrl(): string | undefined {
  const config = getRuntimeConfig();
  if (config.functionsUrl) return config.functionsUrl.replace(/\/$/, "");
  if (config.backendUrl) return `${config.backendUrl.replace(/\/$/, "")}/functions/v1`;
  return undefined;
}
