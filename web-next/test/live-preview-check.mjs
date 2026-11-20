// Read-only integration smoke: abort every mutation; use an isolated browser profile.
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [], mutations = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
      mutations.push(new URL(route.request().url()).pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("http://localhost:6502/image");
  await page.locator(".media-tabs").waitFor();
  await page.locator(".header-actions select").selectOption("en");
  await page.getByRole("link", { name: "Comparison", exact: true }).click();
  await page.locator(".comparison-slot").nth(1).waitFor();
  const comparisonSlots = await page.locator(".comparison-slot").count();
  await page.getByRole("link", { name: "Video", exact: true }).click();
  await page.locator(".video-settings").waitFor();
  const endpoints = await page.evaluate(async () => {
    const paths = ["/api/comparisons/policy", "/api/comparisons/requests/fe24_nonexistent_probe", "/api/generation/video/requests/fe24_nonexistent_probe", "/api/generation/video/capabilities"];
    return Promise.all(paths.map(async path => {
      const response = await fetch(path, { credentials: "include" });
      const body = await response.json();
      return { path, status: response.status, state: body.state, modelCount: body.models?.length };
    }));
  });
  assert.ok(endpoints.every(item => item.status === 200), JSON.stringify(endpoints));
  assert.ok(endpoints.filter(item => item.path.includes("/requests/")).every(item => item.state === "unknown"));
  assert.deepEqual(errors, []);
  assert.deepEqual(mutations, []);
  console.log(JSON.stringify({ result: "PASS live frontend/API read-only integration", comparisonSlots, endpoints, mutations: 0, browserErrors: 0 }));
} finally { await browser.close(); }
