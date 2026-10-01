import { expect, type Page } from "@playwright/test";

export const seededUsers = {
  buyer: { email: "buyer@example.com", password: "buyer123" },
  seller: { email: "seller@example.com", password: "seller123" },
} as const;

export async function signIn(page: Page, role: keyof typeof seededUsers) {
  const user = seededUsers[role];
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login(?:$|\?)/);
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login/);
}
