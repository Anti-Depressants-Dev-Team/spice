import type { NextConfig } from "next";

const runtimeTarget = process.env.SPICE_RUNTIME_TARGET === "vercel" ? "vercel" : "local";
const cloudApiOrigin =
  process.env.SPICE_CLOUD_API_ORIGIN ||
  process.env.NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN ||
  "https://music.spice-app.xyz";
const localApiOrigin =
  process.env.SPICE_LOCAL_API_ORIGIN ||
  process.env.NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN ||
  "http://127.0.0.1:3939";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  env: {
    NEXT_PUBLIC_SPICE_RUNTIME_TARGET: runtimeTarget,
    NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN: cloudApiOrigin,
    NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN: localApiOrigin,
  },
  output: runtimeTarget === "local" ? "standalone" : undefined,
  outputFileTracingExcludes: runtimeTarget === "local"
    ? {
        "/*": [
          "./db/**/*",
          "./app/api/cloud/**/*",
        ],
      }
    : undefined,
  turbopack: runtimeTarget === "local"
    ? {
        resolveAlias: {
          "@/db": "./db/local-stub.ts",
          "@/db/schema": "./db/local-schema-stub.ts",
          "@neondatabase/serverless": "./lib/neon-local-stub.ts",
          "drizzle-orm": "./lib/drizzle-local-stub.ts",
          "drizzle-orm/neon-http": "./lib/drizzle-local-stub.ts",
        },
      }
    : undefined,
};

export default nextConfig;
