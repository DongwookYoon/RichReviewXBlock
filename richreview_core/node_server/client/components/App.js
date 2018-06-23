import React from 'react';
// import PropTypes from 'prop-types';

import StudentPanel from './StudentPanel';
import CoursePanel from './CoursePanel';
import AssignmentPanel from './AssignmentPanel';
import * as api from "../api";

class App extends React.Component {
  constructor() {
    super();

    this.state = {
      courses: [ ],
      users:   [ ]
    };

    this.selectCourse = this.selectCourse.bind(this);
  }

  componentDidMount() {
    api.fetchCourses()
      .then((courses) => {
        this.setState({
          courses
        });
      });
  }

  selectCourse(key) {
    console.log("selected course "+key+" and fetching students");
    api.fetchCourseUsers(key)
      .then((users) => {
        this.setState({
          users
        });
      });
  }

  render() {
    return (
      <div className="myclass-shell">
        <div className="myclass-container">
          <div className="myclass-header">
            <h1>MyClass</h1>
          </div>
          <div className="myclass-contents">
            <CoursePanel
              courses={this.state.courses}
              selectCourse={this.selectCourse}
            />
            <StudentPanel
              users={this.state.users}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;