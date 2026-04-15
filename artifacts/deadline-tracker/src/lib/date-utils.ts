import { differenceInDays, differenceInHours, differenceInMinutes, isPast } from "date-fns";

export function formatCountdown(dateStr: string): { text: string; color: "green" | "yellow" | "red" | "muted" } {
  const target = new Date(dateStr);
  const now = new Date();

  if (isPast(target)) {
    return { text: "OVERDUE", color: "red" };
  }

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;

  let text = "";
  if (days > 0) text += `${days}d `;
  if (hours > 0 || days > 0) text += `${hours}h `;
  text += `${minutes}m left`;

  let color: "green" | "yellow" | "red" = "green";
  if (days < 1) {
    color = "red";
  } else if (days <= 3) {
    color = "yellow";
  }

  return { text, color };
}
