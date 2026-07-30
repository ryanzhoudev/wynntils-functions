import { expect, Page, test } from "@playwright/test";
import { mockCatalog } from "./fixtures";

const guildColorResponse = {
    guilds: [
        { name: "Red One", prefix: "R1", color: "#FF0000" },
        { name: "Red Two", prefix: "R2", color: "#FF0000" },
        { name: "Blue Guild", prefix: "BLU", color: "#0000FF" },
        { name: "Green Guild", prefix: "GRN", color: "#00FF00" },
    ],
    fetchedAt: Date.UTC(2026, 6, 29, 20, 0, 0),
    cacheSeconds: 600,
    excludedPlaceholderCount: 85,
    source: {
        url: "https://athena.wynntils.com/cache/get/guildList",
        etag: '"fixture"',
        freshness: "request-time-only",
    },
};

async function mockGuildColors(page: Page) {
    await page.route("**/api/guild-colors", async (route) => {
        await route.fulfill({ json: guildColorResponse });
    });
}

test.beforeEach(async ({ page }) => {
    await mockGuildColors(page);
});

test("preloads colors, previews every blocker, and keeps suggestions separate from the input", async ({ page }) => {
    await page.goto("/guild-color?hex=FF0000");

    const input = page.getByRole("textbox", { name: "Guild color", exact: true });
    await expect(input).toHaveValue("#FF0000");
    await expect(page.getByText("Allowed? 🟥 No")).toBeVisible();
    await expect(page.getByText("2 guilds use this color").first()).toBeVisible();
    await expect(page.getByText("85 placeholder entries", { exact: false })).toBeVisible();
    await expect(page.getByText("Red One [R1], Red Two [R2]", { exact: true })).toHaveClass(/text-sm/);

    await expect(page.getByText("R−", { exact: true })).toHaveClass(/bg-rose-500\/20/);
    await expect(page.getByText("G−", { exact: true })).toHaveClass(/bg-emerald-500\/20/);
    await expect(page.getByText("B−", { exact: true })).toHaveClass(/bg-sky-500\/20/);

    const chosenPreviewBorder = await page
        .getByRole("img", { name: /Entered color .* territory bordered/ })
        .evaluate((element) => getComputedStyle(element).borderImageSource);
    expect(chosenPreviewBorder).toContain("/guild-color/border-frame.png");

    const redMinusSuggestion = page.getByRole("button", { name: /R−/ });
    await expect(redMinusSuggestion).toBeVisible();
    await redMinusSuggestion.click();

    await expect(input).toHaveValue("#FF0000");
    await expect(page.getByText("R− allowed suggestion · #CA0000", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Return to closest" }).click();
    await expect(page.getByText("2 guilds use this color · #FF0000")).toBeVisible();
});

test("supports color query and direct hash preload formats", async ({ page }) => {
    await page.goto("/guild-color");
    await expect(page.getByRole("heading", { name: "Guild Color Picker" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Guild color", exact: true })).toHaveValue("#FFFFFF");
    await expect(
        page.getByText("Bot-compatible checks, territory previews, and nearby color comparisons."),
    ).toHaveCount(0);
    await expect(page.getByText("Paste a hex value or use the picker. Three-digit hex is supported.")).toHaveCount(0);
    await expect(
        page.getByText("The chosen color stays fixed on the left while comparisons change on the right."),
    ).toHaveCount(0);

    await page.goto("/guild-color?color=00FF00");
    await expect(page.getByRole("textbox", { name: "Guild color", exact: true })).toHaveValue("#00FF00");

    await page.goto("/guild-color#0000FF");
    await expect(page.getByRole("textbox", { name: "Guild color", exact: true })).toHaveValue("#0000FF");
});

test("does not calculate an allowed verdict when the guild source fails", async ({ page }) => {
    await page.unroute("**/api/guild-colors");
    await page.route("**/api/guild-colors", async (route) => {
        await route.fulfill({
            status: 502,
            json: { error: "Guild color data is temporarily unavailable. No verdict was calculated." },
        });
    });

    await page.goto("/guild-color?hex=ABC");
    await expect(page.getByText("Allowed? Not checked")).toBeVisible();
    await expect(page.getByText("No verdict was calculated.", { exact: false })).toBeVisible();
});

test("links to the guild color tool immediately before the classic UI", async ({ page }) => {
    await mockCatalog(page);
    await page.goto("/");

    const navigationLinks = page.locator("header a");
    await expect(navigationLinks.nth(0)).toHaveAttribute("href", "/guild-color");
    await expect(navigationLinks.nth(1)).toHaveAttribute("href", "/old");

    const guildColorButtonHeight = await page
        .getByRole("link", { name: "Guild color", exact: true })
        .evaluate((element) => element.getBoundingClientRect().height);
    const classicButtonHeight = await page
        .getByRole("link", { name: "Open classic UI", exact: true })
        .evaluate((element) => element.getBoundingClientRect().height);
    expect(guildColorButtonHeight).toBe(classicButtonHeight);
});
