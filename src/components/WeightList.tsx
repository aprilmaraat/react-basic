import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Table, Typography, Alert, Spin, Space, Button, Modal, Form, Input, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getWeights, createWeight, updateWeight, deleteWeight } from '../services/weightService';
import { Weight } from '../types/Weight';

interface Props { refreshIntervalMs?: number }

const { Title } = Typography;

const WeightList: React.FC<Props> = ({ refreshIntervalMs }) => {
  const [weights, setWeights] = useState<Weight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Weight | null>(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getWeights();
    if (error) setError(error.message); else { setWeights(data || []); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (refreshIntervalMs) { const id = setInterval(load, refreshIntervalMs); return () => clearInterval(id); } }, [refreshIntervalMs, load]);

  const columns: ColumnsType<Weight> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a,b) => a.name.localeCompare(b.name) },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v: any) => v || '-' },
    { title: 'Actions', key: 'actions', width: 160, render: (_: any, record) => (
      <Space>
        <Button size="small" onClick={() => onEdit(record)}>Edit</Button>
        <Popconfirm title="Delete weight?" okButtonProps={{ danger: true }} onConfirm={() => onDelete(record)}>
          <Button size="small" danger>Delete</Button>
        </Popconfirm>
      </Space>
    ) }
  ];

  const onCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const onEdit = (w: Weight) => { setEditing(w); form.setFieldsValue({ name: w.name, description: w.description || '' }); setModalOpen(true); };
  const onDelete = async (w: Weight) => {
    const { error } = await deleteWeight(w.id);
    if (error) message.error(`Delete failed: ${error.message}`); else { message.success('Weight deleted'); load(); }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        const { error } = await updateWeight(editing.id, { name: values.name, description: values.description || null });
        if (error) return message.error(`Update failed: ${error.message}`);
        message.success('Weight updated');
      } else {
        const { error } = await createWeight({ name: values.name, description: values.description || null });
        if (error) return message.error(`Create failed: ${error.message}`);
        message.success('Weight created');
      }
      setModalOpen(false);
      load();
    } catch (e) { /* validation handled */ }
  };

  const handleModalCancel = () => setModalOpen(false);

  const filteredWeights = useMemo(() => {
    if (!weights) return [];
    if (!debouncedSearch) return weights;
    
    const searchLower = debouncedSearch.toLowerCase();
    return weights.filter(weight => {
      const nameMatch = weight.name?.toLowerCase().includes(searchLower);
      const descMatch = weight.description?.toLowerCase().includes(searchLower);
      return nameMatch || descMatch;
    });
  }, [weights, debouncedSearch]);

  if (!weights && loading) return <Spin tip="Loading weights..." />;

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>Weights</Title>
        <Space>
          <Input.Search
            placeholder="Search weights..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
            enterButton
            onSearch={() => setDebouncedSearch(search.trim())}
          />
          <Button onClick={() => load()} disabled={loading} loading={loading}>Refresh</Button>
          <Button type="primary" onClick={onCreate}>New Weight</Button>
        </Space>
      </Space>
      {error && <Alert type="error" showIcon message="Failed to load weights" description={<Space><span>{error}</span><Button size="small" onClick={() => load()}>Retry</Button></Space>} style={{ marginBottom: 12 }} />}
      <Table<Weight>
        size="middle"
        bordered
        rowKey={r => r.id.toString()}
        columns={columns}
        dataSource={filteredWeights}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: loading ? 'Loading...' : 'No weights found' }}
      />
      <Modal title={editing ? 'Edit Weight' : 'Create Weight'} open={modalOpen} onOk={handleModalOk} onCancel={handleModalCancel} okText={editing ? 'Save' : 'Create'} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ name: '', description: '' }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: 'Name required' },
              { validator: (_, v) => (typeof v === 'string' && v.trim().length === 0 ? Promise.reject(new Error('Name required')) : Promise.resolve()) },
            ]}
          >
            <Input autoComplete="off" allowClear placeholder="Weight name" />
          </Form.Item>
          <Form.Item name="description" label="Description"> <Input.TextArea rows={3} allowClear placeholder="Optional description" /> </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WeightList;
