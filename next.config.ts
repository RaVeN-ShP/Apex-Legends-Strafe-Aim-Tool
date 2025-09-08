import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  webpack: (config) => {
    // Use SVGR for importing SVGs as React components
    config.module.rules.push({
      test: /\.svg$/,
      issuer: { and: [/[j|t]sx?$/] },
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            // Keep viewBox and dimensions, allow passing title/props
            svgo: true,
            svgoConfig: {
              plugins: [
                {
                  name: 'preset-default',
                  params: { overrides: { removeViewBox: false } },
                },
                'removeDimensions',
              ],
            },
          },
        },
      ],
    });
    return config;
  },
};

export default nextConfig;
