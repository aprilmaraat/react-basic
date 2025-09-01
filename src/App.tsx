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
import React from 'react';
import './App.css';

interface Props { 
  country: string;
}

const App: React.FC<Props> = (props) => {
  return (
    <div className="App">
      <ul>
        <li>Country: {props.country}</li>
      </ul>
    </div>
  );
};

export default App;