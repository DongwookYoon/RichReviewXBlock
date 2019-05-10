import Vue from 'vue'
import Router from 'vue-router'

import login from './pages/login'
import authentication from './pages/authentication'
import dashboard from './pages/dashboard'
import course from './pages/course'
import assignment from './pages/assignment'
import people from './pages/people'
import groups from './pages/groups'
import group from './pages/group'

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
        path: '/courses/:course_id/assignments/:assignment_id',
        component: assignment
      },
      {
        path: '/courses/:course_id/users',
        component: people
      },
      {
        path: '/courses/:course_id/groups',
        component: groups
      },
      {
        path: '/courses/:course_id/groups/:group_id',
        component: group
      }
    ]
  })
}
