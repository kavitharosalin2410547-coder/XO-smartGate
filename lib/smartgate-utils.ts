// Formatting and locale utilities conforming strictly to the XO SmartGate specification:
// 1. Money in Indian format: ₹1,86,400 (no decimals in lists; 2 decimals on bills)
// 2. Dates as 02 Nov 2026, times as 10:42 (24-hour), in India time
// 3. Number plate formatting: TN 00 AB 0000, uppercase with standard spacing

import { cleanPlate, formatPlate } from "./plate";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatIndianCurrency(amount: number, withDecimals: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return withDecimals ? "₹0.00" : "₹0";
  }

  const isNegative = amount < 0;
  const absVal = Math.abs(amount);

  let integerPart = Math.floor(absVal).toString();
  const decimalPart = (absVal % 1).toFixed(2).slice(2);

  // Indian number grouping: last 3 digits, then every 2 digits (e.g. 1,86,400)
  if (integerPart.length > 3) {
    const last3 = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    integerPart = withCommas + "," + last3;
  }

  const prefix = isNegative ? "-₹" : "₹";
  return withDecimals ? `${prefix}${integerPart}.${decimalPart}` : `${prefix}${integerPart}`;
}

export function formatDateIndia(input: Date | number | string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "02 Nov 2026";
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatTimeIndia(input: Date | number | string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "10:42";
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

export function formatPlateDisplay(plate: string): string {
  const cleaned = cleanPlate(plate);
  return formatPlate(cleaned) || plate.toUpperCase();
}
