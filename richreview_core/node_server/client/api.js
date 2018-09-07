import axios from 'axios';

//export multiple functions to fetch from the api

export const fetchCourses = () => {
  return axios.get(`/api/class/fetch_courses`)
    .then(resp => resp.data);
};

export const fetchCourseUsers = (institution, course_group) => {
  return axios.get(`/api/class/fetch_users?op=ForCourse&institution=${institution}&course_group=${course_group}`)
    .then(resp => resp.data);
};

/*export const fetchCourseAssignments = (key) => {
  return axios.get(`/api/class/fetch_course_assignments/${key}`)
    .then(resp => resp.data);
};*/
