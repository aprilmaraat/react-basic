import { createUser, updateUser, deleteUser } from './userService';

function mockFetchOnce(response: { ok?: boolean; status?: number; statusText?: string; body?: any }) {
  // @ts-ignore
  global.fetch = jest.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    text: () => Promise.resolve(response.body !== undefined ? JSON.stringify(response.body) : ''),
  });
}

describe('userService CRUD', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('creates a user', async () => {
    const mock = { id: 5, email: 'carol@example.com', full_name: 'Carol', is_active: true };
    mockFetchOnce({ body: mock });
    const { data, error } = await createUser({ email: 'carol@example.com', full_name: 'Carol', is_active: true });
    expect(error).toBeUndefined();
    expect(data?.full_name).toBe('Carol');
    expect(data?.email).toBe('carol@example.com');
  });

  it('updates a user', async () => {
    const mock = { id: 5, email: 'carol@example.com', full_name: 'Carol Updated', is_active: true };
    mockFetchOnce({ body: mock });
    const { data, error } = await updateUser(5, { full_name: 'Carol Updated' });
    expect(error).toBeUndefined();
    expect(data?.full_name).toBe('Carol Updated');
    expect(data?.email).toBe('carol@example.com');
  });

  it('delete user failure returns error', async () => {
    mockFetchOnce({ ok: false, status: 404, statusText: 'Not Found', body: {} });
    const { data, error } = await deleteUser(999);
    expect(data).toBeUndefined();
    expect(error).toBeDefined();
  });
});
