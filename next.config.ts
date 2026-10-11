import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server (`node server.js`) built in CI, so the host never runs `next build`.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Kept as real node_modules in the standalone output so that `scripts/migrate.mjs`
  // can run on the server with the exact same packages as the app.
  serverExternalPackages: ["mysql2", "drizzle-orm"],
  // No image optimization on the server: `sharp` (~20 MB of native binaries) is never loaded,
  // and the deploy workflow removes it from the bundle.
  images: { unoptimized: true },
  env: {
    // Baked in at build time; exposed by /api/health.
    BUILD_COMMIT: (process.env.GITHUB_SHA ?? "local").slice(0, 7),
  },
  experimental: {
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
