import React from 'react';
import { render, screen } from '@testing-library/react';
import WeightList from './WeightList';

jest.mock('../services/weightService', () => ({
  getWeights: async () => ({ data: [{ id: 1, name: '500ml', description: 'Medium bottle' }] }),
  createWeight: async () => ({ data: { id: 2, name: '1L', description: 'Large bottle' } }),
  updateWeight: async () => ({ data: { id: 1, name: '500ml Updated', description: 'Medium bottle' } }),
  deleteWeight: async () => ({ data: true }),
}));

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query: string): any => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false });
  }
});

test('renders Weights header', async () => {
  render(<WeightList />);
  expect(await screen.findByText(/Weights/i)).toBeInTheDocument();
});
