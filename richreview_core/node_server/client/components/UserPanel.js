import React from "react";
// import PropTypes from 'prop-types';

class UserPanel extends React.Component {
  constructor() {
    super();

  }

  componentDidMount() { }

  componentWillUnmount() { }
  
  static buildDetail(user) {
    let detail = "";
    if(user.first_name) detail += `${user.first_name} `;
    if(user.last_name) detail += `${user.last_name} `;
    if(user.display_name) detail += `(${user.display_name})`;
    return detail.trim();
  };

  static nonEmptyArray(arr) { return arr && arr.length && arr.length > 0; }
  
  static buildUserCard(instructor) {
    const detail = UserPanel.buildDetail(instructor);
    return (
      <div id={instructor.id} key={instructor.id} className="instructor-card">
        <p>{detail}</p>
        <p>{instructor.email}</p>
      </div>
    );
  };
  
  buildInstructorCards() {
    if (UserPanel.nonEmptyArray(this.props.users.instuctors)) {
      return (
        <div className="user-panel-instructors">
          Instructors
          {this.props.users.instructors.map((instructor) =>
            UserPanel.buildUserCard(instructor)
          )}
        </div>
      );
    }
    return <div className="user-panel-instructors">No Instructors Yet</div>;
  }

  buildActiveStudentCards() {
    if(UserPanel.nonEmptyArray(this.props.users.students.active)) {
      return (
        <div className="user-panel-active_students">
          Active Students
          {this.props.users.students.active.map((student) =>
          UserPanel.buildUserCard(student)
          )}
        </div>
      );
    }
    return <div className="user-panel-active_students">No Active Students</div>;
  }

  buildBlockedStudentCards() {
    if (UserPanel.nonEmptyArray(this.props.users.students.blocked)) {
      return (
        <div className="user-panel-blocked_students">
          Blocked Students
          {this.props.users.students.blocked.map((student) =>
            UserPanel.buildUserCard(student)
          )}
        </div>
      );
    }
    return (
      <div className="user-panel-blocked_students">
        No Blocked Students
      </div>
    );
  }

  renderLists() {
    if (Object.keys(this.props.users).length === 0) {
      return (<div className="user-panel-content"></div>);
    }
    return (
      <div className="user-panel-content">
        {this.buildInstructorCards()}
        {this.buildActiveStudentCards()}
        {this.buildBlockedStudentCards()}
      </div>
    );
  }

  render() {
    return (
      <div className="user-panel">
        <div className="user-panel-header">
          <h4>Users</h4>
        </div>
        {this.renderLists()}
      </div>
    );
  }
}

export default UserPanel;