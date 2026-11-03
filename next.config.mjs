/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure static export: no Node server is needed at runtime, so the whole app
  // can be cached by the service worker and run with no network.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
