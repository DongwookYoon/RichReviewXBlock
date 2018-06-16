import React from "react";
import PropTypes from 'prop-types';

class AssignmentPage extends React.Component {
  constructor() {
    super();

    this.state = {
      assignments: [
        { title: "test_hw01" },
        { title: "test_hw02" },
        { title: "test_hw03" },
        { title: "test_hw04" }
      ]
    };
  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  buildList() {
    return this.state.assignments.map((assignment) => (
      <div>
        {assignment.title}
      </div>
    ));
  }

  render() {
    return (
      <div className="assignment-page">
        {this.buildList()}
      </div>
    );
  }
}

export default AssignmentPage;
