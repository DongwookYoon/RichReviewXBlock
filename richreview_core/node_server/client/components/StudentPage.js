import React from "react";
// import PropTypes from 'prop-types';

import * as api from '../api';

class StudentPage extends React.Component {
  constructor() {
    super();

    this.state = {
      students: [
        // { email: "test01@study" },
        // { email: "test02@study" },
        // { email: "test03@study" },
        // { email: "test04@study" }
      ]
    };
  }

  componentDidMount() {
    api.fetchStudents()
      .then((students) => {
        this.setState({
          students
        });
      });
  }

  componentWillUnmount() {

  }

  buildList() {
    return this.state.students.map((student) => (
      <div key={student.id}>
        {student.email}
      </div>
    ));
  }

  render() {
    return (
      <div className="student-page">
        {this.buildList()}
      </div>
    );
  }
}

export default StudentPage;