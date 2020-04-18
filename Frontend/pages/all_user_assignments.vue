<template>
  <div id="all-assignments">
    <sidebar :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
    <div id="content">
      <div id="all-assignments-header">
        <p id="all-assignments-text">All Assignments</p>
        <hr />
      </div>
      <div id="assignments">
        <table id="assignments-table">
          <thead id="assignments-header">
            <tr>
              <th id="name-header">Assignment</th>
              <th id="group-header">Group Assignment</th>
              <th id="due-header">Due</th>
              <th id="course-header">Course</th>
              <th id="role-header">Role</th>
            </tr>
          </thead>
          <tbody class="assignments-body">
            <tr
              v-for="a in assignments"
              :key="a.key"
              class="assignment-row"
              @click="go_to_assignment(a.course_id, a.assignment_id)"
            >
              <td class="assignment-title">{{ a.title }}</td>
              <td class="assignment-group">
                {{ a.group_assignment ? 'Yes' : 'No' }}
              </td>
              <td class="assignment-due">
                {{ a.due !== '' ? format_date(a.due) : '-' }}
              </td>
              <td class="assignment-course">{{ a.course }}</td>
              <td class="assignment-role">{{ a.role }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-unused-vars,camelcase,no-console,no-undef */

import https from 'https'
import axios from 'axios'
import Footer from '../components/footer'
import Sidebar from '../components/dashboard_sidebar'

export default {
  name: 'AllUserAssignments',
  components: { Sidebar, Footer },
  async asyncData(context) {
    if (!context.store.state.authUser) {
      return
    }
    const res = await axios.get(
      `https://${
        process.env.backend
      }:3000/courses/0/assignments/all_user_assignments`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const course_res = await axios
      .get(`https://${process.env.backend}:3000/courses`, {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })

    const assignments = res.data.assignments
    return {
      assignments,
      name: res.data.user_name,
      enrolments: course_res.data.enrolments,
      taing: course_res.data.taing,
      instructing: course_res.data.teaching
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  methods: {
    go_to_assignment(course_id, assignment_id) {
      this.$router.push(
        `/edu/courses/${course_id}/assignments/${assignment_id}`
      )
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

p {
  margin-right: 3vw;
}

td {
  padding-top: 1vh;
  padding-bottom: 1vh;
}

table {
  margin-left: 0;
  margin-bottom: 5vh;
}

hr {
  width: 60vw;
}

.assignment-row:hover {
  background-color: #f5f5f5;
}

#content {
  margin-left: 7vw;
  margin-top: 10vh;
  display: block;
  min-height: 100vh;
}

#all-assignments {
  display: flex;
  min-height: 100vh;
}

#all-assignments-header {
  font-size: 1.1rem;
  color: #0c2343;
}

#assignments {
  font-size: 1rem;
  color: #0c2343;
  margin: 1rem 2rem 1rem 0;
}

#assignments-header {
  font-size: 1rem;
}

.assignments-body {
  font-size: 1rem;
}

#name-header {
  width: 20vw;
}

#group-header {
  padding-right: 3vw;
}

#due-header {
  width: 15vw;
  text-align: center;
  padding-right: 3vw;
}

#course-header {
  padding-right: 5vw;
}

.assignment-row {
  cursor: pointer;
}

.assignment-title {
  width: 20vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 5vw;
}

.assignment-group {
  text-align: center;
  padding-right: 3vw;
}

.assignment-due {
  text-align: center;
  padding-right: 3vw;
}

.assignment-course {
  padding-right: 5vw;
}
</style>
