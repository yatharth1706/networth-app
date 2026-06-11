import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static export — no server. All data lives in the browser
  // (IndexedDB), so the app can be hosted on any static host.
  output: "export",
};

export default nextConfig;
