import { expect, type Page, test } from "@playwright/test";
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
        {
            name: "Red One",
            prefix: "R1",
            color: "#FF0000",
        },
        {
            name: "Red Two",
            prefix: "R2",
            color: "#FF0000",
        },
        {
            name: "Blue Guild",
            prefix: "BLU",
            color: "#0000FF",
        },
        {
            name: "Green Guild",
            prefix: "GRN",
            color: "#00FF00",
        },
    ],
    fetchedAt: Date.UTC(2026, 6, 29, 20, 0, 0),
    cacheSeconds: 600,
    excludedPlaceholderCount: 85,
    stats: null,
    source: {
        url: "https://athena.wynntils.com/cache/get/guildList",
        etag: '"fixture"',
        freshness: "request-time-only",
    },
};

const guildColorStatsResponse = {
    guilds: [
        {
            name: "Red One",
            prefix: "R1",
            stats: { currentTerritories: 2, currentSeasonRating: 12340, previousSeasonRating: 8210 },
        },
        {
            name: "Red Two",
            prefix: "R2",
            stats: { currentTerritories: 0, currentSeasonRating: 6586691, previousSeasonRating: 15107093 },
        },
        {
            name: "Blue Guild",
            prefix: "BLU",
            stats: { currentTerritories: null, currentSeasonRating: null, previousSeasonRating: null },
        },
        {
            name: "Green Guild",
            prefix: "GRN",
            stats: { currentTerritories: 1, currentSeasonRating: 900, previousSeasonRating: 1200 },
        },
    ],
    fetchedAt: Date.UTC(2026, 7, 19, 20, 0, 0),
    cacheSeconds: 60,
    currentSeason: {
        id: "32",
        startAt: "2026-07-24T23:01:00.000Z",
        endAt: "2026-09-27T04:01:00.000Z",
    },
    previousSeason: {
        id: "31",
        startAt: "2026-05-29T23:01:00.000Z",
        endAt: "2026-07-19T04:01:00.000Z",
    },
};

async function mockGuildColors(page: Page) {
    await page.route("**/api/guild-colors", async (route) => {
        await route.fulfill({ json: guildColorResponse });
    });
    await page.route("**/api/guild-color-stats", async (route) => {
        await route.fulfill({ json: guildColorStatsResponse });
    });
}

test.beforeEach(async ({ page }) => {
    await mockGuildColors(page);
});

test("renders color verdicts before optional activity statistics finish loading", async ({ page }) => {
    let releaseStats: (() => void) | undefined;
    const statsGate = new Promise<void>((resolve) => {
        releaseStats = resolve;
    });

    await page.unroute("**/api/guild-color-stats");
    await page.route("**/api/guild-color-stats", async (route) => {
        await statsGate;
        await route.fulfill({ json: guildColorStatsResponse });
    });

    await page.goto("/guild-color?hex=FF0000");

    try {
        await expect(page.getByText("Allowed? 🟥 No")).toBeVisible();
        await expect(page.getByText("2 guilds use this color").first()).toBeVisible();
        await expect(page.getByText("Previous S31", { exact: true })).toHaveCount(0);
    } finally {
        releaseStats?.();
    }

    const redOneStats = page.getByRole("link", { name: /Red One \[R1\].*opens in a new tab/ }).locator("..");
    await expect(redOneStats.getByText("Previous S31", { exact: true })).toHaveCount(2);
    await expect(redOneStats.getByText("12,340 SR", { exact: true })).toHaveCount(2);
});

