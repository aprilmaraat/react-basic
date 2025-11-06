import { createTransaction, deleteTransaction, getTransactionById } from './transactionService';
import * as itemService from './itemService';

// Mock the itemService module
jest.mock('./itemService');

// Simple mock fetch utility
function mockFetchOnce(response: { ok?: boolean; status?: number; statusText?: string; body?: any }) {
  // @ts-ignore
  global.fetch = jest.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    text: () => Promise.resolve(response.body !== undefined ? JSON.stringify(response.body) : ''),
  });
}

describe('transactionService CRUD', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn();
    // Mock itemService functions
    (itemService.getInventoryById as jest.Mock).mockResolvedValue({
      data: { id: 1, name: 'Test Item', quantity: 100, category_id: 1, weight_id: 1 }
    });
    (itemService.updateInventory as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('creates a transaction without inventory', async () => {
    const mock = { id: 99, title: 'Test', amount_per_unit: '5.00', quantity: 2, total_amount: '10.00', transaction_type: 'expense', owner_id: 1, date: '2025-10-21' };
    mockFetchOnce({ body: mock });
    const { data, error } = await createTransaction({ title: 'Test', owner_id: 1, amount_per_unit: 5, quantity: 2, transaction_type: 'expense', date: '2025-10-21' });
    expect(error).toBeUndefined();
    expect(data?.title).toBe('Test');
    expect(data?.id).toBe(99);
    expect(data?.transaction_type).toBe('expense');
    expect(data?.owner_id).toBe(1);
    expect(data?.total_amount).toBe('10.00');
    expect(itemService.getInventoryById).not.toHaveBeenCalled();
  });

  it('creates a transaction with inventory (expense type)', async () => {
    const mock = { id: 99, title: 'Test', amount_per_unit: '5.00', quantity: 10, total_amount: '50.00', transaction_type: 'expense', owner_id: 1, date: '2025-10-21', inventory_id: 1 };
    mockFetchOnce({ body: mock });
    const { data, error } = await createTransaction({ 
      title: 'Test', 
      owner_id: 1, 
      amount_per_unit: 5, 
      quantity: 10, 
      transaction_type: 'expense', 
      date: '2025-10-21',
      inventory_id: 1
    });
    expect(error).toBeUndefined();
    expect(data?.title).toBe('Test');
    expect(itemService.getInventoryById).toHaveBeenCalledWith(1);
    expect(itemService.updateInventory).toHaveBeenCalledWith(1, expect.objectContaining({ quantity: 110 })); // 100 + 10
  });

  it('creates a transaction with inventory (earning type)', async () => {
    const mock = { id: 100, title: 'Sale', amount_per_unit: '15.50', quantity: 5, total_amount: '77.50', transaction_type: 'earning', owner_id: 1, date: '2025-10-21', inventory_id: 1 };
    mockFetchOnce({ body: mock });
    const { data, error } = await createTransaction({ 
      title: 'Sale', 
      owner_id: 1, 
      amount_per_unit: 15.50, 
      quantity: 5, 
      transaction_type: 'earning', 
      date: '2025-10-21',
      inventory_id: 1
    });
    expect(error).toBeUndefined();
    expect(data?.title).toBe('Sale');
    expect(itemService.getInventoryById).toHaveBeenCalledWith(1);
    expect(itemService.updateInventory).toHaveBeenCalledWith(1, expect.objectContaining({ quantity: 95 })); // 100 - 5
  });

  it('fails to create transaction when insufficient inventory', async () => {
    (itemService.getInventoryById as jest.Mock).mockResolvedValue({
      data: { id: 1, name: 'Test Item', quantity: 3, category_id: 1, weight_id: 1 }
    });
    const { data, error } = await createTransaction({ 
      title: 'Sale', 
      owner_id: 1, 
      amount_per_unit: 15.50, 
      quantity: 10, 
      transaction_type: 'earning', 
      date: '2025-10-21',
      inventory_id: 1
    });
    expect(data).toBeUndefined();
    expect(error).toBeDefined();
    expect(error?.message).toContain('Insufficient inventory');
  });

  it('deletes a transaction without inventory (success)', async () => {
    mockFetchOnce({ body: { id: 123, title: 'Test', transaction_type: 'capital', owner_id: 1, amount_per_unit: '10.00', quantity: 1, total_amount: '10.00', date: '2025-10-21' } });
    const { data, error } = await deleteTransaction(123);
    expect(error).toBeUndefined();
    expect(data).toBe(true);
  });

  it('deletes a transaction with inventory and reverses the change', async () => {
    // First mock the GET to fetch existing transaction
    mockFetchOnce({ body: { id: 123, title: 'Test', transaction_type: 'expense', owner_id: 1, amount_per_unit: '10.00', quantity: 5, total_amount: '50.00', date: '2025-10-21', inventory_id: 1 } });
    
    // Create new fetch mock for DELETE
    const { data, error } = await deleteTransaction(123);
    
    expect(itemService.getInventoryById).toHaveBeenCalledWith(1);
    expect(itemService.updateInventory).toHaveBeenCalledWith(1, expect.objectContaining({ quantity: 95 })); // 100 - 5 (reverse of expense)
  });

  it('delete transaction returns error on failure', async () => {
    mockFetchOnce({ ok: false, status: 500, statusText: 'Internal Server Error', body: {} });
    const { data, error } = await deleteTransaction(456);
    expect(data).toBeUndefined();
    expect(error).toBeDefined();
  });
});
