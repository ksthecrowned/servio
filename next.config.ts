import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Radix Select imports @floating-ui/utils/dom. That package only exposes the
  // subpath through a legacy `module` field, which Turbopack does not read.
  turbopack: {
    resolveAlias: {
      "@floating-ui/utils/dom":
        "./node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs",
    },
  },
};

export default nextConfig;
