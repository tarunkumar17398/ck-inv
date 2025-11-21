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

// Parse price from A{thousands}B{hundreds}C{tens} pattern back to numeric value
export function parsePriceLabel(priceLabel: string): number {
  if (!priceLabel) return 0;
  
  const match = priceLabel.match(/A(\d+)B(\d+)C(\d+)/);
  if (!match) return 0;
  
  const thousands = parseInt(match[1]) * 1000;
  const hundreds = parseInt(match[2]) * 100;
  const tens = parseInt(match[3]) * 10;
  
  return thousands + hundreds + tens;
}

// Clean and format size by adding inch symbol (") after all numbers
export function formatSizeWithInches(size: string | null | undefined): string | null {
  if (!size || !size.trim()) return null;
  
  // First, clean up any existing malformed formatting like 2."5"" or 3.""5""
  let cleaned = size
    .replace(/\."+/g, '.') // Remove quote marks after periods
    .replace(/"+/g, '"')   // Normalize multiple quotes to single
    .replace(/(\d)\."+(\d)/g, '$1.$2') // Fix patterns like 2."5 to 2.5
    .trim();
  
  // Remove all existing inch symbols first
  cleaned = cleaned.replace(/"/g, '');
  
  // Now add inch symbol after each number or decimal number
  return cleaned.replace(/(\d+\.?\d*)/g, '$1"');
}

// Display size - clean up formatting issues for display
export function cleanSizeDisplay(size: string | null | undefined): string {
  if (!size || !size.trim()) return "-";
  
  // Clean up malformed patterns
  let cleaned = size
    .replace(/\."+/g, '.') // Remove quote marks after periods  
    .replace(/"+/g, '"')   // Normalize multiple quotes to single
    .replace(/(\d)\."+(\d)/g, '$1.$2"') // Fix patterns like 2."5 to 2.5"
    .trim();
  
  return cleaned;
}
