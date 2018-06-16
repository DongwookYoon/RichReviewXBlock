import React from 'react';
// import PropTypes from 'prop-types';

import StudentPage from './StudentPage';
import CoursePage from './CoursePage';
import AssignmentPage from './AssignmentPage';

class App extends React.Component {
  render() {
    // return(<h1>MyClass</h1>);

    return (
      <div className="app">
        <div className="app-header">
          <h1>MyClass</h1>
        </div>
        <div className="app-contents">
          <StudentPage />
          <CoursePage />
          <AssignmentPage />
        </div>
      </div>
    );
  }
}

export default App;