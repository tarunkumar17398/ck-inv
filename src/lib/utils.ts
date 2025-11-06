import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format price in A{thousands}B{hundreds}C{tens} pattern
export function formatPriceLabel(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '';
  
  const rounded = Math.round(numPrice);
  const thousands = Math.floor(rounded / 1000);
  const hundreds = Math.floor((rounded % 1000) / 100);
  const tens = Math.floor((rounded % 100) / 10);
  
  return `A${thousands}B${hundreds}C${tens}`;
}

// Format weight in CKBR{6-digit-padded-grams} pattern
export function formatWeightLabel(weight: number | string): string {
  const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
  if (isNaN(numWeight)) return '';
  
  const grams = Math.round(numWeight);
  const paddedGrams = grams.toString().padStart(6, '0');
  
  return `CKBR${paddedGrams}`;
}
