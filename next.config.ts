import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel için optimize edilmiş ayarlar
  reactStrictMode: true,
  // Next.js 16'da Turbopack varsayılan, webpack config yerine boş turbopack config
  // Eğer webpack kullanmak isterseniz: npm run build -- --webpack
  turbopack: {},
};

export default nextConfig;
