import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Typography, Alert, Spin, Space, Button, Select, Input, InputNumber, Tag, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getTransactions, searchTransactions, createTransaction, updateTransaction, deleteTransaction } from '../services/transactionService';
import { getUsers } from '../services/userService';
import { Transaction } from '../types/Transaction';
import { getInventory } from '../services/itemService';
import { User } from '../types/User';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

interface Props { refreshIntervalMs?: number; }

interface EditableTransaction {
  id?: number;
  title: string;
  owner_id?: number;
  transaction_type: 'expense' | 'earning' | 'capital';
  amount_per_unit?: number;
  quantity?: number | string;
  date?: string;
  inventory_id?: number;
  description?: string;
  purchase_price?: number;
}

const TransactionList: React.FC<Props> = ({ refreshIntervalMs }) => {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<number | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingData, setEditingData] = useState<EditableTransaction | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const loadUsers = useCallback(async () => {
    const { data } = await getUsers();
    if (data) setUsers(data);
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      const { data: inv } = await getInventory({});
      if (inv) {
        console.log('[TransactionList] Loaded inventory items:', inv.length, inv);
        setInventory(inv);
      }
    } catch (e) {
      console.error('[TransactionList] Failed to load metadata:', e);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    // Use search endpoint when filters or search applied; else list
    let resp;
    if (userFilter != null || debouncedSearch || typeFilter || inventoryFilter != null) {
      resp = await searchTransactions({
        owner_id: userFilter ?? null,
        q: debouncedSearch || null,
        transaction_type: typeFilter as any || null,
        inventory_id: inventoryFilter ?? null,
      });
    } else {
      resp = await getTransactions({});
    }
    const { data, error } = resp;
    if (error) {
      setError(error.message);
    } else {
      setTransactions(data || []);
      setError(null);
    }
    setLoading(false);
  }, [userFilter, debouncedSearch, typeFilter, inventoryFilter]);

  // Initial loads & interval
  useEffect(() => { loadUsers(); loadMeta(); }, [loadUsers, loadMeta]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);
  useEffect(() => {
    if (refreshIntervalMs) {
      const id = setInterval(loadTransactions, refreshIntervalMs);
      return () => clearInterval(id);
    }
  }, [refreshIntervalMs, loadTransactions]);

  const isEditing = (record: Transaction | EditableTransaction) => {
    const key = record.id ? record.id.toString() : 'new';
    return editingKey === key;
  };

  const startEdit = (record: Transaction) => {
    setEditingKey(record.id.toString());
    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:MM)
    let dateValue = record.date;
    if (dateValue) {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        dateValue = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
    }
    setEditingData({
      id: record.id,
      title: record.title,
      owner_id: record.owner_id,
      transaction_type: record.transaction_type,
      amount_per_unit: typeof record.amount_per_unit === 'string' ? parseFloat(record.amount_per_unit) : record.amount_per_unit,
      quantity: record.quantity,
      date: dateValue,
      inventory_id: record.inventory_id ?? undefined,
      description: record.description ?? undefined,
      purchase_price: record.purchase_price ? (typeof record.purchase_price === 'string' ? parseFloat(record.purchase_price) : record.purchase_price) : undefined,
    });
  };

  const cancelEdit = () => {
    setEditingKey('');
    setEditingData(null);
    if (isAdding) {
      setIsAdding(false);
    }
  };

  const validateData = (data: EditableTransaction): boolean => {
    const qtyNum = typeof data.quantity === 'string' ? parseFloat(data.quantity) : data.quantity;
    return !!(
      data.title &&
      data.title.trim().length > 0 &&
      data.owner_id != null &&
      data.transaction_type &&
      data.amount_per_unit != null &&
      data.amount_per_unit >= 0 &&
      data.quantity != null &&
      !isNaN(qtyNum!) &&
      qtyNum! >= 0 &&
      data.date
    );
  };

  const saveEdit = async () => {
    if (!editingData || !validateData(editingData)) {
      message.error('Please fill all required fields correctly');
      return;
    }

    try {
      const qtyValue = typeof editingData.quantity === 'string' 
        ? parseFloat(editingData.quantity) 
        : editingData.quantity!;
      
      // Convert datetime-local format to ISO 8601
      let dateValue = editingData.date;
      if (dateValue) {
        // datetime-local gives us "YYYY-MM-DDTHH:MM", convert to ISO 8601
        const d = new Date(dateValue);
        if (!isNaN(d.getTime())) {
          dateValue = d.toISOString();
        }
      }
        
      const payload: any = {
        title: editingData.title.trim(),
        owner_id: editingData.owner_id!,
        transaction_type: editingData.transaction_type,
        amount_per_unit: Number(editingData.amount_per_unit),
        quantity: qtyValue,
        date: dateValue,
        description: editingData.description || null,
        purchase_price: editingData.purchase_price != null ? Number(editingData.purchase_price) : null,
      };

      if (editingData.inventory_id != null && editingData.inventory_id !== undefined) {
        payload.inventory_id = editingData.inventory_id;
      }

      if (editingData.id) {
        // Update existing transaction
        const { error } = await updateTransaction(editingData.id, payload);
        if (error) {
          message.error(`Update failed: ${error.message}`);
          return;
        }
        if (payload.inventory_id) {
          message.success('Transaction updated and inventory adjusted');
        } else {
          message.success('Transaction updated');
        }
      } else {
        // Create new transaction
        const { error } = await createTransaction(payload);
        if (error) {
          message.error(`Create failed: ${error.message}`);
          return;
        }
        if (payload.inventory_id) {
          message.success('Transaction created and inventory updated');
        } else {
          message.success('Transaction created');
        }
        setIsAdding(false);
      }

      setEditingKey('');
      setEditingData(null);
      loadTransactions();
    } catch (e: any) {
      message.error('Operation failed');
    }
  };

  const updateEditingData = (field: keyof EditableTransaction, value: any) => {
    setEditingData(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Fast lookup map for users by id
  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach(u => m.set(String(u.id), u));
    return m;
  }, [users]);

  const columns: ColumnsType<Transaction> = useMemo(() => [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
      render: (value: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <Input
              value={editingData?.title || ''}
              onChange={e => updateEditingData('title', e.target.value)}
              placeholder="Transaction title"
              autoFocus
            />
          );
        }
        return value || '-';
      },
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      width: 140,
      filters: [
        { text: 'Expense', value: 'expense' },
        { text: 'Earning', value: 'earning' },
        { text: 'Capital', value: 'capital' },
      ],
      onFilter: (val, record) => record.transaction_type === val,
      sorter: (a, b) => a.transaction_type.localeCompare(b.transaction_type),
      render: (v: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <Select
              value={editingData?.transaction_type}
              onChange={val => updateEditingData('transaction_type', val)}
              style={{ width: '100%' }}
            >
              <Option value="expense">Expense</Option>
              <Option value="earning">Earning</Option>
              <Option value="capital">Capital</Option>
            </Select>
          );
        }
        return v || '-';
      },
    },
    {
      title: 'Amount/Unit',
      dataIndex: 'amount_per_unit',
      key: 'amount_per_unit',
      align: 'right',
      width: 130,
      render: (_: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <InputNumber
              value={editingData?.amount_per_unit}
              onChange={val => updateEditingData('amount_per_unit', val)}
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          );
        }
        const val = typeof record.amount_per_unit === 'string' ? parseFloat(record.amount_per_unit) : record.amount_per_unit;
        return val != null && !isNaN(Number(val)) ? Number(val).toFixed(2) : '-';
      },
      sorter: (a, b) => {
        const aVal = typeof a.amount_per_unit === 'string' ? parseFloat(a.amount_per_unit) : (a.amount_per_unit || 0);
        const bVal = typeof b.amount_per_unit === 'string' ? parseFloat(b.amount_per_unit) : (b.amount_per_unit || 0);
        return aVal - bVal;
      },
    },
    {
      title: 'Purchase Price',
      dataIndex: 'purchase_price',
      key: 'purchase_price',
      align: 'right',
      width: 140,
      render: (_: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <InputNumber
              value={editingData?.purchase_price}
              onChange={val => updateEditingData('purchase_price', val)}
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          );
        }
        if (!record.purchase_price) return '-';
        const val = typeof record.purchase_price === 'string' ? parseFloat(record.purchase_price) : record.purchase_price;
        return val != null && !isNaN(Number(val)) ? Number(val).toFixed(2) : '-';
      },
      sorter: (a, b) => {
        const aVal = a.purchase_price ? (typeof a.purchase_price === 'string' ? parseFloat(a.purchase_price) : a.purchase_price) : 0;
        const bVal = b.purchase_price ? (typeof b.purchase_price === 'string' ? parseFloat(b.purchase_price) : b.purchase_price) : 0;
        return aVal - bVal;
      },
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 100,
      render: (_: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <InputNumber
              value={editingData?.quantity}
              onChange={val => updateEditingData('quantity', val)}
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          );
        }
        const qtyNum = typeof record.quantity === 'string' ? parseFloat(record.quantity) : record.quantity;
        return !isNaN(qtyNum) ? qtyNum.toFixed(2) : '-';
      },
      sorter: (a, b) => {
        const aQty = typeof a.quantity === 'string' ? parseFloat(a.quantity) : (a.quantity || 0);
        const bQty = typeof b.quantity === 'string' ? parseFloat(b.quantity) : (b.quantity || 0);
        return aQty - bQty;
      },
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      width: 120,
      render: (_: any, record: Transaction) => {
        if (isEditing(record)) {
          const qtyNum = typeof editingData?.quantity === 'string' 
            ? parseFloat(editingData.quantity) 
            : (editingData?.quantity || 0);
          const total = (editingData?.amount_per_unit || 0) * qtyNum;
          return total.toFixed(2);
        }
        const val = typeof record.total_amount === 'string' ? parseFloat(record.total_amount) : record.total_amount;
        return val != null && !isNaN(Number(val)) ? Number(val).toFixed(2) : '-';
      },
      sorter: (a, b) => {
        const aVal = typeof a.total_amount === 'string' ? parseFloat(a.total_amount) : (a.total_amount || 0);
        const bVal = typeof b.total_amount === 'string' ? parseFloat(b.total_amount) : (b.total_amount || 0);
        return aVal - bVal;
      },
    },
    {
      title: 'Owner',
      dataIndex: 'owner_id',
      key: 'owner_id',
      width: 180,
      render: (_: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <Select
              value={editingData?.owner_id}
              onChange={val => updateEditingData('owner_id', val)}
              placeholder="Select owner"
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {users.map(u => <Option key={u.id} value={u.id}>{u.full_name || u.email}</Option>)}
            </Select>
          );
        }
        const u = userMap.get(String(record.owner_id));
        return u?.full_name || u?.email || record.ownerFullName || <Tag>Unknown</Tag>;
      },
      sorter: (a, b) => {
        const ua = userMap.get(String(a.owner_id));
        const ub = userMap.get(String(b.owner_id));
        return (ua?.full_name || '').localeCompare(ub?.full_name || '');
      }
    },
    {
      title: 'Inventory',
      dataIndex: 'inventory_id',
      key: 'inventory_id',
      width: 160,
      render: (_: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <Select
              value={editingData?.inventory_id}
              onChange={val => updateEditingData('inventory_id', val)}
              placeholder="Select inventory"
              showSearch
              optionFilterProp="children"
              allowClear
              style={{ width: '100%' }}
            >
              {inventory.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
            </Select>
          );
        }
        if (record.inventory_id == null) return '-';
        const it = inventory.find(i => i.id === record.inventory_id);
        return it?.name || record.inventoryName || record.inventory_id;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <Input.TextArea
              value={editingData?.description || ''}
              onChange={e => updateEditingData('description', e.target.value)}
              placeholder="Description"
              rows={1}
              style={{ width: '100%' }}
            />
          );
        }
        return value || '-';
      },
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 180,
      render: (value: any, record: Transaction) => {
        if (isEditing(record)) {
          return (
            <Input
              type="datetime-local"
              value={editingData?.date || ''}
              onChange={e => updateEditingData('date', e.target.value)}
              style={{ width: '100%' }}
            />
          );
        }
        if (!value) return '-';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '-';
        return (
          <span title={d.toLocaleString()}>
            {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
      sorter: (a, b) => {
        const at = a.date ? new Date(a.date).getTime() : 0;
        const bt = b.date ? new Date(b.date).getTime() : 0;
        return at - bt;
      },
      defaultSortOrder: 'descend'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_: any, record: Transaction) => {
        const editable = isEditing(record);
        if (editable) {
          const isValid = editingData && validateData(editingData);
          return (
            <Space>
              {isValid && (
                <Button
                  size="small"
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={saveEdit}
                >
                  Save
                </Button>
              )}
              <Button size="small" onClick={cancelEdit} icon={<CloseOutlined />}>
                Cancel
              </Button>
            </Space>
          );
        }
        return (
          <Space>
            <Button size="small" onClick={() => startEdit(record)} disabled={editingKey !== ''}>
              Edit
            </Button>
            <Popconfirm
              title="Delete transaction?"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(record)}
              disabled={editingKey !== ''}
            >
              <Button size="small" danger disabled={editingKey !== ''}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ], [userMap, users, inventory, editingKey, editingData]);

  const onCreate = () => {
    if (editingKey !== '') {
      message.warning('Please save or cancel the current edit first');
      return;
    }
    setIsAdding(true);
    setEditingKey('new');
    const now = new Date();
    const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditingData({
      title: '',
      owner_id: undefined,
      transaction_type: 'expense',
      amount_per_unit: undefined,
      quantity: 1,
      date: localDatetime,
      inventory_id: undefined,
      description: '',
      purchase_price: undefined,
    });
  };

  const onDelete = async (t: Transaction) => {
    const { error } = await deleteTransaction(t.id);
    if (error) {
      message.error(`Delete failed: ${error.message}`);
    } else {
      if (t.inventory_id) {
        message.success('Transaction deleted and inventory adjusted');
      } else {
        message.success('Transaction deleted');
      }
      loadTransactions();
    }
  };

  const filteredTransactions = transactions || [];

  // Prepare data source with new row if adding
  const dataSource = useMemo(() => {
    const filtered = filteredTransactions;
    if (isAdding && editingKey === 'new') {
      const newRow: any = {
        id: 'new',
        title: editingData?.title || '',
        owner_id: editingData?.owner_id,
        transaction_type: editingData?.transaction_type || 'expense',
        amount_per_unit: editingData?.amount_per_unit,
        quantity: editingData?.quantity,
        date: editingData?.date,
        inventory_id: editingData?.inventory_id,
        description: editingData?.description,
        purchase_price: editingData?.purchase_price,
      };
      return [newRow, ...filtered];
    }
    return filtered;
  }, [filteredTransactions, isAdding, editingKey, editingData]);

  if (!transactions && loading) {
    return <Spin tip="Loading transactions..." />;
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }} wrap>
        <Title level={3} style={{ margin: 0 }}>Transactions</Title>
        <Space wrap>
          <Input.Search
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
            enterButton
            onSearch={() => setDebouncedSearch(search.trim())}
          />
          <Select allowClear placeholder="Filter by user" value={userFilter ?? undefined} style={{ width: 180 }} onChange={v => setUserFilter(v ?? null)} showSearch>
            {users.map(u => <Option key={u.id} value={u.id}>{u.full_name || u.email}</Option>)}
          </Select>
          <Select allowClear placeholder="Type" value={typeFilter || undefined} style={{ width: 160 }} onChange={v => setTypeFilter(v || null)}>
            <Option value="expense">Expense</Option>
            <Option value="earning">Earning</Option>
            <Option value="capital">Capital</Option>
          </Select>
          <Select allowClear placeholder="Inventory" value={inventoryFilter ?? undefined} style={{ width: 180 }} onChange={v => setInventoryFilter(v ?? null)} showSearch>
            {inventory.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
          </Select>
          <Button onClick={() => loadTransactions()} disabled={loading || editingKey !== ''} loading={loading}>Refresh</Button>
          <Button type="primary" onClick={onCreate} disabled={editingKey !== ''}>New Transaction</Button>
        </Space>
      </Space>
      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load transactions"
          description={<Space><span>{error}</span><Button size="small" onClick={() => loadTransactions()}>Retry</Button></Space>}
          style={{ marginBottom: 12 }}
        />
      )}
      <Table<Transaction>
        size="middle"
        bordered
        rowKey={r => r.id?.toString() || 'new'}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={{ 
          pageSize: pageSize,
          showSizeChanger: true, 
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          onShowSizeChange: (current, size) => setPageSize(size)
        }}
        locale={{ emptyText: loading ? 'Loading...' : 'No transactions found' }}
      />
    </div>
  );
};

export default TransactionList;