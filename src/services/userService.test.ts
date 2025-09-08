import { getUsers, clearUsersCache } from './userService';

describe('userService', () => {
  beforeEach(() => {
    clearUsersCache();
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('returns users on success', async () => {
    const mockUsers = [{ id: 1, name: 'Alice' }];
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify(mockUsers)) });
    const { data, error } = await getUsers(true);
    expect(error).toBeUndefined();
    expect(data).toEqual(mockUsers);
  });

  it('returns error on failure', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error', text: () => Promise.resolve('') });
    const { data, error } = await getUsers(true);
    expect(data).toBeUndefined();
    expect(error).toBeDefined();
  });
});
