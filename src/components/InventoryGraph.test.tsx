import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import InventoryGraph from './InventoryGraph';
import * as itemService from '../services/itemService';
import * as categoryService from '../services/categoryService';
import * as weightService from '../services/weightService';

// Mock the services
jest.mock('../services/itemService');
jest.mock('../services/categoryService');
jest.mock('../services/weightService');

// Mock the @ant-design/plots module
jest.mock('@ant-design/plots', () => ({
  Column: () => <div data-testid="column-chart">Column Chart</div>,
}));

describe('InventoryGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Inventory Quantity Tracking header', async () => {
    (itemService.getInventory as jest.Mock).mockResolvedValue({ data: [] });
    (categoryService.getCategories as jest.Mock).mockResolvedValue({ data: [] });
    (weightService.getWeights as jest.Mock).mockResolvedValue({ data: [] });

    render(<InventoryGraph />);
    
    await waitFor(() => {
      expect(screen.getByText(/Inventory Quantity Tracking/i)).toBeInTheDocument();
    });
  });

  test('displays empty state when no inventory data', async () => {
    (itemService.getInventory as jest.Mock).mockResolvedValue({ data: [] });
    (categoryService.getCategories as jest.Mock).mockResolvedValue({ data: [] });
    (weightService.getWeights as jest.Mock).mockResolvedValue({ data: [] });

    render(<InventoryGraph />);
    
    await waitFor(() => {
      expect(screen.getByText(/No inventory data available/i)).toBeInTheDocument();
    });
  });

  test('displays chart when inventory data is available', async () => {
    const mockInventory = [
      { id: 1, name: 'Item 1', quantity: 10, category_id: 1, weight_id: 1 },
      { id: 2, name: 'Item 2', quantity: 20, category_id: 1, weight_id: 1 },
    ];
    const mockCategories = [{ id: 1, name: 'Category 1' }];
    const mockWeights = [{ id: 1, name: 'Weight 1' }];

    (itemService.getInventory as jest.Mock).mockResolvedValue({ data: mockInventory });
    (categoryService.getCategories as jest.Mock).mockResolvedValue({ data: mockCategories });
    (weightService.getWeights as jest.Mock).mockResolvedValue({ data: mockWeights });

    render(<InventoryGraph />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing quantity for 2 items/i)).toBeInTheDocument();
    });
  });
});
