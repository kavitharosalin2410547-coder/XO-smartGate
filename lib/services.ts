// Garage services offered. Edit this list to change names and default prices.
export const CURRENCY = "₹";

export const SERVICE_PRESETS: { name: string; price: number }[] = [
  { name: "Basic Water Wash", price: 200 },
  { name: "Foam Wash", price: 350 },
  { name: "Interior Vacuum", price: 150 },
  { name: "Underbody Wash", price: 300 },
  { name: "Engine Bay Wash", price: 400 },
];

export type JobStatus = "pending" | "in_progress" | "done";

export const STATUS_LABEL: Record<JobStatus, string> = {
  pending: "Waiting",
  in_progress: "Washing",
  done: "Done",
};

export function money(n: number): string {
  return `${CURRENCY}${n.toLocaleString("en-IN")}`;
}
