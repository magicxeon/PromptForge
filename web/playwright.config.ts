import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // The smoke suite shares one local JSON-backed server. Serial execution keeps
  // Windows process cleanup and actor-scoped runtime mutations deterministic.
  fullyParallel: false,
  workers: 1,
  retries: 1,
  use: {
    baseURL: 'http://localhost:6500',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'npm --prefix .. run build:web && npm --prefix .. start',
    url: 'http://localhost:6500/community',
    reuseExistingServer: true
  }
});
