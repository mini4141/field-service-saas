import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
export default {
  output: "standalone",
  outputFileTracingRoot: root,
  transpilePackages: ["@fss/ui", "@fss/api-client"],
  eslint: { ignoreDuringBuilds: true },
  // Local dev: same-origin /api -> API. In K8s/EKS the Traefik ingress routes /api straight to the API service.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};
