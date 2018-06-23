import React from "react";
import PropTypes from 'prop-types';

class AssignmentPanel extends React.Component {
  constructor() {
    super();

    this.state = {
      assignments: [ ]
    };
  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  buildList() {
    return this.state.assignments.map((assignment) => (
      <div id={assignment.id}>
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

export default AssignmentPanel;
