import { test, expect } from "@playwright/test";
test("mobile and keyboard organizer flow, copy, stable reveal, hide and nested refresh", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "secrecy" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByLabel("Admin password").fill("browser-test-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Create a list" }).click();
  await page.getByLabel("List title").fill("Browser Christmas");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Short message").fill("A merry test");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Gift budget").fill("R300");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Participant names").fill("Alice\nBob\nCarol");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Giver", { exact: true }).selectOption("Alice");
  await page.getByLabel("Cannot draw", { exact: true }).selectOption("Carol");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate draw", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Personal invitations" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/[a-f0-9-]{36}$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Personal invitations" }),
  ).toBeVisible();
  await page
    .locator(".invitation")
    .filter({ has: page.getByLabel("Alice’s personal link") })
    .getByRole("button", { name: "Copy link", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Personal link copied.");
  const link = await page.getByLabel("Alice’s personal link").inputValue();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(link);
  await expect(page.getByText("Hello, Alice.")).toBeVisible();
  await page.getByRole("button", { name: "Reveal my person" }).click();
  await expect(
    page.getByRole("heading", { name: "Bob", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".confetti")).toBeVisible();
  await page.getByRole("button", { name: "Hide name" }).click();
  await expect(
    page.getByRole("button", { name: "Reveal my person" }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Bob", exact: true }),
  ).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.getByRole("button", { name: "Reveal my person" }).click();
  await expect(
    page.getByRole("heading", { name: "Bob", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".confetti")).toHaveCount(0);
  await page.goto("/s/invalid");
  await expect(page.getByRole("alert")).toContainText("Link not found");
});
