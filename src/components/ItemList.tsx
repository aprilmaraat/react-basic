import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Typography, Alert, Spin, Space, Button, Select, Input, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getItems } from '../services/itemService';
import { getUsers } from '../services/userService';
import { Item } from '../types/Item';
import { User } from '../types/User';

const { Title } = Typography;
const { Option } = Select;

interface Props { refreshIntervalMs?: number; }

const ItemList: React.FC<Props> = ({ refreshIntervalMs }) => {
  const [items, setItems] = useState<Item[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | number | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const loadUsers = useCallback(async () => {
    const { data } = await getUsers();
    if (data) setUsers(data);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getItems({ userId: userFilter ?? undefined, search: debouncedSearch || undefined });
    if (error) {
      setError(error.message);
    } else {
      setItems(data || []);
      setError(null);
    }
    console.log("Data", data);
    setLoading(false);
  }, [userFilter, debouncedSearch]);

  // Initial loads & interval
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => {
    if (refreshIntervalMs) {
      const id = setInterval(loadItems, refreshIntervalMs);
      return () => clearInterval(id);
    }
  }, [refreshIntervalMs, loadItems]);

  // Fast lookup map for users by id
  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach(u => m.set(String(u.id), u));
    return m;
  }, [users]);

  const columns: ColumnsType<Item> = useMemo(() => [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
      render: (value: any) => value || '-',
    },
    {
      title: 'Owner (Username)',
      dataIndex: 'userId',
      key: 'owner',
      width: 180,
      render: (_: any, record) => {
        const u = userMap.get(String(record.userId));
        // Priority: username from users table, fallback to name, then denormalized ownerName, else Unknown
        return u?.username || u?.name || record.ownerName || <Tag>Unknown</Tag>;
      },
      sorter: (a, b) => {
        const ua = userMap.get(String(a.userId));
        const ub = userMap.get(String(b.userId));
        return (ua?.username || '').localeCompare(ub?.username || '');
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value: any) => value || '-',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: (value: any) => {
        if (!value) return '-';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '-';
        return <span title={d.toLocaleString()}>{d.toLocaleDateString()}</span>;
      },
      sorter: (a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return at - bt;
      },
      defaultSortOrder: 'descend'
    }
  ], [userMap]);

  if (!items && loading) {
    return <Spin tip="Loading items..." />;
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }} wrap>
        <Title level={3} style={{ margin: 0 }}>Items</Title>
        <Space wrap>
          <Input.Search
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
            enterButton
            onSearch={() => setDebouncedSearch(search.trim())}
          />
          <Select
            allowClear
            placeholder="Filter by user"
            value={userFilter !== null ? userFilter : undefined}
            style={{ width: 200 }}
            onChange={(val) => setUserFilter(val ?? null)}
            loading={!users.length}
            optionFilterProp="children"
            showSearch
            filterOption={(input, option) => {
              if (!option) return false; // guard against undefined option
              const label: string = typeof option?.children === 'string'
                ? option.children
                : (Array.isArray(option?.children)
                  ? option.children.filter(c => typeof c === 'string').join(' ')
                  : '');
              return (label || '').toLowerCase().includes(input.toLowerCase());
            }}
          >
            {users.map(u => (
              <Option key={u.id} value={u.id}>{u.username || u.name}</Option>
            ))}
          </Select>
          <Button onClick={() => loadItems()} disabled={loading} loading={loading}>Refresh</Button>
        </Space>
      </Space>
      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load items"
          description={<Space><span>{error}</span><Button size="small" onClick={() => loadItems()}>Retry</Button></Space>}
          style={{ marginBottom: 12 }}
        />
      )}
      <Table<Item>
        size="middle"
        bordered
        rowKey={r => r.id.toString()}
        columns={columns}
        dataSource={items || []}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: loading ? 'Loading...' : 'No items found' }}
      />
    </div>
  );
};

export default ItemList;
