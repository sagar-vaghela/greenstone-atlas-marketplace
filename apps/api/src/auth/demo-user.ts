export type DemoUserRole = "buyer" | "seller";
export interface DemoUser { id: string; role: DemoUserRole; displayName: string; }
export const demoUsers = {
  buyer: { id: "demo-buyer", role: "buyer", displayName: "Buyer A" },
  seller: { id: "demo-seller", role: "seller", displayName: "Seller" },
} as const satisfies Record<DemoUserRole, DemoUser>;
// Temporary identity boundary. Commit 15 should replace this with session auth.
export const getCurrentUser = (role: DemoUserRole = "buyer"): DemoUser => demoUsers[role];