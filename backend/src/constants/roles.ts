export const roles = ["admin", "user"] as const;
export type Role = (typeof roles)[number];

