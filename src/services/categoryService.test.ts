import { getCategories, createCategory, updateCategory, deleteCategory } from './categoryService';

jest.mock('./httpClient', () => ({
  httpJson: async (path: string, opts: any) => {
    const method = (opts?.method || 'GET').toUpperCase();
    if (path.startsWith('/categories') && method === 'GET') {
      return [
        { id: 1, name: 'Coca-cola', description: 'Softdrink' },
        { id: 2, name: 'Pepsi Softdrinks', description: null },
      ];
    }
    if (path === '/categories' && method === 'POST') {
      const body = JSON.parse(opts.body);
      return { id: 99, name: body.name, description: body.description ?? null };
    }
    if (/^\/categories\//.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const body = JSON.parse(opts.body);
      return { id, name: body.name ?? 'UpdatedCat', description: body.description ?? null };
    }
    if (/^\/categories\//.test(path) && method === 'DELETE') {
      return { id: Number(path.split('/').pop()), name: 'Deleted', description: null };
    }
    throw new Error('Unhandled mock path/method: ' + path + ' ' + method);
  }
}));

describe('categoryService', () => {
  test('list categories', async () => {
    const { data, error } = await getCategories();
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data!.length).toBe(2);
    expect(data![0].name).toBe('Coca-cola');
  });
  test('create category', async () => {
    const { data } = await createCategory({ name: 'Beer', description: 'Alcoholic' });
    expect(data!.id).toBe(99);
    expect(data!.name).toBe('Beer');
  });
  test('update category', async () => {
    const { data } = await updateCategory(1, { name: 'Coca-cola Updated' });
    expect(data!.name).toBe('Coca-cola Updated');
  });
  test('delete category', async () => {
    const { data } = await deleteCategory(1);
    expect(data).toBe(true);
  });
});
