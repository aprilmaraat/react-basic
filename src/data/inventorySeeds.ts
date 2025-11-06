// Seed data for Inventory domain
// If later replaced by API responses, this file becomes a fallback/local source.

export const CATEGORY_OPTIONS = [
  'LPG',
  'Butane',
  'Coca-cola',
  'Pepsi Softdrinks',
  'Beer',
] as const;

export const WEIGHT_OPTIONS = [
  '11kg',
  '225g',
  '170g',
  '500ml',
  '355ml (12oz)',
  '235ml (8oz)',
  '1L',
] as const;

export type Category = typeof CATEGORY_OPTIONS[number];
export type Weight = typeof WEIGHT_OPTIONS[number];

export function isValidCategory(value: string): value is Category {
  return (CATEGORY_OPTIONS as readonly string[]).includes(value);
}

export function isValidWeight(value: string): value is Weight {
  return (WEIGHT_OPTIONS as readonly string[]).includes(value);
}
