import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Typography, Alert, Spin, Space, Button, Select, Input, InputNumber, Tag, message, Popconfirm, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getInventory, createInventory, updateInventory, deleteInventory } from '../services/itemService';
import { Inventory } from '../types/Item';
import { getCategories } from '../services/categoryService';
import { getWeights } from '../services/weightService';
import { CloseOutlined, SaveOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

interface Props { 
  refreshIntervalMs?: number;
  onInventoryChange?: () => void;
}

interface EditableItem {
  id?: number;
  name: string;
  category_id?: number;
  weight_id?: number;
  quantity?: number | string;
}

const InventoryList: React.FC<Props> = ({ refreshIntervalMs, onInventoryChange }) => {
  const [items, setItems] = useState<Inventory[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [weightFilter, setWeightFilter] = useState<number | null>(null);
  const [categories, setCategories] = useState<any[]>([]); // expect objects {id,name}
  const [weights, setWeights] = useState<any[]>([]);       // expect objects {id,name}
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingData, setEditingData] = useState<EditableItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [showThresholdInput, setShowThresholdInput] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const loadItems = useCallback(async () => {
    // NOTE: debouncedSearch currently not sent to backend; if API adds search, include it here.
    setLoading(true);
    const { data, error } = await getInventory({});
    if (error) setError(error.message); else { setItems(data || []); setError(null); }
    setLoading(false);
    
    // Notify parent component about inventory change
    if (onInventoryChange) {
      onInventoryChange();
    }
  }, [onInventoryChange]); // no external dependencies

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => {
    if (refreshIntervalMs) {
      const id = setInterval(loadItems, refreshIntervalMs);
      return () => clearInterval(id);
    }
  }, [refreshIntervalMs, loadItems]);

  const isEditing = useCallback((record: Inventory | EditableItem) => {
    const key = record.id ? record.id.toString() : 'new';
    return editingKey === key;
  }, [editingKey]);

  const startEdit = (record: Inventory) => {
    setEditingKey(record.id.toString());
    setEditingData({
      id: record.id,
      name: record.name,
      category_id: record.category_id,
      weight_id: record.weight_id,
      quantity: record.quantity,
    });
  };

  const cancelEdit = useCallback(() => {
    setEditingKey('');
    setEditingData(null);
    if (isAdding) {
      setIsAdding(false);
    }
  }, [isAdding]);

  const validateData = (data: EditableItem): boolean => {
    if (!data.quantity) return false;
    const qtyNum = typeof data.quantity === 'string' ? parseFloat(data.quantity) : data.quantity;
    return !!(
      data.name &&
      data.name.trim().length > 0 &&
      data.category_id != null &&
      data.weight_id != null &&
      !isNaN(qtyNum) &&
      qtyNum >= 0
    );
  };

  const saveEdit = useCallback(async () => {
    if (!editingData || !validateData(editingData)) {
      message.error('Please fill all required fields correctly');
      return;
    }

    try {
      const qtyValue = typeof editingData.quantity === 'string' 
        ? parseFloat(editingData.quantity) 
        : editingData.quantity!;
        
      const payload = {
        name: editingData.name.trim(),
        quantity: qtyValue,
        category_id: editingData.category_id!,
        weight_id: editingData.weight_id!,
      };

      if (editingData.id) {
        // Update existing item
        const { error } = await updateInventory(editingData.id, payload);
        if (error) {
          message.error(`Update failed: ${error.message}`);
          return;
        }
        message.success('Item updated');
      } else {
        // Create new item
        const { error } = await createInventory(payload);
        if (error) {
          message.error(`Create failed: ${error.message}`);
          return;
        }
        message.success('Item created');
        setIsAdding(false);
      }

      setEditingKey('');
      setEditingData(null);
      loadItems();
    } catch (e: any) {
      message.error('Operation failed');
    }
  }, [editingData, loadItems]);

  const updateEditingData = (field: keyof EditableItem, value: any) => {
    setEditingData(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Check if item is low stock
  const isLowStock = useCallback((quantity: number | string | undefined): boolean => {
    if (quantity === undefined || quantity === null) return false;
    const qtyNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    return !isNaN(qtyNum) && qtyNum <= lowStockThreshold;
  }, [lowStockThreshold]);

  // Check if item is out of stock
  const isOutOfStock = useCallback((quantity: number | string | undefined): boolean => {
    if (quantity === undefined || quantity === null) return true;
    const qtyNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    return !isNaN(qtyNum) && qtyNum === 0;
  }, []);

  // Edit handler (stable)
  const onEdit = useCallback((it: Inventory) => {
    startEdit(it);
  }, []);

  // Delete handler (stable)
  const onDelete = useCallback(async (it: Inventory) => {
    const { error } = await deleteInventory(it.id);
    if (error) {
      message.error(`Delete failed: ${error.message}`);
    } else {
      message.success('Item deleted');
      loadItems();
    }
  }, [loadItems]);

  const columns: ColumnsType<Inventory> = useMemo(() => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (value: any, record: Inventory) => {
        if (isEditing(record)) {
          return (
            <Input
              value={editingData?.name || ''}
              onChange={e => updateEditingData('name', e.target.value)}
              placeholder="Item name"
              autoFocus
            />
          );
        }
        const lowStock = isLowStock(record.quantity);
        const outOfStock = isOutOfStock(record.quantity);
        const textColor = outOfStock ? '#ff4d4f' : lowStock ? '#faad14' : undefined;
        const icon = outOfStock ? (
          <Tooltip title="Out of stock">
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
          </Tooltip>
        ) : lowStock ? (
          <Tooltip title={`Low stock (≤${lowStockThreshold})`}>
            <WarningOutlined style={{ color: '#faad14', marginRight: 6 }} />
          </Tooltip>
        ) : null;
        
        return (
          <span style={{ color: textColor, fontWeight: lowStock ? 600 : 'normal' }}>
            {icon}
            {value || '-'}
          </span>
        );
      },
    },
    {
      title: 'Category',
      dataIndex: 'category_id',
      key: 'category_id',
      width: 160,
      filters: categories.map(c => ({ text: c.name, value: c.id })),
      onFilter: (val, rec) => rec.category_id === val,
      sorter: (a, b) => (a.categoryName || '').localeCompare(b.categoryName || ''),
      render: (_: any, record: Inventory) => {
        if (isEditing(record)) {
          return (
            <Select
              value={editingData?.category_id}
              onChange={val => updateEditingData('category_id', val)}
              placeholder="Select category"
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {categories.map(c => <Option key={String(c.id)} value={c.id}>{c.name}</Option>)}
            </Select>
          );
        }
        const cat = categories.find(c => c.id === record.category_id);
        return cat?.name || record.categoryName || <Tag>Uncategorized</Tag>;
      },
    },
    {
      title: 'Weight',
      dataIndex: 'weight_id',
      key: 'weight_id',
      width: 150,
      filters: weights.map(w => ({ text: w.name, value: w.id })),
      onFilter: (val, rec) => rec.weight_id === val,
      sorter: (a, b) => (a.weightName || '').localeCompare(b.weightName || ''),
      render: (_: any, record: Inventory) => {
        if (isEditing(record)) {
          return (
            <Select
              value={editingData?.weight_id}
              onChange={val => updateEditingData('weight_id', val)}
              placeholder="Select weight"
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {weights.map(w => <Option key={String(w.id)} value={w.id}>{w.name}</Option>)}
            </Select>
          );
        }
        const w = weights.find(w => w.id === record.weight_id);
        return w?.name || record.weightName || <Tag>-</Tag>;
      },
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 120,
      render: (v: any, record: Inventory) => {
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
        // Display as number with proper formatting
        const qtyNum = typeof v === 'string' ? parseFloat(v) : v;
        const lowStock = isLowStock(v);
        const outOfStock = isOutOfStock(v);
        const textColor = outOfStock ? '#ff4d4f' : lowStock ? '#faad14' : undefined;
        
        return (
          <span style={{ color: textColor, fontWeight: lowStock ? 600 : 'normal' }}>
            {!isNaN(qtyNum) ? qtyNum.toFixed(2) : '-'}
          </span>
        );
      },
      sorter: (a, b) => {
        const aQty = typeof a.quantity === 'string' ? parseFloat(a.quantity) : (a.quantity || 0);
        const bQty = typeof b.quantity === 'string' ? parseFloat(b.quantity) : (b.quantity || 0);
        return aQty - bQty;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_: any, record: Inventory) => {
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
            <Button size="small" onClick={() => onEdit(record)} disabled={editingKey !== ''}>
              Edit
            </Button>
            <Popconfirm
              title="Delete item?"
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
  ], [categories, weights, editingKey, editingData, isEditing, cancelEdit, saveEdit, onEdit, onDelete, lowStockThreshold, isLowStock, isOutOfStock]);

  // Load categories & weights (ensure objects with id & name). If service returns array of objects it's fine; if strings, map to objects with generated id = index.
  const loadMeta = useCallback(async () => {
    try {
      const [{ data: catData }, { data: weightData }] = await Promise.all([
        getCategories(),
        getWeights(),
      ]);
      if (catData && catData.length) {
        setCategories(catData.map((c: any) => ({ id: c.id ?? c.category_id ?? c.name, name: c.name || c.category_name || String(c) })));
      }
      if (weightData && weightData.length) {
        setWeights(weightData.map((w: any) => ({ id: w.id ?? w.weight_id ?? w.name, name: w.name || w.weight_name || String(w) })));
      }
    } catch (e) {
      // silently ignore; dropdowns will be empty until API works
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  const filteredItems = useMemo(() => {
    if (!items) return [] as Inventory[];
    return items.filter(it => {
      if (categoryFilter != null && it.category_id !== categoryFilter) return false;
      if (weightFilter != null && it.weight_id !== weightFilter) return false;
      if (debouncedSearch) {
        const tokens = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean);
        const haystack = [it.name, it.categoryName, it.weightName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!tokens.every(t => haystack.includes(t))) return false;
      }
      return true;
    });
  }, [items, debouncedSearch, categoryFilter, weightFilter]);

  const onCreate = () => {
    if (editingKey !== '') {
      message.warning('Please save or cancel the current edit first');
      return;
    }
    setIsAdding(true);
    setEditingKey('new');
    setEditingData({
      name: '',
      category_id: undefined,
      weight_id: undefined,
      quantity: undefined,
    });
  };

  // Prepare data source with new row if adding
  const dataSource = useMemo(() => {
    const filtered = filteredItems;
    if (isAdding && editingKey === 'new') {
      const newRow: any = {
        id: 'new',
        name: editingData?.name || '',
        category_id: editingData?.category_id,
        weight_id: editingData?.weight_id,
        quantity: editingData?.quantity,
      };
      return [newRow, ...filtered];
    }
    return filtered;
  }, [filteredItems, isAdding, editingKey, editingData]);

  if (!items && loading) {
    return <Spin tip="Loading inventory..." />;
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }} wrap>
        <Title level={3} style={{ margin: 0 }}>Inventory</Title>
        <Space wrap>
          <Input.Search
            placeholder="Search inventory..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
            enterButton
            onSearch={() => setDebouncedSearch(search.trim())}
          />
          <Select allowClear placeholder="Filter by category" value={categoryFilter ?? undefined} style={{ width: 180 }} onChange={v => setCategoryFilter(v ?? null)} showSearch optionFilterProp="children">
            {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>
          <Select allowClear placeholder="Filter by weight" value={weightFilter ?? undefined} style={{ width: 180 }} onChange={v => setWeightFilter(v ?? null)} showSearch optionFilterProp="children">
            {weights.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
          </Select>
          <Button onClick={() => loadItems()} disabled={loading || editingKey !== ''} loading={loading}>Refresh</Button>
          <Button type="primary" onClick={onCreate} disabled={editingKey !== ''}>New Item</Button>
        </Space>
      </Space>
      
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space>
          <Tooltip title="Set the quantity threshold for low stock warning">
            <Button 
              size="small" 
              icon={<WarningOutlined />}
              onClick={() => setShowThresholdInput(!showThresholdInput)}
            >
              Low Stock Alert: {lowStockThreshold}
            </Button>
          </Tooltip>
          {showThresholdInput && (
            <InputNumber
              size="small"
              min={0}
              max={100}
              value={lowStockThreshold}
              onChange={(val) => setLowStockThreshold(val ?? 3)}
              style={{ width: 100 }}
              addonAfter={
                <CloseOutlined 
                  onClick={() => setShowThresholdInput(false)} 
                  style={{ cursor: 'pointer' }} 
                />
              }
            />
          )}
        </Space>
        <Space size="small">
          <Tag icon={<ExclamationCircleOutlined />} color="error">Out of Stock (0)</Tag>
          <Tag icon={<WarningOutlined />} color="warning">Low Stock (≤{lowStockThreshold})</Tag>
        </Space>
      </Space>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load inventory"
          description={<Space><span>{error}</span><Button size="small" onClick={() => loadItems()}>Retry</Button></Space>}
          style={{ marginBottom: 12 }}
        />
      )}
      <Table<Inventory>
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
        locale={{ emptyText: loading ? 'Loading...' : 'No inventory found' }}
      />
    </div>
  );
};

export default InventoryList;
