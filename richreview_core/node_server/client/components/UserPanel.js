import React from "react";
// import PropTypes from 'prop-types';

class UserPanel extends React.Component {
  constructor() {
    super();

  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  buildInstructorCards() {
    if (this.props.users.blocked_students === 0) {
      return (
        <div className="user-panel-instructors">
          No Instructors Yet
        </div>
      );
    }
    return (
      <div className="user-panel-instructors">
        Instructors
        {this.props.users.instructors.map((user) => (
          <div id={user.id} key={user.id} className="instructor-card">
            {user.email}
          </div>
        ))}
      </div>
    );
  }

  buildActiveStudentCards() {
    if (this.props.users.blocked_students === 0) {
      return (
        <div className="user-panel-active_students">
          No Active Students
        </div>
      );
    }
    return (
      <div className="user-panel-active_students">
        Active Students
        {this.props.users.active_students.map((user) => (
          <div id={user.id} key={user.id} className="active_student-card">
            {user.email}
          </div>
        ))}
      </div>
    );
  }

  buildBlockedStudentCards() {
    if (this.props.users.blocked_students === 0) {
      return (
        <div className="user-panel-blocked_students">
          No Blocked Students
        </div>
      );
    }
    return (
      <div className="user-panel-blocked_students">
        Blocked Students
        {this.props.users.blocked_students.map((user) => (
          <div id={user.id} key={user.id} className="blocked_student-card">
            {user.email}
          </div>
        ))}
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