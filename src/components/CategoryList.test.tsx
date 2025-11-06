import React from 'react';
import { render, screen } from '@testing-library/react';
import CategoryList from './CategoryList';

jest.mock('../services/categoryService', () => ({
  getCategories: async () => ({ data: [{ id: 1, name: 'Coca-cola', description: 'Softdrink' }] }),
  createCategory: async () => ({ data: { id: 2, name: 'NewCat', description: null } }),
  updateCategory: async () => ({ data: { id: 1, name: 'UpdatedCat', description: 'Softdrink' } }),
  deleteCategory: async () => ({ data: true }),
}));

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query: string): any => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false });
  }
});

test('renders Categories header', async () => {
  render(<CategoryList />);
  expect(await screen.findByText(/Categories/i)).toBeInTheDocument();
});
