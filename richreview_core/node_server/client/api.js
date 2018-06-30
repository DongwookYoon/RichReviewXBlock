import axios from 'axios';

//export multiple functions to fetch from the api

export const fetchCourses = () => {
  return axios.get(`/api/class/fetch_courses`)
    .then(resp => resp.data);
};

export const fetchCourseUsers = (key) => {
  return axios.get(`/api/class/fetch_course_users/${key}`)
    .then(resp => resp.data);
};

export const fetchCourseAssignments = (key) => {
  return axios.get(`/api/class/fetch_course_assignments/${key}`)
    .then(resp => resp.data);
};