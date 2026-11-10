import type { Units } from "./types";

const LB_PER_KG = 2.2046226218;
const KM_PER_MI = 1.609344;

export const weightUnit = (u: Units) => (u === "IMPERIAL" ? "lb" : "kg");
export const distanceUnit = (u: Units) => (u === "IMPERIAL" ? "mi" : "km");

/** kg -> display number in the user's unit. */
export function toDisplayWeight(kg: number, u: Units) {
  const v = u === "IMPERIAL" ? kg * LB_PER_KG : kg;
  return Math.round(v * 10) / 10;
}
export function fromDisplayWeight(value: number, u: Units) {
  return u === "IMPERIAL" ? value / LB_PER_KG : value;
}
export function formatWeight(kg: number | null | undefined, u: Units) {
  if (kg == null) return "-";
  return `${toDisplayWeight(kg, u)} ${weightUnit(u)}`;
}

export function toDisplayDistance(km: number, u: Units) {
  const v = u === "IMPERIAL" ? km / KM_PER_MI : km;
  return Math.round(v * 100) / 100;
}
export function fromDisplayDistance(value: number, u: Units) {
  return u === "IMPERIAL" ? value * KM_PER_MI : value;
}
export function formatDistance(km: number | null | undefined, u: Units) {
  if (km == null) return "-";
  return `${toDisplayDistance(km, u)} ${distanceUnit(u)}`;
}

export function cmToFeetInches(cm: number) {
  const totalIn = Math.round(cm / 2.54);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}
export function feetInchesToCm(ft: number, inch: number) {
  return (ft * 12 + inch) * 2.54;
}
export function formatHeight(cm: number | null, u: Units) {
  if (cm == null) return "-";
  if (u === "METRIC") return `${Math.round(cm)} cm`;
  const { ft, inch } = cmToFeetInches(cm);
  return `${ft}′${inch}″`;
}

export function formatDuration(sec: number | null | undefined) {
  if (!sec) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m && s) return `${m}m ${s}s`;
  if (m) return `${m} min`;
  return `${s}s`;
}

/** "0:45", "12:05" style clock for timers. */
export function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Compact volume like "12.4k lb". */
export function formatVolume(kg: number, u: Units) {
  const v = toDisplayWeight(kg, u);
  const s = v >= 10000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`;
  return `${s} ${weightUnit(u)}`;
}