test("updates the verdict while dragging the inline color picker", async ({ page }) => {
    await page.goto("/guild-color?hex=FFFFFF");

    const input = page.getByRole("textbox", { name: "Guild color", exact: true });
    const previewTagInput = page.getByRole("textbox", { name: "Preview tag" });
    const plane = page.getByRole("slider", { name: "Saturation and brightness" });
    await expect(page.locator('input[type="color"]')).toHaveCount(0);
    await expect(plane).toBeVisible();
    await expect(page.getByText(/Allowed\? (?:🟩 Yes|🟥 No)/)).toBeVisible();

    const inputBounds = await input.boundingBox();
    const previewTagBounds = await previewTagInput.boundingBox();
    expect(inputBounds).not.toBeNull();
    expect(previewTagBounds).not.toBeNull();
    expect(Math.abs(inputBounds!.y - previewTagBounds!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(inputBounds!.width - previewTagBounds!.width)).toBeLessThanOrEqual(1);
    expect(previewTagBounds!.x).toBeGreaterThan(inputBounds!.x + inputBounds!.width);

    const bounds = await plane.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(bounds!.x + 4, bounds!.y + 4);
    await page.mouse.down();
    await page.mouse.move(bounds!.x + bounds!.width * 0.72, bounds!.y + bounds!.height * 0.28, {
        steps: 5,
    });

    await expect(input).not.toHaveValue("#FFFFFF");
    await expect(page.getByText(/Allowed\? (?:🟩 Yes|🟥 No)/)).toBeVisible();
    await page.mouse.up();
});

test("preloads colors, previews every blocker, and keeps suggestions separate from the input", async ({ page }) => {
    await page.goto("/guild-color?hex=FF0000");

    const input = page.getByRole("textbox", { name: "Guild color", exact: true });
    await expect(input).toHaveValue("#FF0000");
    await expect(page.getByText("Allowed? 🟥 No")).toBeVisible();
    await expect(page.getByText("2 guilds use this color").first()).toBeVisible();
    await expect(page.getByText("85 placeholder entries", { exact: false })).toBeVisible();

    const redOneLinks = page.getByRole("link", { name: /Red One \[R1\].*opens in a new tab/ });
    await expect(redOneLinks).toHaveCount(2);
    await expect(redOneLinks.first()).toHaveAttribute("href", "https://wynncraft.com/stats/guild/Red%20One");
    await expect(redOneLinks.first()).toHaveAttribute("target", "_blank");
    await expect(redOneLinks.first()).toHaveAttribute("rel", "noopener noreferrer");
    const sharedGuildLists = page.getByRole("list").filter({
        has: page.getByRole("link", { name: /Red One \[R1\].*opens in a new tab/ }),
    });
    await expect(sharedGuildLists).toHaveCount(2);
    await expect(sharedGuildLists.first().getByRole("listitem")).toHaveCount(2);
    await expect(sharedGuildLists.first().getByRole("listitem").first()).toHaveClass(/bg-muted\/40/);
    const redOneStats = redOneLinks.locator("..");
    await expect(redOneStats.first().locator(":scope > span")).toHaveCSS("border-top-width", "0px");
    await expect(redOneStats.getByText("Previous S31", { exact: true })).toHaveCount(2);
    await expect(redOneStats.getByText("Terrs", { exact: true })).toHaveCount(2);
    await expect(redOneStats.getByText("Current S32", { exact: true })).toHaveCount(2);
    await expect(redOneStats.getByText("2", { exact: true })).toHaveCount(2);
    await expect(redOneStats.getByText("12,340 SR", { exact: true })).toHaveCount(2);
    await expect(redOneStats.getByText("8,210 SR", { exact: true })).toHaveCount(2);
    await expect(redOneStats.first().getByText("12,340 SR", { exact: true })).not.toHaveClass(/text-rose/);
    await expect(redOneStats.first().getByText("8,210 SR", { exact: true })).toHaveClass(/text-rose/);

    const redTwoStats = page.getByRole("link", { name: /Red Two \[R2\].*opens in a new tab/ }).locator("..");
    const highPreviousRatings = redTwoStats.getByText("15,107,093 SR", { exact: true });
    const highCurrentRatings = redTwoStats.getByText("6,586,691 SR", { exact: true });
    await expect(highPreviousRatings).toHaveCount(2);
    await expect(highCurrentRatings).toHaveCount(2);
    expect(
        await highPreviousRatings.evaluateAll((elements) =>
            elements.every((element) => element.scrollWidth <= element.clientWidth),
        ),
    ).toBe(true);
    expect(
        await highCurrentRatings.evaluateAll((elements) =>
            elements.every((element) => element.scrollWidth <= element.clientWidth),
        ),
    ).toBe(true);

    const unavailableStats = page
        .getByRole("link", { name: /Blue Guild \[BLU\].*opens in a new tab/ })
        .locator("..");
    await expect(unavailableStats.getByText("—", { exact: true })).toBeVisible();
    await expect(unavailableStats.getByText("— SR", { exact: true }).first()).not.toHaveClass(/text-rose/);

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
    await expect(page.getByRole("link", { name: "Color map" })).toHaveAttribute("href", "/guild-color/map?hex=FFFFFF");
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
    await page.setViewportSize({ width: 1707, height: 850 });
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
        bounds!.x + bounds!.width * ((75 - GUILD_COLOR_MAP_A_MIN) / (GUILD_COLOR_MAP_A_MAX - GUILD_COLOR_MAP_A_MIN)),
        bounds!.y + bounds!.height * ((GUILD_COLOR_MAP_B_MAX - 60) / (GUILD_COLOR_MAP_B_MAX - GUILD_COLOR_MAP_B_MIN)),
    );
    await expect(page.getByText("2 guilds share #FF0000")).toBeVisible();
    await expect(page.getByText("Red One [R1]")).toBeVisible();
    await expect(page.getByText("Red Two [R2]")).toBeVisible();
    const inspectedRedOne = page.getByRole("link", { name: /Red One \[R1\].*opens in a new tab/ });
    await expect(inspectedRedOne.locator("..").getByText("Previous S31", { exact: true })).toBeVisible();
    await expect(inspectedRedOne.locator("..").getByText("2", { exact: true })).toBeVisible();
    await expect(inspectedRedOne.locator("..").getByText("Current S32", { exact: true })).toBeVisible();
    await expect(inspectedRedOne.locator("..").getByText("12,340 SR", { exact: true })).toBeVisible();
    await expect(inspectedRedOne).toHaveAttribute(
        "href",
        "https://wynncraft.com/stats/guild/Red%20One",
    );
    const inspectedRedTwo = page.getByRole("link", { name: /Red Two \[R2\].*opens in a new tab/ });
    await expect(inspectedRedTwo.locator("..").getByText("0", { exact: true })).toBeVisible();
    const inspectedHighRating = inspectedRedTwo.locator("..").getByText("15,107,093 SR", { exact: true });
    await expect(inspectedHighRating).toBeVisible();
    expect(await inspectedHighRating.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const inspectedGuildList = page.getByRole("list").filter({ has: inspectedRedOne });
    await expect(inspectedGuildList.getByRole("listitem")).toHaveCount(2);
    await expect(inspectedGuildList.getByRole("listitem").first()).toHaveClass(/bg-muted\/40/);
    await expect(page.getByText(/Registered #FF0000 · ΔE/)).toBeVisible();

    const sliderBounds = await lightness.boundingBox();
    expect(sliderBounds).not.toBeNull();
    await page.mouse.move(sliderBounds!.x + sliderBounds!.width * 0.53, sliderBounds!.y + sliderBounds!.height / 2);
    await page.mouse.down();
    await page.mouse.move(sliderBounds!.x + sliderBounds!.width * 0.35, sliderBounds!.y + sliderBounds!.height / 2, {
        steps: 4,
    });
    const draggedLightness = await lightness.inputValue();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("aria-label", `Guild color claims at Lab lightness ${draggedLightness}`);
    await expect(canvas).toHaveAttribute("width", String(GUILD_COLOR_MAP_PREVIEW_RESOLUTION));
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("width", String(fullResolution));
});

test("jumps directly to a hex on the perceptual color map", async ({ page }) => {
    await page.goto("/guild-color/map?hex=00FF00");

    const jumpInput = page.getByRole("textbox", { name: "Jump to hex" });
    await expect(jumpInput).toHaveValue("#00FF00");
    await expect(page.getByRole("img", { name: "Selected color #00FF00" })).toBeVisible();
    await expect(page.getByText("#00FF00", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to picker" })).toHaveAttribute("href", "/guild-color?hex=00FF00");

    await jumpInput.fill("not-a-color");
    await page.getByRole("button", { name: "Jump" }).click();
    await expect(page.getByText("Use a three- or six-digit hexadecimal color.")).toBeVisible();
    await expect(page).toHaveURL(/hex=00FF00/);
    await expect(page.getByRole("img", { name: "Selected color #00FF00" })).toBeVisible();

    await jumpInput.fill("#0000FF");
    await page.getByRole("button", { name: "Jump" }).click();
    await expect(page).toHaveURL(/hex=0000FF/);
    await expect(page.getByRole("img", { name: "Selected color #0000FF" })).toBeVisible();

    await page.getByRole("slider", { name: "Lightness view" }).fill("50");
    await expect(page.getByRole("img", { name: /Selected color/ })).toHaveCount(0);
    await expect(page).not.toHaveURL(/hex=/);

    await page.goto("/guild-color/map?color=FF0000");
    await expect(page.getByRole("textbox", { name: "Jump to hex" })).toHaveValue("#FF0000");
    await expect(page.getByRole("img", { name: "Selected color #FF0000" })).toBeVisible();
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

test("keeps color verdicts available when activity statistics fail", async ({ page }) => {
    await page.unroute("**/api/guild-color-stats");
    await page.route("**/api/guild-color-stats", async (route) => {
        await route.fulfill({
            status: 502,
            json: { error: "Guild activity statistics are temporarily unavailable." },
        });
    });

    await page.goto("/guild-color?hex=FF0000");
    await expect(page.getByText("Allowed? 🟥 No")).toBeVisible();
    await expect(page.getByRole("link", { name: /Red One \[R1\].*opens in a new tab/ }).first()).toBeVisible();
    await expect(page.getByText("Current S32", { exact: true })).toHaveCount(0);
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
