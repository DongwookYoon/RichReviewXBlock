/* eslint-disable camelcase */

import authentication from './pages/authentication'
import dashboard from './pages/dashboard'
import course from './pages/course'
import assignment from './pages/assignment'
import people from './pages/people'
import course_group from './pages/course_group'
import edit_assignment from './pages/edit_assignment'
import new_assignment from './pages/new_assignment'
import grades from './pages/grades'
import new_course_group from './pages/new_course_group'
import assignment_submissions from './pages/assignment_submissions'
import viewer from './pages/viewer'
import grader from './pages/grader'
import submitter from './pages/submitter'
import deleted_assignments from './pages/deleted_assignments'
import all_user_assignments from './pages/all_user_assignments'
import all_user_groups from './pages/all_user_groups'
import all_user_grades from './pages/all_user_grades'
import admin from './pages/admin'
import ubc_pilot from './pages/ubc_pilot'
// import AssignmentLti from './pages/lti/AssignmentLti'
// import CreateAssignmentLti from './pages/lti/CreateAssignmentLti'
// import LoginLti from './pages/lti/LoginLti'
// import OAuthLti from './pages/lti/OAuthLti'
import login from './pages/login'
import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export function createRouter () {
  return new Router({
    mode: 'history',
    routes: [
      {
        path: '/edu/login',
        component: login
      },
      {
        path: '/edu',
        component: login
      },
      {
        path: '/edu/authentication',
        component: authentication
      },
      {
        path: '/edu/dashboard',
        component: dashboard
      },
      {
        path: '/edu/all-assignments',
        component: all_user_assignments
      },
      {
        path: '/edu/all-groups',
        component: all_user_groups
      },
      {
        path: '/edu/all-grades',
        component: all_user_grades
      },
      {
        path: '/edu/courses/:course_id',
        component: course
      },
      {
        path: '/edu/courses/:course_id/assignments/new',
        component: new_assignment
      },
      {
        path: '/edu/courses/:course_id/deleted-assignments',
        component: deleted_assignments
      },
      {
        path: '/edu/courses/:course_id/assignments/:assignment_id',
        component: assignment
      },
      {
        path: '/edu/courses/:course_id/users',
        component: people
      },
      {
        path: '/edu/courses/:course_id/course_groups/new',
        component: new_course_group
      },
      {
        path: '/edu/courses/:course_id/course_groups/:group_id',
        component: course_group
      },
      {
        path: '/edu/courses/:course_id/assignments/:assignment_id/edit',
        component: edit_assignment
      },
      {
        path: '/edu/courses/:course_id/grades',
        component: grades
      },
      {
        path:
          '/edu/courses/:course_id/assignments/:assignment_id/submissions',
        component: assignment_submissions
      },
      {
        path: '/edu/courses/:course_id/assignments/:assignment_id/viewer',
        component: viewer
      },
      {
        path:
          '/edu/courses/:course_id/assignments/:assignment_id/submissions/:submission_id/grader',
        component: grader
      },
      {
        path: '/edu/courses/:course_id/assignments/:assignment_id/submitter',
        component: submitter
      },
      {
        path: '/edu/admin',
        component: admin
      },
      {
        path: '/ubc-pilot',
        component: ubc_pilot
      }
      /*
      {
        path: '/lti/assignments/:assignment_type/:assignment_key',
        component: AssignmentLti
      },
      {
        path: '/lti/create_assignment',
        component: CreateAssignmentLti
      },
      {
        path: '/lti/login',
        component: LoginLti
      },
      {
        path: '/lti/oauth',
        component: OAuthLti
      }
      */

    ]
  })
}
