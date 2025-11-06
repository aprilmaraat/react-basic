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
import React, { useState } from 'react';
import './App.css';
import UserList from './components/UserList';
import TransactionList from './components/TransactionList';
import InventoryList from './components/InventoryList';
import InventoryGraph from './components/InventoryGraph';
import GraphPage from './components/GraphPage';
import CategoryList from './components/CategoryList';
import WeightList from './components/WeightList';
import { Tabs, Card } from 'antd';


// Admin nested tabs (data entry pages)
const adminTabs = [
  { key: 'inventory', label: 'Inventory', children: <InventoryList /> },
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

const App: React.FC = () => {
  // Default to Monthly Graph top-level
  const [activeKey, setActiveKey] = useState('graph');
  return (
    <div className="App" style={{ padding: 24 }}>
      <Tabs activeKey={activeKey} onChange={setActiveKey} items={topLevelTabs} destroyInactiveTabPane />
    </div>
  );
};

export default App;