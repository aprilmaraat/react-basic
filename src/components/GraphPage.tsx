import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, DatePicker, Select, Space, Typography, Alert, Spin, Statistic, Row, Col, Tag, Segmented } from 'antd';
import type { Transaction } from '../types/Transaction';
import type { User } from '../types/User';
import { searchTransactions } from '../services/transactionService';
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

type ViewMode = 'monthly' | 'daily';

const { Title } = Typography;

const GraphPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View mode: monthly or daily
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  // Filters
  const [ownerId, setOwnerId] = useState<number | null>(null);
  // Track if we've already applied the initial auto-select to avoid re-applying after manual clear.
  const [autoSelectedUser, setAutoSelectedUser] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs()); // For daily view - single date
  const [month, setMonth] = useState<Dayjs>(dayjs()); // For monthly view - month
  // Multi-select transaction types. We'll auto-select ALL once the types are known.
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [autoSelectedTypes, setAutoSelectedTypes] = useState(false);

  const loadUsers = useCallback(async () => {
    const { data } = await getUsers();
    if (data) setUsers(data);
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await searchTransactions({ owner_id: ownerId ?? null });
    if (error) setError(error.message); else { setTransactions(data || []); setError(null); }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  // After users load, default the user filter to the first user (once).
  useEffect(() => {
    if (!autoSelectedUser && !ownerId && users.length > 0) {
      setOwnerId(users[0].id);
      setAutoSelectedUser(true);
    }
  }, [users, ownerId, autoSelectedUser]);
  useEffect(() => { loadTransactions(); }, [loadTransactions, month, selectedDate]); // reload when date changes

  // Derive available transaction types from loaded transactions
  const transactionTypes = useMemo(() => {
    if (!transactions) return [];
    const set = new Set<string>();
    transactions.forEach(i => { if (i.transaction_type) set.add(i.transaction_type); });
    return Array.from(set.values()).sort();
  }, [transactions]);

  // Auto-select all types once discovered (only once, unless user clears all manually).
  useEffect(() => {
    if (!autoSelectedTypes && transactionTypes.length > 0 && selectedTypes.length === 0) {
      setSelectedTypes(transactionTypes);
      setAutoSelectedTypes(true);
    }
  }, [transactionTypes, autoSelectedTypes, selectedTypes]);

  // Aggregate for Expense, Revenue, and Treasury - works for both monthly and daily views
  const { expenseTotal, revenueTotal, treasuryTotal, netRevenueTotal, chartData, periodLabel } = useMemo(() => {
    if (!transactions) return { expenseTotal: 0, revenueTotal: 0, treasuryTotal: 0, netRevenueTotal: 0, chartData: [] as any[], periodLabel: '' };
    
    let start: Dayjs;
    let end: Dayjs;
    let periodLabel: string;
    let xFieldLabel: string;

    if (viewMode === 'monthly') {
      start = month.startOf('month');
      end = month.endOf('month');
      periodLabel = month.format('MMMM YYYY');
      xFieldLabel = 'day';
    } else {
      // Daily view - show transactions for a single day
      start = selectedDate.startOf('day');
      end = selectedDate.endOf('day');
      periodLabel = selectedDate.format('MMMM DD, YYYY');
      xFieldLabel = 'time';
    }

    const allSelected = selectedTypes.length === 0 || selectedTypes.length === transactionTypes.length;
    const activeSet = allSelected ? null : new Set(selectedTypes);
  let expenseTotal = 0;
  let revenueTotal = 0;
  let capitalTotal = 0;
  let netRevenueTotal = 0;
    // Map: day -> Map(type -> total)
    const bucket = new Map<string, Map<string, number>>();
    transactions.forEach(it => {
      if (!it.date) return;
      const d = dayjs(it.date);
      if (!d.isValid()) return;
      if (d.isBefore(start) || d.isAfter(end)) return;
      const typeKey = it.transaction_type || 'unknown';
      if (activeSet && (!it.transaction_type || !activeSet.has(it.transaction_type))) return;
      
      // For monthly view: group by day, for daily view: group by hour
      const key = viewMode === 'monthly' 
        ? d.format('YYYY-MM-DD')
        : d.format('HH:00'); // Group by hour for daily view

      // Handle both string and number types for total_amount and quantity
      const totalAmountNum = typeof it.total_amount === 'string' ? parseFloat(it.total_amount) : it.total_amount;
      const amountPerUnitNum = typeof it.amount_per_unit === 'string' ? parseFloat(it.amount_per_unit) : it.amount_per_unit;
      const quantityNum = typeof it.quantity === 'string' ? parseFloat(it.quantity) : (it.quantity || 0);
      const amount = !isNaN(totalAmountNum) && totalAmountNum !== 0
        ? totalAmountNum
        : (!isNaN(amountPerUnitNum) && !isNaN(quantityNum)
          ? amountPerUnitNum * quantityNum
          : 0);
      if (typeKey.toLowerCase() === 'expense') expenseTotal += amount;
      if (typeKey.toLowerCase() === 'earning') revenueTotal += amount;
      if (typeKey.toLowerCase() === 'capital') capitalTotal += amount;
      
      // Calculate Net Revenue per Transaction: Only for 'earning' type transactions
      // Formula: (amount_per_unit * quantity) - (purchase_price * quantity)
      if (typeKey.toLowerCase() === 'earning') {
        const purchasePriceNum = it.purchase_price 
          ? (typeof it.purchase_price === 'string' ? parseFloat(it.purchase_price) : it.purchase_price)
          : 0;
        const revenue = amountPerUnitNum * quantityNum;
        const cost = (isNaN(purchasePriceNum) ? 0 : purchasePriceNum) * quantityNum;
        const netRevenuePerTransaction = revenue - cost;
        netRevenueTotal += netRevenuePerTransaction;
      }
      
      if (!bucket.has(key)) bucket.set(key, new Map<string, number>());
      const keyMap = bucket.get(key)!;
      keyMap.set(typeKey, (keyMap.get(typeKey) || 0) + amount);
    });
  const treasuryTotal = capitalTotal - expenseTotal + revenueTotal;
    const data: any[] = Array.from(bucket.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([key, typeMap]) => Array.from(typeMap.entries()).map(([type, total]) => ({ 
        [xFieldLabel]: key, 
        type, 
        total 
      })));
    return { expenseTotal, revenueTotal, treasuryTotal, netRevenueTotal, chartData: data, periodLabel };
  }, [transactions, month, selectedDate, viewMode, selectedTypes, transactionTypes]);

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
  <Title level={3} style={{ margin: 0 }}>Transaction Graph</Title>
        <Card size="small">
          <Space wrap>
            <Segmented
              options={[
                { label: 'Monthly', value: 'monthly' },
                { label: 'Daily', value: 'daily' }
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
            />
            <Select
              allowClear
              placeholder="User"
              style={{ width: 200 }}
              value={ownerId !== null ? ownerId : undefined}
              onChange={(v) => setOwnerId(v ?? null)}
              loading={!users.length}
              showSearch
              optionFilterProp="children"
            >
              {users.map(u => <Select.Option key={u.id} value={u.id}>{u.full_name || u.email || <Tag>Unnamed</Tag>}</Select.Option>)}
            </Select>
            <Select
              placeholder="Transaction Types"
              allowClear
              mode="multiple"
              style={{ minWidth: 220 }}
              value={selectedTypes}
              onChange={(vals) => setSelectedTypes(vals)}
              maxTagCount="responsive"
            >
              {transactionTypes.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
            {viewMode === 'monthly' ? (
              <DatePicker
                picker="month"
                value={month}
                onChange={(d) => d && setMonth(d)}
                allowClear={false}
                placeholder="Select month"
              />
            ) : (
              <DatePicker
                value={selectedDate}
                onChange={(d) => d && setSelectedDate(d)}
                allowClear={false}
                placeholder="Select date"
              />
            )}
          </Space>
        </Card>
  {error && <Alert type="error" showIcon message="Failed to load transactions" description={error} />}
  {loading && !transactions && <Spin tip="Loading transactions..." />}
  {transactions && transactions.length === 0 && !loading && !error && (
    <Alert type="info" message="No data" description="No transactions found for the current filters / period." />
  )}
  {transactions && transactions.length > 0 && (
          <>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card size="small">
                    <Statistic
                      title={`Total Expense Amount (${periodLabel})`}
                      value={expenseTotal}
                      precision={2}
                      valueStyle={{ color: '#cf1322' }}
                    />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card size="small">
                    <Statistic
                      title={`Total Revenue Amount (${periodLabel})`}
                      value={revenueTotal}
                      precision={2}
                      valueStyle={{ color: '#389e0d' }}
                    />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card size="small">
                    <Statistic
                      title={`Total Business Treasury (${periodLabel})`}
                      value={treasuryTotal}
                      precision={2}
                      valueStyle={{ color: '#1890ff' }}
                    />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card size="small">
                    <Statistic
                      title={`Total Net Revenue (${periodLabel})`}
                      value={netRevenueTotal}
                      precision={2}
                      valueStyle={{ color: netRevenueTotal <= 0 ? '#cf1322' : '#52c41a' }}
                    />
                </Card>
              </Col>
            </Row>
            <Card size="small" title={`${selectedTypes.length === 0 || selectedTypes.length === transactionTypes.length ? 'All' : selectedTypes.join(', ')} ${viewMode === 'monthly' ? 'daily' : 'hourly'} totals (${periodLabel})`} bodyStyle={{ height: 420 }}>
              {chartData.length === 0 ? (
                <Alert type="info" message="No data" description="No transactions match the current filters." />
              ) : (
                <DynamicColumn
                  data={chartData}
                  xField={viewMode === 'monthly' ? 'day' : 'time'}
                  yField="total"
                  seriesField="type"
                  columnWidthRatio={0.6}
                    // Robust color mapping with partial matching (in case backend sends plural or capitalized variants)
                    color={(datum: any) => {
                      const t = (datum.type || '').toString().toLowerCase();
                      if (t.includes('expense')) return '#ffccc7'; // light red
                      if (t.includes('earning')) return '#d9f7be'; // light green
                      if (t.includes('capital')) return '#1890ff'; // blue
                      return '#d9d9d9'; // neutral fallback
                    }}
                  tooltip={{
                    customContent: (title: string, items: any[]) => {
                      // items: array of { data, value, ... }
                      let expense = 0;
                      let earning = 0;
                      items.forEach((item: any) => {
                        console.log('item', item);
                        const type = item.data?.type?.toLowerCase();
                        if (type === 'expense') expense = item.data?.total;
                        if (type === 'earning') earning = item.data?.total;
                      });
                      return `<div style='padding:8px;'>`
                        + `<strong>${title}</strong><br/>`
                        + `Expense: <b>${expense.toFixed(2)}</b><br/>`
                        + `Earning: <b>${earning.toFixed(2)}</b><br/>`
                        + items.map(item => `${item.name}: ${item.value}`).join('<br/>')
                        + `</div>`;
                    }
                  }}
                  xAxis={{ label: { autoRotate: true } }}
                  yAxis={{ label: { formatter: (v: any) => `${v}` } }}
                  isGroup
                  meta={viewMode === 'monthly' 
                    ? { day: { alias: 'Day' }, total: { alias: 'Amount' }, type: { alias: 'Type' } }
                    : { time: { alias: 'Hour' }, total: { alias: 'Amount' }, type: { alias: 'Type' } }
                  }
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
