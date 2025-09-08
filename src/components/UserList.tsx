import React, { useEffect, useState, useCallback } from 'react';
import { getUsers } from '../services/userService';
import { User } from '../types/User';
import { Table, Typography, Alert, Spin, Space, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface Props { refreshIntervalMs?: number; }

const UserList: React.FC<Props> = ({ refreshIntervalMs }) => {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getUsers();
    if (error) {
      setError(error.message);
    } else {
      setUsers(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  const columns: ColumnsType<User> = [
    // {
    //   title: 'ID',
    //   dataIndex: 'id',
    //   key: 'id',
    //   width: 90,
    //   sorter: (a, b) => `${a.id}`.localeCompare(`${b.id}`),
    // },
    // {
    //   title: 'Name',
    //   dataIndex: 'name',
    //   key: 'name',
    //   ellipsis: true,
    //   sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    // },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: 160,
      render: (value: any) => value || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (value: any) => value || '-',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 210,
      render: (value: any) => value ? new Date(value).toLocaleString() : '-',
      sorter: (a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return at - bt;
      },
      defaultSortOrder: 'descend',
    },
  ];

  useEffect(() => {
    load();
    if (refreshIntervalMs) {
      const id = setInterval(load, refreshIntervalMs);
      return () => clearInterval(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshIntervalMs, load]);

  if (!users && loading) {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Spin tip="Loading users..." />
      </Space>
    );
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Users</Typography.Title>
        <Space>
          <Button onClick={() => load()} disabled={loading} loading={loading}>
            Refresh
          </Button>
        </Space>
      </Space>
      {error && (
        <Alert
          type="error"
          showIcon
            message="Failed to load users"
            description={
              <Space>
                <span>{error}</span>
                <Button size="small" onClick={() => load()}>Retry</Button>
              </Space>
            }
          style={{ marginBottom: 12 }}
        />
      )}
      <Table<User>
        size="middle"
        bordered
        rowKey={record => record.id.toString()}
        columns={columns}
        dataSource={users || []}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: loading ? 'Loading...' : 'No users found' }}
      />
    </div>
  );
};

export default UserList;
