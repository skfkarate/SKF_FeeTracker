import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  devIndicators: false, // Hide the "N" badge in dev mode
};

export default nextConfig;
