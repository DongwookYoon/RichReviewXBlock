import React from "react";
import PropTypes from 'prop-types';

class CoursePanel extends React.Component {
  constructor() {
    super();

  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  buildCards() {
    return this.props.courses.map((course) => {
      const arr = course.id.split(":");
      const course_dept = arr[1].toLocaleUpperCase();
      const course_nbr  = arr[2];
      return (
          <div id={course.id} key={course.id} className="course-card">
            <button onClick={() => this.props.selectCourse(course.id)}>{course_dept+" "+course_nbr+": "+course.name}
            </button>
          </div>
      );
      }
    );
  }

  render() {
    return (
      <div className="course-panel">
        <div className="course-panel-header">
          <h2>Courses</h2>
        </div>
        <div className="course-panel-list">
          {this.buildCards()}
        </div>
      </div>
    );
  }
}

export default CoursePanel;
