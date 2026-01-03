import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Vercel için optimize edilmiş ayarlar
  reactStrictMode: true,
  // WebSocket bağlantıları için gerekli
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
