import type { NextConfig } from "next";

const runtimeTarget = process.env.SPICE_RUNTIME_TARGET === "vercel" ? "vercel" : "local";
const useStandaloneOutput = runtimeTarget === "local" || process.env.SPICE_STANDALONE_OUTPUT === "1";
const cloudApiOrigin =
  process.env.SPICE_CLOUD_API_ORIGIN ||
  process.env.NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN ||
  "https://music.spice-app.xyz";
const localApiOrigin =
  process.env.SPICE_LOCAL_API_ORIGIN ||
  process.env.NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN ||
  "http://127.0.0.1:3939";
const runtimeHome = runtimeTarget === "vercel"
  ? "./app/cloud-portal.tsx"
  : "./app/spice-app.tsx";
const publicApiPaths = [
  "/api/version",
  "/api/runtime",
  "/api/notifications/release",
  "/api/updates/local-windows",
  "/api/updates/local-linux",
  "/api/downloads/local-windows",
  "/api/downloads/local-linux",
];
const publicApiCorsHeaders = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Range, Authorization" },
  { key: "Access-Control-Max-Age", value: "86400" },
  { key: "Access-Control-Expose-Headers", value: "Accept-Ranges, Content-Length, Content-Range, Content-Type" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return publicApiPaths.map((source) => ({
      source,
      headers: publicApiCorsHeaders,
    }));
  },
  env: {
    NEXT_PUBLIC_SPICE_RUNTIME_TARGET: runtimeTarget,
    NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN: cloudApiOrigin,
    NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN: localApiOrigin,
  },
  output: useStandaloneOutput ? "standalone" : undefined,
  outputFileTracingIncludes: runtimeTarget === "local"
    ? {
        "/*": ["../../node_modules/ffmpeg-static/**/*"],
      }
    : undefined,
  outputFileTracingExcludes: runtimeTarget === "local"
    ? {
        "/*": [
          "./db/**/*",
          "./app/api/cloud/**/*",
        ],
      }
    : undefined,
  turbopack: {
    resolveAlias: {
      "@/app/runtime-home": runtimeHome,
      ...(runtimeTarget === "local"
        ? {
          "@/db": "./db/local-stub.ts",
          "@/db/schema": "./db/local-schema-stub.ts",
          "@neondatabase/serverless": "./lib/neon-local-stub.ts",
          "drizzle-orm": "./lib/drizzle-local-stub.ts",
          "drizzle-orm/neon-http": "./lib/drizzle-local-stub.ts",
          "@/lib/proxy-system-settings": "./lib/proxy-system-settings-local.ts",
          }
        : {
          "ffmpeg-static": "./lib/ffmpeg-static-vercel-stub.ts",
        }),
    },
  },
};

export default nextConfig;
