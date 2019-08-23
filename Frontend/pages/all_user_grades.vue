<template>
  <div id="all-grades">
    <sidebar :name="name" />
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
              class="grade-row"
              @click="go_to_assignment(g.course_id, g.assignment_id)"
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

    const grades = res.data.grades
    console.log(grades)
    return {
      grades,
      name: res.data.user_name
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
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 10vh;
}

.grade-row:hover {
  background-color: #f5f5f5;
}

#all-grades-header {
  font-size: 3vh;
  color: #0c2343;
}

#grades-table {
  font-size: 2vh;
  color: #0c2343;
  margin-top: 5vh;
}

#grades-header {
  font-size: 2.75vh;
  padding-right: 3vw;
}

.grades-body {
  font-size: 2.5vh;
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
