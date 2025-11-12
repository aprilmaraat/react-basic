import React, { useEffect, useState, useCallback } from 'react';
import { Typography, Alert, Spin, Card, Space, Button, Select } from 'antd';
import { getInventory } from '../services/itemService';
import { Inventory } from '../types/Item';
import { getCategories } from '../services/categoryService';
import { getWeights } from '../services/weightService';

const { Title } = Typography;
const { Option } = Select;

interface Props {
  refreshIntervalMs?: number;
}

const InventoryGraph: React.FC<Props> = ({ refreshIntervalMs }) => {
  const [items, setItems] = useState<Inventory[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [weights, setWeights] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [weightFilter, setWeightFilter] = useState<number | null>(null);
  const [chartLib, setChartLib] = useState<any>(null);

  // Load categories & weights
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
      // silently ignore
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getInventory({});
    if (error) {
      setError(error.message);
    } else {
      setItems(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMeta();
    loadItems();
  }, [loadMeta, loadItems]);

  useEffect(() => {
    if (refreshIntervalMs) {
      const id = setInterval(loadItems, refreshIntervalMs);
      return () => clearInterval(id);
    }
  }, [refreshIntervalMs, loadItems]);

  // Lazy load chart library
  useEffect(() => {
    import('@ant-design/plots')
      .then((lib) => setChartLib(lib))
      .catch((err) => console.error('Failed to load chart library:', err));
  }, []);

  if (!items && loading) {
    return <Spin tip="Loading inventory data..." />;
  }

  if (!chartLib) {
    return <Spin tip="Loading chart library..." />;
  }

  // Filter items
  const filteredItems = (items || []).filter(item => {
    if (categoryFilter != null && item.category_id !== categoryFilter) return false;
    if (weightFilter != null && item.weight_id !== weightFilter) return false;
    return true;
  });

  // Prepare data for bar chart
  const chartData = filteredItems.map(item => {
    const categoryName = categories.find(c => c.id === item.category_id)?.name || item.categoryName || 'Unknown';
    const weightName = weights.find(w => w.id === item.weight_id)?.name || item.weightName || 'Unknown';
    
    // Parse quantity to number for chart
    const qtyNum = typeof item.quantity === 'string' ? parseFloat(item.quantity) : (item.quantity || 0);
    
    return {
      name: item.name,
      quantity: isNaN(qtyNum) ? 0 : qtyNum,
      category: categoryName,
      weight: weightName,
      fullName: item.name,
    };
  }).sort((a, b) => b.quantity - a.quantity); // Sort by quantity descending

  const { Column } = chartLib;

  const config = {
    data: chartData,
    xField: 'name',
    yField: 'quantity',
    label: {
      position: 'top' as const,
      style: {
        fill: '#000000',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoRotate: false,
        autoHide: false,
        autoEllipsis: true,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: 'Quantity',
          value: `${datum.quantity} units\nCategory: ${datum.category}\nWeight: ${datum.weight}\nFull Name: ${datum.fullName}`,
        };
      },
    },
    meta: {
      name: {
        alias: 'Item',
      },
      quantity: {
        alias: 'Quantity',
      },
    },
    colorField: 'category',
    legend: {
      position: 'top' as const,
    },
    height: 500,
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={3} style={{ margin: 0 }}>Inventory Quantity Tracking</Title>
        <Space wrap>
          <Select 
            allowClear 
            placeholder="Filter by category" 
            value={categoryFilter ?? undefined} 
            style={{ width: 180 }} 
            onChange={v => setCategoryFilter(v ?? null)}
            showSearch
            optionFilterProp="children"
          >
            {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>
          <Select 
            allowClear 
            placeholder="Filter by weight" 
            value={weightFilter ?? undefined} 
            style={{ width: 180 }} 
            onChange={v => setWeightFilter(v ?? null)}
            showSearch
            optionFilterProp="children"
          >
            {weights.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
          </Select>
          <Button onClick={() => loadItems()} disabled={loading} loading={loading}>
            Refresh
          </Button>
        </Space>
      </Space>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load inventory data"
          description={
            <Space>
              <span>{error}</span>
              <Button size="small" onClick={() => loadItems()}>
                Retry
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Typography.Text type="secondary">
              No inventory data available. Add some inventory items to see the chart.
            </Typography.Text>
          </div>
        ) : (
          <>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Showing quantity for {chartData.length} item{chartData.length !== 1 ? 's' : ''}
            </Typography.Paragraph>
            <Column {...config} />
          </>
        )}
      </Card>
    </div>
  );
};

export default InventoryGraph;
