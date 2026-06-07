import "dotenv/config";

export type ServerConfig = {
  port: number;
  clientOrigins: string[];
  isProduction: boolean;
};

export function getConfig(): ServerConfig {
  const port = Number.parseInt(process.env.PORT ?? "4000", 10);
  const configuredOrigins = process.env.CLIENT_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port: Number.isFinite(port) ? port : 4000,
    clientOrigins:
      configuredOrigins && configuredOrigins.length > 0
        ? configuredOrigins
        : [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3200",
            "http://127.0.0.1:3200",
            "http://localhost:3300",
            "http://127.0.0.1:3300"
          ],
    isProduction: process.env.NODE_ENV === "production"
  };
}
