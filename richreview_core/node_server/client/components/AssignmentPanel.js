import React from "react";
import PropTypes from 'prop-types';

import AssignmentGroup from './AssignmentGroup';

class AssignmentPanel extends React.Component {
  constructor() {
    super();

  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  renderLists() {
    if (Object.keys(this.props.asgmt_grps).length === 0) {
      return (<div className="asgmt-panel-content">
        No Assignments
      </div>);
    }
    /*return (
      <div className="asgmt-panel-content">
        {this.props.asgmts.map((asgmt) => (
          <div id={asgmt.id} key={asgmt.id} className="asgmt-card">
            {asgmt.title}
          </div>
        ))}
      </div>
    );*/
    return (
      <div className="asgmt-panel-content">
        {this.props.asgmt_grps.map((asgmt_grp) => {
          return <AssignmentGroup asgmt_grp={asgmt_grp} />
        })}
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
