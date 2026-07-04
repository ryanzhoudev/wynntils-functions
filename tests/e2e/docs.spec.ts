import { expect, test } from "@playwright/test";
import { mockCatalog, readCatalogArtifact } from "./fixtures";

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await mockCatalog(page);
});

test("redesigned docs search and registry-driven badges", async ({ page }) => {
    await page.goto("/");
    const search = page.getByPlaceholder("Find function, alias, type...");
    await search.fill("accessory_durability");

    const card = page
        .getByRole("heading", { name: /^accessory_durability/ })
        .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
    await expect(card).toContainText("IDE validation");
    await expect(card).toContainText("Ring_1");

    const badges = card.locator("div.rounded-md").filter({ hasText: "accessory" }).locator("span");
    await expect(badges).toHaveText(["IDE validation", "String", "required"]);

    await search.fill("from_hex");
    const fromHexCard = page
        .getByRole("heading", { name: /^from_hex/ })
        .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
    await expect(fromHexCard).not.toContainText("IDE validation");
});

test("classic docs use the same semantic registry", async ({ page }) => {
    await page.goto("/old");
    await page.getByPlaceholder("Type your query...").fill("accessory_durability");
    const card = page.getByText(/accessory_durability\(accessory\)/).locator("xpath=ancestor::div[contains(@class,'bg-zinc-800')]");
    await expect(card).toContainText("IDE validation");
    await expect(card).toContainText("String, required");
});

test("refresh replaces and persists the catalog snapshot", async ({ page }) => {
    let requests = 0;
    await page.unroute("**/api/functions");
    await page.route("**/api/functions", async (route) => {
        requests++;
        const catalog = await readCatalogArtifact();
        await route.fulfill({ json: catalog });
    });

    await page.goto("/");
    await expect(page.getByText(/Showing \d+ of \d+ functions/)).toBeVisible();
    await page.getByRole("button", { name: "Refresh data" }).click();
    await expect(page.getByRole("button", { name: "Refreshed" })).toBeVisible();
    expect(requests).toBe(2);

    await page.reload();
    await expect(page.getByText("Cached locally:", { exact: false })).toBeVisible();
});
