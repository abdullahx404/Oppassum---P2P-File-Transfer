import "dotenv/config";

export type ServerConfig = {
  port: number;
  clientOrigins: string[];
  isProduction: boolean;
};

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3200",
  "http://127.0.0.1:3200",
  "http://localhost:3300",
  "http://127.0.0.1:3300"
];

export function getConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number.parseInt(env.PORT ?? "4000", 10);
  const isProduction = env.NODE_ENV === "production";
  const configuredOrigins = env.CLIENT_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const clientOrigins =
    configuredOrigins && configuredOrigins.length > 0 ? configuredOrigins : LOCAL_DEV_ORIGINS;

  validateClientOrigins(clientOrigins, isProduction);

  return {
    port: Number.isFinite(port) ? port : 4000,
    clientOrigins,
    isProduction
  };
}

function validateClientOrigins(clientOrigins: string[], isProduction: boolean): void {
  if (!isProduction) {
    return;
  }

  if (clientOrigins.length === 0 || clientOrigins.some((origin) => origin === "*")) {
    throw new Error("CLIENT_ORIGIN must be a strict production origin allowlist.");
  }

  for (const origin of clientOrigins) {
    const parsed = new URL(origin);

    if (parsed.protocol !== "https:") {
      throw new Error("Production CLIENT_ORIGIN values must use HTTPS.");
    }
  }
}
