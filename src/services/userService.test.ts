import { getUsers, clearUsersCache } from './userService';

describe('userService', () => {
  beforeEach(() => {
    clearUsersCache();
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('returns users on success', async () => {
    const mockUsers = [{ id: 1, email: 'alice@example.com', full_name: 'Alice', is_active: true }];
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify(mockUsers)) });
    const { data, error } = await getUsers();
    expect(error).toBeUndefined();
    expect(data).toEqual([{ id: 1, email: 'alice@example.com', full_name: 'Alice', is_active: true }]);
  });

  it('returns error on failure', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error', text: () => Promise.resolve('') });
    const { data, error } = await getUsers();
    expect(data).toBeUndefined();
    expect(error).toBeDefined();
  });
});
