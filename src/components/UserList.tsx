import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService';
import { User } from '../types/User';
import { Table, Typography, Alert, Spin, Space, Button, Modal, Form, Input, Popconfirm, message, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface Props { refreshIntervalMs?: number; }

const UserList: React.FC<Props> = ({ refreshIntervalMs }) => {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

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
      title: 'Full Name',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => (a.full_name || '').localeCompare(b.full_name || ''),
      render: (value: any, record) => value || <Tag color="default">N/A</Tag>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (value: any) => value || '-',
    },
    // createdAt removed per API spec alignment
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, record) => (
        <Space>
          <Button size="small" onClick={() => onEdit(record)}>Edit</Button>
          <Popconfirm title="Delete user?" okButtonProps={{ danger: true }} onConfirm={() => onDelete(record)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const onCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
    // slight delay to ensure modal mounted before focusing
    setTimeout(() => {
      const input: HTMLInputElement | null = document.querySelector('input[name="full_name"]');
      input?.focus();
    }, 50);
  };

  const onEdit = (u: User) => {
    setEditingUser(u);
    form.setFieldsValue({ full_name: u.full_name, email: u.email });
    setModalOpen(true);
  };

  const onDelete = async (u: User) => {
    const { error } = await deleteUser(u.id);
    if (error) {
      message.error(`Delete failed: ${error.message}`);
    } else {
      message.success('User deleted');
      load();
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
  const payload = { ...values, full_name: values.full_name.trim() };
  const { error } = await updateUser(editingUser.id, payload);
        if (error) return message.error(`Update failed: ${error.message}`);
        message.success('User updated');
      } else {
  const payload = { ...values, full_name: values.full_name.trim() };
  const { error } = await createUser(payload);
        if (error) return message.error(`Create failed: ${error.message}`);
        message.success('User created');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      // validation error
    }
  };

  const handleModalCancel = () => {
    setModalOpen(false);
  };

  useEffect(() => {
    load();
    if (refreshIntervalMs) {
      const id = setInterval(load, refreshIntervalMs);
      return () => clearInterval(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshIntervalMs, load]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!debouncedSearch) return users;
    
    const searchLower = debouncedSearch.toLowerCase();
    return users.filter(user => {
      const nameMatch = user.full_name?.toLowerCase().includes(searchLower);
      const emailMatch = user.email?.toLowerCase().includes(searchLower);
      return nameMatch || emailMatch;
    });
  }, [users, debouncedSearch]);

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
          <Input.Search
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
            enterButton
            onSearch={() => setDebouncedSearch(search.trim())}
          />
          <Button onClick={() => load()} disabled={loading} loading={loading}>Refresh</Button>
          <Button type="primary" onClick={onCreate}>New User</Button>
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
        dataSource={filteredUsers}
        loading={loading}
        pagination={{ 
          pageSize: pageSize,
          showSizeChanger: true, 
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          onShowSizeChange: (current, size) => setPageSize(size)
        }}
        locale={{ emptyText: loading ? 'Loading...' : 'No users found' }}
      />
      <Modal
        title={editingUser ? 'Edit User' : 'Create User'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={editingUser ? 'Save' : 'Create'}
      >
        <Form form={form} layout="vertical" initialValues={{ full_name: '', email: '' }}>
          <Form.Item
            name="full_name"
            label="Full Name"
            hasFeedback
            rules={[
              {
                validator: (_, value) => {
                  const v = (value ?? '').toString();
                  if (v.trim().length === 0) return Promise.reject(new Error('Full name required'));
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input autoComplete="off" placeholder="Enter full name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            hasFeedback
            rules={[
              { required: true, message: 'Email required' },
              { type: 'email', message: 'Invalid email format' }
            ]}
          >
            <Input autoComplete="off" placeholder="user@example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserList;
