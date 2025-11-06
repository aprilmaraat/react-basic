import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
// Mock itemService to return immediate data to bypass spinner waiting complexities
jest.mock('./services/itemService', () => ({
  getItems: async () => ({ data: [{ id: 1, name: 'Sample Item', category: 'Test', purchasePrice: 1, sellingPrice: 2, quantity: 3 }] }),
  // Provide CRUD placeholders to satisfy component imports
  createItem: async () => ({ data: { id: 2, name: 'New', category: 'Test', purchasePrice: 1, sellingPrice: 2, quantity: 3 } }),
  updateItem: async () => ({ data: { id: 1, name: 'Sample Item Updated', category: 'Test', purchasePrice: 1, sellingPrice: 2, quantity: 3 } }),
  deleteItem: async () => ({ data: true })
}));

// Ant Design components use window.matchMedia; polyfill for jsdom test env
beforeAll(() => {
  if (!window.matchMedia) {
    // minimal mock
    window.matchMedia = (query: string): any => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
});

test('renders Monthly Expense Analytics by default', async () => {
  render(<App />);
  const matches = await screen.findAllByText(/Monthly Expense Analytics/i);
  expect(matches.length).toBeGreaterThan(0);
});
