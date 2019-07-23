import React from "react";

class AssignmentGroup extends React.Component {
  constructor() {
    super();

  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  buildCards() {
    return this.props.asgmt_grp.asgmts.map((asgmt) => (
      <div id={asgmt.id} key={asgmt.id} className="asgmt-card">
        {asgmt.title+" "+asgmt.due_date}
      </div>
    ));
  }

  render() {
    const first_name = this.props.asgmt_grp.student.first_name;
    const last_name  = this.props.asgmt_grp.student.last_name;
    const sid        = this.props.asgmt_grp.student.sid;

    return (
      <div className="asgmt-panel-grp">
        {first_name+" "+last_name+" "+sid}
        {this.buildCards()}
      </div>
    );
  }
}

export default AssignmentGroup;