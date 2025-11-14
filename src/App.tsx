// import React from 'react';
// import logo from './3Cloud-Logo.png';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Welcome to 3Cloud - Team Spark (React Training)
//         </p>
//         <a
//           className="App-link"
//           href="https://dev.azure.com/3c-gdc/SPARK"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Go to our Azure DevOps project
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;

// Exercise 1
// import React from 'react';
// import './App.css';

// function App() {

//   const lastName = 'Smith'

//   return (
//     <div className="App">
//       <ul>
//         <li>Last Name: lastName</li>
//       </ul>
//     </div>
//   );
// }

// export default App;

// Excercise 2
import React, { useState, useEffect } from 'react';
import './App.css';
import UserList from './components/UserList';
import TransactionList from './components/TransactionList';
import InventoryList from './components/InventoryList';
import InventoryGraph from './components/InventoryGraph';
import GraphPage from './components/GraphPage';
import CategoryList from './components/CategoryList';
import WeightList from './components/WeightList';
import { Tabs, Card, Badge, notification } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useInventoryStatus } from './hooks/useInventoryStatus';


const App: React.FC = () => {
  // Default to Monthly Graph top-level
  const [activeKey, setActiveKey] = useState('graph');
  const [notifiedItems, setNotifiedItems] = useState<Set<number>>(new Set());
  
  // Poll for inventory status every 30 seconds
  const { outOfStockCount, outOfStockItems, refresh } = useInventoryStatus(3, 30000);

  // Show notification when items go out of stock
  useEffect(() => {
    if (outOfStockItems.length > 0) {
      outOfStockItems.forEach((item) => {
        // Only show notification for items we haven't notified about yet
        if (!notifiedItems.has(item.id)) {
          notification.error({
            message: 'Item Out of Stock!',
            description: (
              <div>
                <strong>{item.name}</strong> is now out of stock.
                <br />
                <small>Category: {item.categoryName || 'N/A'}</small>
              </div>
            ),
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            placement: 'topRight',
            duration: 8,
            key: `out-of-stock-${item.id}`, // Unique key to prevent duplicates
          });
          
          // Mark this item as notified
          setNotifiedItems((prev) => new Set(prev).add(item.id));
        }
      });
    }
    
    // Clear notified items that are no longer out of stock
    if (outOfStockItems.length === 0) {
      setNotifiedItems(new Set());
    } else {
      const currentOutOfStockIds = new Set(outOfStockItems.map(item => item.id));
      setNotifiedItems((prev) => {
        const updated = new Set<number>();
        prev.forEach(id => {
          if (currentOutOfStockIds.has(id)) {
            updated.add(id);
          }
        });
        return updated;
      });
    }
  }, [outOfStockItems, notifiedItems]);

  // Admin nested tabs (data entry pages)
  const adminTabs = [
    { 
      key: 'inventory', 
      label: (
        <Badge count={outOfStockCount} offset={[10, 0]} overflowCount={99}>
          Inventory
        </Badge>
      ), 
      children: <InventoryList onInventoryChange={refresh} /> 
    },
    { key: 'transactions', label: 'Transactions', children: <TransactionList /> },
    { key: 'users', label: 'Users', children: <UserList /> },
    { key: 'categories', label: 'Categories', children: <CategoryList /> },
    { key: 'weights', label: 'Weights', children: <WeightList /> },
  ];

  // Top-level tabs: Graph, Inventory Graph, Admin (with nested tabs)
  const topLevelTabs = [
    { key: 'graph', label: 'Graph', children: <GraphPage /> },
    { key: 'inventory-graph', label: 'Inventory Tracking', children: <InventoryGraph /> },
    { key: 'admin', label: 'Admin', children: (
      <Card size="small" bodyStyle={{ padding: 0 }}>
        <Tabs
          tabPosition="top"
          items={adminTabs}
          destroyInactiveTabPane
        />
      </Card>
    ) },
  ];

  return (
    <div className="App" style={{ padding: 24 }}>
      <Tabs activeKey={activeKey} onChange={setActiveKey} items={topLevelTabs} destroyInactiveTabPane />
    </div>
  );
};

export default App;