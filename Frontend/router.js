/* eslint-disable camelcase */
import Vue from 'vue'
import Router from 'vue-router'

import login from './pages/login'
import authentication from './pages/authentication'
import dashboard from './pages/dashboard'
import course from './pages/course'
import assignment from './pages/assignment'
import people from './pages/people'
import course_groups from './pages/course_groups'
import course_group from './pages/course_group'
import edit_assignment from './pages/edit_assignment'
import new_assignment from './pages/new_assignment'
import grades from './pages/grades'
import new_course_group from './pages/new_course_group'
import assignment_submissions from './pages/assignment_submissions'
import viewer from './pages/viewer'

Vue.use(Router)

export function createRouter() {
  return new Router({
    mode: 'history',
    routes: [
      {
        path: '/login',
        component: login
      },
      {
        path: '/',
        component: login
      },
      {
        path: '/authentication',
        component: authentication
      },
      {
        path: '/dashboard',
        component: dashboard
      },
      {
        path: '/courses/:course_id',
        component: course
      },
      {
        path: '/courses/:course_id/assignments/new',
        component: new_assignment
      },
      {
        path: '/courses/:course_id/assignments/:assignment_id',
        component: assignment
      },
      {
        path: '/courses/:course_id/users',
        component: people
      },
      {
        path: '/courses/:course_id/course_groups',
        component: course_groups
      },
      {
        path: '/courses/:course_id/course_groups/new',
        component: new_course_group
      },
      {
        path: '/courses/:course_id/course_groups/:group_id',
        component: course_group
      },
      {
        path: '/courses/:course_id/assignments/:assignment_id/edit',
        component: edit_assignment
      },
      {
        path: '/courses/:course_id/grades',
        component: grades
      },
      {
        path: '/courses/:course_id/assignments/:assignment_id/submissions',
        component: assignment_submissions
      },
      {
        path: '/courses/:course_id/viewer',
        component: viewer
      }
    ]
  })
}
