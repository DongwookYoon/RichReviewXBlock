import React from "react";
import PropTypes from 'prop-types';
//import moment from

class AssignmentPanel extends React.Component {
  constructor() {
    super();

  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  renderLists() {
    if (Object.keys(this.props.asgmts).length === 0) {
      return (<div className="asgmt-panel-content">
        No Assignments
      </div>);
    }
    return (
      <div className="asgmt-panel-content">
        {this.props.asgmts.map((asgmt) => (
          <div id={asgmt.id}>
            {asgmt.title}
          </div>
        ))}
      </div>
    );
  }

  render() {
    return (
      <div className="asgmt-panel">
        <div className="asgmt-panel-header">
          <h4>Assignments</h4>
        </div>
        {this.renderLists()}
      </div>
    );
  }
}

export default AssignmentPanel;
