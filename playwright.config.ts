import { defineConfig, devices } from "@playwright/test";

const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "pnpm build && pnpm start";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
    outputDir: "test-results",
    use: {
        baseURL: "http://127.0.0.1:3000",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    webServer: {
        command: webServerCommand,
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ],
});
