import { expect, Page, test } from "@playwright/test";
import { mockCatalog } from "./fixtures";
import {
    GUILD_COLOR_MAP_A_MAX,
    GUILD_COLOR_MAP_A_MIN,
    GUILD_COLOR_MAP_B_MAX,
    GUILD_COLOR_MAP_B_MIN,
    GUILD_COLOR_MAP_PREVIEW_RESOLUTION,
    guildColorMapFullResolution,
} from "@/lib/guild-color-map";

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

    await page.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
                writeText: async (value: string) => {
                    window.localStorage.setItem("guild-color-share-url", value);
                },
            },
        });
    });
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("guild-color-share-url"))).toBe(
        new URL("/guild-color?hex=FF0000", page.url()).toString(),
    );

    await expect(page.getByText("R−", { exact: true })).toHaveClass(/bg-rose-500\/20/);
    await expect(page.getByText("G−", { exact: true })).toHaveClass(/bg-emerald-500\/20/);
    await expect(page.getByText("B−", { exact: true })).toHaveClass(/bg-sky-500\/20/);

    const chosenPreviewBorder = await page
        .getByRole("img", { name: /Entered color .* territory bordered/ })
        .evaluate((element) => getComputedStyle(element).borderImageSource);
    expect(chosenPreviewBorder).toContain("/guild-color/border-frame.png");

    const chosenPreviewTagSize = await page
        .getByRole("img", { name: /Entered color .* territory bordered/ })
        .locator("span")
        .evaluate((element) => getComputedStyle(element).fontSize);
    const closestPreviewTagSize = await page
        .getByRole("button", { name: /2 guilds use this color: territory bordered/ })
        .locator('[role="img"] span')
        .evaluate((element) => getComputedStyle(element).fontSize);
    expect(closestPreviewTagSize).toBe(chosenPreviewTagSize);

    const redMinusSuggestion = page.getByRole("button", { name: /R−/ });
    await expect(redMinusSuggestion).toBeVisible();
    await redMinusSuggestion.click();

    await expect(input).toHaveValue("#FF0000");
    await expect(page.getByText("R− allowed suggestion · #CA0000", { exact: true })).toBeVisible();

    await page.getByRole("textbox", { name: "Preview tag" }).fill("NEW");
    await expect(
        page.getByRole("img", { name: /allowed suggestion: territory bordered.*with the tag NEW/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Return to closest" }).click();
    await expect(page.getByText("2 guilds use this color · #FF0000")).toBeVisible();
});

test("supports color query and direct hash preload formats", async ({ page }) => {
    await page.goto("/guild-color");
    await expect(page.getByRole("heading", { name: "Guild Color Picker" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Color map" })).toHaveAttribute("href", "/guild-color/map");
    await expect(page.locator("#preview-heading")).toHaveText("Territory previews");
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

test("maps allowed and guild-claimed regions across Lab lightness slices", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, "devicePixelRatio", {
            configurable: true,
            value: 1.5,
        });
    });
    await page.setViewportSize({ width: 1707, height: 960 });
    await page.goto("/guild-color/map");

    await expect(page.getByRole("heading", { name: "Guild Color Claim Map" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to picker" })).toHaveAttribute("href", "/guild-color");
    await expect(page.getByText("3 unique colors")).toBeVisible();
    await expect(page.getByText("4 guilds")).toBeVisible();
    await expect(page.getByText("85 placeholder entries", { exact: false })).toBeVisible();

    const lightness = page.getByRole("slider", { name: "Lightness view" });
    await lightness.fill("53");
    await expect(page.getByTestId("map-status")).toContainText("Showing L* 53");

    const map = page.getByRole("img", { name: "Guild color claims at Lab lightness 53" });
    await expect(map).toBeVisible();
    const pageHeight = await page.evaluate(() => ({
        viewport: window.innerHeight,
        document: document.documentElement.scrollHeight,
    }));
    expect(pageHeight.document).toBeLessThanOrEqual(pageHeight.viewport);
    const bounds = await map.boundingBox();
    expect(bounds).not.toBeNull();
    const fullResolution = guildColorMapFullResolution(bounds!.width, 1.5);
    expect(fullResolution).toBe(1024);

    await page.mouse.move(
        bounds!.x +
            bounds!.width * ((75 - GUILD_COLOR_MAP_A_MIN) / (GUILD_COLOR_MAP_A_MAX - GUILD_COLOR_MAP_A_MIN)),
        bounds!.y +
            bounds!.height * ((GUILD_COLOR_MAP_B_MAX - 60) / (GUILD_COLOR_MAP_B_MAX - GUILD_COLOR_MAP_B_MIN)),
    );
    await expect(page.getByText("2 guilds share #FF0000")).toBeVisible();
    await expect(page.getByText("Red One [R1]")).toBeVisible();
    await expect(page.getByText("Red Two [R2]")).toBeVisible();
    await expect(page.getByText(/Registered #FF0000 · ΔE/)).toBeVisible();

    const sliderBounds = await lightness.boundingBox();
    expect(sliderBounds).not.toBeNull();
    await page.mouse.move(
        sliderBounds!.x + sliderBounds!.width * 0.53,
        sliderBounds!.y + sliderBounds!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
        sliderBounds!.x + sliderBounds!.width * 0.35,
        sliderBounds!.y + sliderBounds!.height / 2,
        { steps: 4 },
    );
    const draggedLightness = await lightness.inputValue();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("aria-label", `Guild color claims at Lab lightness ${draggedLightness}`);
    await expect(canvas).toHaveAttribute("width", String(GUILD_COLOR_MAP_PREVIEW_RESOLUTION));
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("width", String(fullResolution));
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

    await page.goto("/guild-color/map");
    await expect(page.getByText("Guild colors could not be loaded")).toBeVisible();
    await expect(page.getByText("Unavailable. No claim map was calculated.")).toBeVisible();
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
