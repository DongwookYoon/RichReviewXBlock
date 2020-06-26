<template>
  <div id="all-grades">
    <sidebar :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
    <div id="content">
      <div id="all-grades-header">
        <p id="all-grades-text">All Grades</p>
        <hr />
      </div>
      <div id="grades">
        <table id="grades-table">
          <thead id="grades-header">
            <tr>
              <th id="assignment-header">Assignment</th>
              <th id="status-header">Status</th>
              <th id="mark-header">Mark</th>
              <th id="course-header">Course</th>
            </tr>
          </thead>
          <tbody class="grades-body">
            <tr
              v-for="g in grades"
              :key="g.key"
              :class="{'grade-row': true, 'inactive-assignment': !g.is_active}"
              :title="getRowTooltipMessage(g.is_active)"
              @click="go_to_assignment(g.course_id, g.assignment_id, g.is_active)"
            >
              <td class="grade-assignment">{{ g.assignment }}</td>
              <td class="grade-status">{{ g.submission_status }}</td>
              <td class="grade-mark">{{ g.mark }}/{{ g.points }}</td>
              <td class="grade-course">{{ g.course }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-unused-vars,camelcase,no-undef,no-console */

import https from 'https'
import axios from 'axios'
import Footer from '../components/footer'
import Sidebar from '../components/dashboard_sidebar'

export default {
  name: 'AllUserGrades',
  components: { Sidebar, Footer },
  async asyncData(context) {
    if (!context.store.state.authUser) {
      return
    }
    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/0/grades/all_user_grades`,
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

    const grades = res.data.grades

    return {
      grades,
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
    go_to_assignment(course_id, assignment_id, is_active) {
      if (is_active === false) {
        return
      }
      this.$router.push(
        `/edu/courses/${course_id}/assignments/${assignment_id}`
      )
    },
    getRowTooltipMessage (is_active) {
      if (is_active === false) {
        return 'This assignment is closed and can no longer be viewed.'
      }
      return ''
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

p {
  margin-right: 5vw;
}

td {
  padding-top: 1vh;
  padding-bottom: 1vh;
}

table {
  margin-bottom: 5vh;
}

hr {
  width: 60vw;
}

#all-grades {
  display: flex;
  min-height: 100vh;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 10vh;
}

.grade-row:hover {
  background-color: #f5f5f5;
}

.inactive-assignment{
  opacity: 0.8;
  cursor: default !important;
}

.inactive-assignment:hover{
  background-color: rgba(252, 228, 228, 0.589);
}

#all-grades-header {
  font-size: 1.6rem;
  color: #0c2343;
}

#grades-table {
  font-size: 1rem;
  color: #0c2343;
  margin: 1rem 2rem 1rem 0;
}

#grades-header {
  font-size: 1.2rem;
  padding-right: 3vw;
}

.grades-body {
  font-size: 1.1rem;
}

#assignment-header {
  width: 25vw;
}

#status-header {
  padding-right: 10vw;
}

#mark-header {
  padding-right: 10vw;
}

.grade-row {
  cursor: pointer;
}

.grade-assignment {
  width: 25vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 5vw;
}

.grade-status {
  padding-right: 10vw;
}

.grade-mark {
  padding-right: 10vw;
}



</style>
