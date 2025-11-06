import type { Inventory } from './Item';
import { CATEGORY_OPTIONS, WEIGHT_OPTIONS, isValidCategory, isValidWeight } from '../data/inventorySeeds';

describe('Inventory seed constants', () => {
  test('categories are as expected', () => {
    expect(CATEGORY_OPTIONS).toEqual([
      'LPG',
      'Butane',
      'Coca-cola',
      'Pepsi Softdrinks',
      'Beer',
    ]);
  });
  test('weights are as expected', () => {
    expect(WEIGHT_OPTIONS).toEqual([
      '11kg',
      '225g',
      '170g',
      '500ml',
      '355ml (12oz)',
      '235ml (8oz)',
      '1L',
    ]);
  });
  test('type guards work', () => {
    expect(isValidCategory('LPG')).toBe(true);
    expect(isValidCategory('InvalidCat')).toBe(false);
    expect(isValidWeight('500ml')).toBe(true);
    expect(isValidWeight('999ml')).toBe(false);
  });
});

describe('Inventory interface (sample object)', () => {
  test('sample inventory record matches expected fields', () => {
    const inv: Inventory = {
      id: 101,
      name: 'Coca-cola 355ml',
      quantity: 120,
      category_id: 3,
      weight_id: 5,
      categoryName: 'Coca-cola',
      weightName: '355ml (12oz)'
    };
    expect(inv.name).toMatch(/Coca-cola/);
    expect(inv.quantity).toBeGreaterThan(0);
  });
});
