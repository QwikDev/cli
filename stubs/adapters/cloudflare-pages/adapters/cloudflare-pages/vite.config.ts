import { cloudflarePagesAdapter } from "@qwik.dev/router/adapters/cloudflare-pages/vite";
import { extendConfig } from "@qwik.dev/core/optimizer";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, () => {
  return {
    build: {
      rollupOptions: {
        input: ["src/entry.cloudflare-pages.tsx", "@qwik-city-plan"],
      },
    },
    plugins: [cloudflarePagesAdapter()],
  };
});
