import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/build-a-highly-advanced-saas-analytics-dashboard-for-tracking-user-engagement-th-5ff2b3/",
  build: { outDir: "dist", assetsDir: "assets" },
  server: { port: 3000 },
});
