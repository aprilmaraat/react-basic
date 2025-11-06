import { getInventory, getInventoryById, createInventory, updateInventory, deleteInventory } from './itemService';

// Mock http client for inventory endpoints
const mockInventory = [
  {
    id: 1,
    name: 'Coca-cola 355ml',
    quantity: 120,
    category_id: 3,
    weight_id: 5,
    category_name: 'Coca-cola',
    weight_name: '355ml (12oz)'
  },
  {
    id: 2,
    name: 'Pepsi 500ml',
    quantity: 75,
    category_id: 4,
    weight_id: 4,
    category_name: 'Pepsi Softdrinks',
    weight_name: '500ml'
  }
];

jest.mock('./httpClient', () => ({
  httpJson: async (path: string, opts: any) => {
    const method = (opts?.method || 'GET').toUpperCase();
    if (path.startsWith('/inventory') && method === 'GET') {
      // Check if it's a specific ID request
      if (/^\/inventory\/\d+$/.test(path)) {
        const id = Number(path.split('/').pop());
        const item = mockInventory.find(i => i.id === id);
        if (!item) throw new Error('Not found');
        return item;
      }
      return mockInventory;
    }
    if (path === '/inventory' && method === 'POST') {
      const body = JSON.parse(opts.body);
      return { id: 99, ...body };
    }
    if (/^\/inventory\//.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const body = JSON.parse(opts.body);
      return { id, name: 'Updated', quantity: 1, category_id: 1, weight_id: 1, ...body };
    }
    if (/^\/inventory\//.test(path) && method === 'DELETE') {
      return {}; // ignored
    }
    throw new Error('Unhandled mock path/method: ' + path + ' ' + method);
  }
}));

describe('inventory service', () => {
  test('getInventory normalizes records', async () => {
    const { data, error } = await getInventory();
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data!.length).toBe(2);
    const first = data![0];
    expect(first.name).toBe('Coca-Cola 330ml');
    expect(first.quantity).toBe(25);
    expect(first.categoryName).toBe('Coca-cola');
    expect(first.weightName).toBe('355ml (12oz)');
  });

  test('getInventoryById returns single record', async () => {
    const { data, error } = await getInventoryById(1);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data!.id).toBe(1);
    expect(data!.name).toBe('Coca-cola 355ml');
    expect(data!.quantity).toBe(120);
  });

  test('createInventory returns normalized record', async () => {
    const { data, error } = await createInventory({ name: 'Sprite 330ml', quantity: 50, category_id: 3, weight_id: 4 });
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data!.id).toBe(99);
    expect(data!.name).toBe('Sprite 330ml');
  });

  test('updateInventory returns updated record', async () => {
    const { data, error } = await updateInventory(1, { name: 'Coca-cola 500ml', quantity: 130 });
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data!.id).toBe(1);
    expect(data!.name).toBe('Coca-cola 500ml');
    expect(data!.quantity).toBe(130);
  });

  test('deleteInventory returns success flag', async () => {
    const { data, error } = await deleteInventory(1);
    expect(error).toBeUndefined();
    expect(data).toBe(true);
  });
});
