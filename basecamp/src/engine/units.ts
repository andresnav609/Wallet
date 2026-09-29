import type { Units } from '../types';

export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}
export function kgToLb(kg: number): number {
  return kg / 0.45359237;
}
export function inToCm(inches: number): number {
  return inches * 2.54;
}
export function cmToIn(cm: number): number {
  return cm / 2.54;
}

export function formatWeight(lb: number, units: Units, digits = 1): string {
  return units === 'metric' ? `${lbToKg(lb).toFixed(digits)} kg` : `${lb.toFixed(digits)} lb`;
}

export function formatLength(inches: number, units: Units, digits = 1): string {
  return units === 'metric' ? `${inToCm(inches).toFixed(digits)} cm` : `${inches.toFixed(digits)} in`;
}

export function formatHeight(inches: number, units: Units): string {
  if (units === 'metric') return `${Math.round(inToCm(inches))} cm`;
  const ft = Math.floor(inches / 12);
  return `${ft}'${Math.round(inches - ft * 12)}"`;
}

export function weightUnit(units: Units): string {
  return units === 'metric' ? 'kg' : 'lb';
}
export function lengthUnit(units: Units): string {
  return units === 'metric' ? 'cm' : 'in';
}

/** Convert a user-entered weight in display units to stored pounds. */
export function toLb(value: number, units: Units): number {
  return units === 'metric' ? kgToLb(value) : value;
}
export function toIn(value: number, units: Units): number {
  return units === 'metric' ? cmToIn(value) : value;
}
export function fromLb(lb: number, units: Units): number {
  return units === 'metric' ? lbToKg(lb) : lb;
}
export function fromIn(inches: number, units: Units): number {
  return units === 'metric' ? inToCm(inches) : inches;
}

export function bmi(lb: number, heightIn: number): number {
  const kg = lbToKg(lb);
  const m = inToCm(heightIn) / 100;
  return kg / (m * m);
}
