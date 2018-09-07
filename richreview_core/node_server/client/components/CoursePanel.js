import React from "react";
import PropTypes from 'prop-types';

/*[{"institution":"ubc","is_active":false,"course_group":"korn_102_001_2018w","active_students":[],"blocked_students":[],"instructors":[],"dept":"KORN","number":"102","section":"001","year":"2018W","title":"Korean I"},{"institution":"ubc","is_active":false,"course_group":"chin_141_002_2018w","active_students":[],"blocked_students":[],"instructors":[],"dept":"CHIN","number":"141","section":"002","year":"2018W","title":"Chinese I"}]*/

class CoursePanel extends React.Component {
  constructor() { super(); }
  componentDidMount() { }
  componentWillUnmount() { }

  buildCards() {
    /*return this.props.courses.map((course) => {
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
    );*/
    return this.props.courses.map(course => {
      const kk = `${course.institution}:${course.course_group}`;
      const open = () => this.props.selectCourse(course.institution, course.course_group);
      return (
        <div id={kk} key={kk} className={"course-card"}>
          <p>{course.title}</p>
          <button onClick={open}>{course.institution} {course.dept} {course.number} {course.section} {course.year}</button>
        </div>
    );
    });
    
  }

  render() {
    return (
      <div className="course-panel">
        <div className="course-panel-header">
          <h4>Courses</h4>
        </div>
        <div className="course-panel-list">
          {this.buildCards()}
        </div>
      </div>
    );
  }
}

export default CoursePanel;
