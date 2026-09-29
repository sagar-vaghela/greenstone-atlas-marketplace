export type DemoUserRole = "buyer" | "seller";
export const demoUsers = {
  buyer: { id: "demo-buyer", displayName: "Buyer A" },
  seller: { id: "demo-seller", displayName: "Seller" },
} as const;
// Temporary demo identity until Commit 15 adds real authentication.
export const getCurrentUser = (role: DemoUserRole) => demoUsers[role];