<template>
  <div id="deleted-assignments">
    <dashboard-sidebar :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
    <course-sidebar :name="name" />
    <div id="content">
      <nav-bar :course="course" deleted_assignments="true" />
      <table id="assignments">
        <thead id="assignments-header">
          <tr>
            <th id="name-header">Name</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody class="assignments-body">
          <tr v-for="a in assignments" :key="a.key" class="assignment-row">
            <td class="assignment-title">
              <p @click="go_to_assignment(a.id)">
                {{ a.title }}
              </p>
            </td>
            <td class="restore-button" @click="restore(a.id)">Restore</td>
            <td class="delete-button" @click="deleteAssignment(a.id)">
              Delete
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,vue/no-unused-components */

import https from 'https'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/footer'
import StudentAssignmentCard from '../components/student-assignment-card'
import CourseSidebar from '../components/course_sidebar'
import NavBar from '../components/nav_bar'
import DashboardSidebar from '../components/dashboard_sidebar'

export default {
  name: 'DeletedAssignments',
  components: { NavBar, CourseSidebar, Footer, Header, StudentAssignmentCard, 'dashboard-sidebar': DashboardSidebar },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/deleted-assignments`,
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

    return {
      assignments: res.data.assignments,
      permissions: res.data.permissions,
      course: res.data.course_title,
      name: res.data.user_name || '',
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
    go_to_people() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/users`
      )
    },
    go_to_grades() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/grades`
      )
    },
    go_to_new_assignment() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/new`
      )
    },
    go_to_assignment(id) {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${id}`
      )
    },
    async restore(id) {
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/deleted-assignments/restore`,
        { id: id },
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      this.assignments = this.assignments.filter(assignment => {
        return assignment.id !== id
      })
    },
    async deleteAssignment(id) {
      if (confirm('Do you wish to permanently delete this assignment?')) {
        await axios.delete(
          `https://${process.env.backend}:3000/courses/${
            this.$route.params.course_id
          }/assignments/${id}/permanently`,
          {
            headers: {
              Authorization: this.$store.state.authUser.id
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
        )
        this.assignments = this.assignments.filter(assignment => {
          return assignment.id !== id
        })
      }
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

p {
  margin: 0;
}

td {
  padding-top: 1vh;
  padding-bottom: 1vh;
}

thead {
  border-bottom: 1px solid #0c2343;
}

.assignment-row:hover {
  background-color: #f5f5f5;
}

.assignment-row {
  cursor: pointer;
}

#deleted-assignments {
  display: flex;
  min-height: 100vh;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
}

#assignments {
  font-size: 2vh;
  color: #0c2343;
}

#assignments-header {
  font-size: 2.75vh;
}

#name-header,
.assignment-title {
  width: 55vw;
}

.assignments-body {
  font-size: 2.5vh;
}

.assignment-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 5vw;
}

.restore-button,
.delete-button {
  padding-right: 2vw;
}
</style>
