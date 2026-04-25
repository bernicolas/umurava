import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
     allowedDevOrigins: ['192.168.1.69'],
  /* config options here */
};

export default nextConfig;
