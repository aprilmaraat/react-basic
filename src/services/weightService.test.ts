import { getWeights, createWeight, updateWeight, deleteWeight } from './weightService';

jest.mock('./httpClient', () => ({
  httpJson: async (path: string, opts: any) => {
    const method = (opts?.method || 'GET').toUpperCase();
    if (path.startsWith('/weights') && method === 'GET') {
      return [
        { id: 1, name: '355ml (12oz)', description: null },
        { id: 2, name: '500ml', description: 'Medium bottle' },
      ];
    }
    if (path === '/weights' && method === 'POST') {
      const body = JSON.parse(opts.body);
      return { id: 77, name: body.name, description: body.description ?? null };
    }
    if (/^\/weights\//.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const body = JSON.parse(opts.body);
      return { id, name: body.name ?? 'UpdatedWeight', description: body.description ?? null };
    }
    if (/^\/weights\//.test(path) && method === 'DELETE') {
      return { id: Number(path.split('/').pop()), name: 'Deleted', description: null };
    }
    throw new Error('Unhandled mock path/method: ' + path + ' ' + method);
  }
}));

describe('weightService', () => {
  test('list weights', async () => {
    const { data, error } = await getWeights();
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data!.length).toBe(2);
    expect(data![0].name).toBe('355ml (12oz)');
  });
  test('create weight', async () => {
    const { data } = await createWeight({ name: '1L', description: 'Large bottle' });
    expect(data!.id).toBe(77);
    expect(data!.name).toBe('1L');
  });
  test('update weight', async () => {
    const { data } = await updateWeight(2, { name: '500ml Updated' });
    expect(data!.name).toBe('500ml Updated');
  });
  test('delete weight', async () => {
    const { data } = await deleteWeight(2);
    expect(data).toBe(true);
  });
});
