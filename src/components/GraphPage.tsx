import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, DatePicker, Select, Space, Typography, Alert, Spin, Statistic, Row, Col, Tag } from 'antd';
import type { Item } from '../types/Item';
import type { User } from '../types/User';
import { getItems } from '../services/itemService';
import { getUsers } from '../services/userService';
import dayjs, { Dayjs } from 'dayjs';

// Lazy load @ant-design/plots Column chart to avoid hard dependency if package not installed yet.
// This keeps the build from breaking until the user installs the library.
type ColumnChartProps = { data: any[]; xField: string; yField: string; seriesField?: string; [k: string]: any };
type ColumnChartComponent = React.ComponentType<ColumnChartProps>;

const DynamicColumn: React.FC<ColumnChartProps> = (props) => {
  const [{ Comp, error, loading }, setState] = useState<{ Comp: ColumnChartComponent | null; error: Error | null; loading: boolean }>({ Comp: null, error: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    import('@ant-design/plots')
      .then(mod => {
        if (!cancelled) setState({ Comp: (mod as any).Column, error: null, loading: false });
      })
      .catch(e => {
        if (!cancelled) setState({ Comp: null, error: e as Error, loading: false });
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spin size="small" />;
  if (error) return <Alert type="info" showIcon message="Chart library not installed" description={<span>Install <code>@ant-design/plots</code> to view charts.<br/>Run: <code>npm install @ant-design/plots</code></span>} />;
  if (!Comp) return null;
  return <Comp {...props} />;
};

interface AggregatedPoint { day: string; total: number; }

const { Title } = Typography;

const GraphPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [userId, setUserId] = useState<string | number | null>(null);
  const [month, setMonth] = useState<Dayjs>(dayjs()); // default current month
  const [itemType, setItemType] = useState<string>('expense'); // default to expense per requirements

  const loadUsers = useCallback(async () => {
    const { data } = await getUsers();
    if (data) setUsers(data);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getItems({ userId: userId ?? undefined });
    if (error) setError(error.message); else { setItems(data || []); setError(null); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadItems(); }, [loadItems, month]); // reload when month changes (could add server-side month filter later)

  // Derive available item types from loaded items
  const itemTypes = useMemo(() => {
    if (!items) return [];
    const set = new Set<string>();
    items.forEach(i => { if (i.type) set.add(i.type); });
    return Array.from(set.values()).sort();
  }, [items]);

  // Filter + aggregate for chart
  const { monthTotal, chartData } = useMemo(() => {
    if (!items) return { monthTotal: 0, chartData: [] as AggregatedPoint[] };
    const start = month.startOf('month');
    const end = month.endOf('month');
    const bucket = new Map<string, number>();
    let total = 0;
    items.forEach(it => {
      if (!it.createdAt) return;
      const d = dayjs(it.createdAt);
      if (!d.isValid()) return;
      if (d.isBefore(start) || d.isAfter(end)) return;
      if (itemType && it.type && it.type !== itemType) return; // type filter
      const key = d.format('YYYY-MM-DD');
      const amount = typeof it.amount === 'number' ? it.amount : Number(it.amount) || 0;
      total += amount;
      bucket.set(key, (bucket.get(key) || 0) + amount);
    });
    const data: AggregatedPoint[] = Array.from(bucket.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, total]) => ({ day, total }));
    return { monthTotal: total, chartData: data };
  }, [items, month, itemType]);

  const monthLabel = month.format('MMMM YYYY');

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Title level={3} style={{ margin: 0 }}>Expense Analytics</Title>
        <Card size="small">
          <Space wrap>
            <Select
              allowClear
              placeholder="User"
              style={{ width: 200 }}
              value={userId !== null ? userId : undefined}
              onChange={(v) => setUserId(v ?? null)}
              loading={!users.length}
              showSearch
              optionFilterProp="children"
            >
              {users.map(u => <Select.Option key={u.id} value={u.id}>{u.username || u.name || <Tag>Unnamed</Tag>}</Select.Option>)}
            </Select>
            <Select
              placeholder="Item Type"
              allowClear
              style={{ width: 160 }}
              value={itemType || undefined}
              onChange={(v) => setItemType(v || '')}
            >
              {itemTypes.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
            <DatePicker
              picker="month"
              value={month}
              onChange={(d) => d && setMonth(d)}
              allowClear={false}
            />
          </Space>
        </Card>
        {error && <Alert type="error" showIcon message="Failed to load items" description={error} />}
        {loading && !items && <Spin tip="Loading items..." />}
        {items && (
          <>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card size="small">
                  <Statistic
                    title={`Total ${itemType || 'All'} Amount (${monthLabel})`}
                    value={monthTotal}
                    precision={2}
                  />
                </Card>
              </Col>
            </Row>
            <Card size="small" title={`${itemType || 'All'} daily totals (${monthLabel})`} bodyStyle={{ height: 420 }}>
              {chartData.length === 0 ? (
                <Alert type="info" message="No data" description="No items match the current filters." />
              ) : (
                <DynamicColumn
                  data={chartData}
                  xField="day"
                  yField="total"
                  columnWidthRatio={0.6}
                  tooltip={{ formatter: (datum: any) => ({ name: 'Total', value: datum.total.toFixed(2) }) }}
                  xAxis={{ label: { autoRotate: true } }}
                  yAxis={{ label: { formatter: (v: any) => `${v}` } }}
                  meta={{ day: { alias: 'Day' }, total: { alias: 'Amount' } }}
                />
              )}
            </Card>
          </>
        )}
      </Space>
    </div>
  );
};

export default GraphPage;
