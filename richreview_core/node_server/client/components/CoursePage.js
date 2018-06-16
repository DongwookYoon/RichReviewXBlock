import React from "react";
import PropTypes from 'prop-types';
import * as api from "../api";

class CoursePage extends React.Component {
  constructor() {
    super();

    this.state = {
      courses: [
        { name: "Korean" },
        { name: "Japanese" },
        { name: "Chinese" },
      ]
    };
  }

  componentDidMount() {
    api.fetchCourses()
      .then((students) => {
        this.setState({
          students
        });
      });
  }

  componentWillUnmount() {

  }

  buildList() {
    return this.state.courses.map((course) => (
      <div>
        {course.name}
      </div>
    ));
  }

  render() {
    return (
      <div className="course-page">
        {this.buildList()}
      </div>
    );
  }
}

export default CoursePage;
