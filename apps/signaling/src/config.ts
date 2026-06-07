import "dotenv/config";

export type ServerConfig = {
  port: number;
  clientOrigin: string;
  isProduction: boolean;
};

export function getConfig(): ServerConfig {
  const port = Number.parseInt(process.env.PORT ?? "4000", 10);

  return {
    port: Number.isFinite(port) ? port : 4000,
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    isProduction: process.env.NODE_ENV === "production"
  };
}
