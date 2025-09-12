export type Stage = "quotation" | "design" | "print" | "delivery" | "delivered";
export type Role = "sales" | "designer" | "production" | "delivery";

export const NEXT: Record<Stage, { next: Stage; role: Role } | null> = {
  quotation: { next: "design", role: "designer" },   // Sales → Designer
  design:    { next: "print",  role: "production" }, // Designer → Production
  print:     { next: "delivery", role: "delivery" }, // Production → Delivery
  delivery:  { next: "delivered", role: "delivery" },
  delivered: null
};
