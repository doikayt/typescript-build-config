import { definePlaywrightConfig } from "@doikayt/typescript-build-config/playwright";

// Seeded by `typescript-build-config init`. definePlaywrightConfig merges the
// NixOS system-Chromium path automatically; fill in the TODOs for your app.
export default definePlaywrightConfig({
  testDir: "tests/e2e",
  // Playwright starts your app before the run and waits for it to be reachable,
  // so `npm run test:e2e` needs no separate server step in CI.
  webServer: {
    command: "npm run start", // TODO: the command that starts your app
    url: "http://localhost:3000", // TODO: the URL Playwright waits for
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000", // TODO: base URL for page.goto("/")
  },
});
