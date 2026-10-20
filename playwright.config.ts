import { defineConfig, devices, type Project } from '@playwright/test';
import { loadConfig } from './src/config/loader';

const cfg = loadConfig();
const isCI = !!process.env.CI;

// Optional: use an installed browser instead of Playwright's download,
// e.g. PW_CHANNEL=chrome or PW_CHANNEL=msedge (Chromium-based projects only)
const chromiumChannel = process.env.PW_CHANNEL || undefined;

// Extra browsers beyond chromium + firefox, e.g. EXTRA_BROWSERS=webkit
const extraBrowsers = (process.env.EXTRA_BROWSERS ?? '')
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);

const browserDevices: Record<string, (typeof devices)[string]> = {
  webkit: devices['Desktop Safari'],
};

const desktopProjects: Project[] = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], channel: chromiumChannel },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  ...extraBrowsers
    .filter((b) => browserDevices[b])
    .map((b) => ({ name: b, use: { ...browserDevices[b] } })),
].map((p) => ({
  ...p,
  testDir: './tests',
  testIgnore: /setup\/.*/,
  grepInvert: /@mobile-only/,
  dependencies: ['setup'],
}));

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  metadata: { project: cfg.name, baseURL: cfg.baseURL },

  use: {
    baseURL: cfg.baseURL,
    httpCredentials: cfg.env.httpCredentials,
    locale: cfg.locale,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /setup\/.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /setup\/.*\.teardown\.ts/,
    },
    ...desktopProjects,
    {
      name: 'mobile',
      testDir: './tests',
      testIgnore: /setup\/.*/,
      grep: /@mobile/,
      use: { ...devices['Pixel 7'], channel: chromiumChannel },
      dependencies: ['setup'],
    },
  ],
});
