<template>
  <div>
    <div id="course">
      <course-sidebar :assignments="true" />
      <div id="content">
        <nav-bar :course="title" />
        <div id="options">
          <p
            v-if="permissions === 'ta' || permissions === 'instructor'"
            id="new-assignment"
            @click="go_to_new_assignment"
          >
            New Assignment
          </p>
          <p
            v-if="permissions === 'instructor' || permissions === 'ta'"
            id="deleted-assignments"
            @click="go_to_deleted_assignments"
          >
            Deleted Assignments
          </p>
        </div>
        <div id="assignments-div">
          <table id="assignments">
            <thead id="assignments-header">
              <tr>
                <th id="name-header">Assignment Name</th>
                <th v-if="permissions === 'student'" id="status-header">
                  Status
                </th>
                <th
                  v-if="permissions === 'ta' || permissions === 'instructor'"
                  id="published-header"
                >
                  Published
                </th>
                <th id="group-header-title">
                  Group Assignment
                </th>
                <th id="due-header">Due</th>
              </tr>
            </thead>
            <tbody class="assignments-body">
              <tr
                v-for="a in assignments"
                :key="a.key"
                class="assignment-row"
                @click="go_to_assignment(a.id)"
              >
                <td class="assignment-title">{{ a.title }}</td>
                <td v-if="permissions === 'student'" class="assignment-status">
                  {{ a.submission.submission_status }}
                </td>
                <td
                  v-if="permissions === 'ta' || permissions === 'instructor'"
                  class="assignment-published"
                >
                  {{ a.hidden ? 'No' : 'Yes' }}
                </td>
                <td class="assignment-group">
                  {{ a.group_assignment ? 'Yes' : 'No' }}
                </td>
                <td class="assignment-due">
                  {{ a.due_date !== '' ? format_date(a.due_date) : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console,vue/no-unused-components,camelcase */

import https from 'https'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/footer'
import StudentAssignmentCard from '../components/student-assignment-card'
import Sidebar from '../components/dashboard_sidebar'
import CourseSidebar from '../components/course_sidebar'
import NavBar from '../components/nav_bar'

export default {
  name: 'Course',
  components: {
    NavBar,
    CourseSidebar,
    Sidebar,
    Footer,
    Header,
    StudentAssignmentCard
  },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const course_res = await axios.get(
      `https://${process.env.backend}:3000/courses/${context.params.course_id}`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    console.log(course_res.data)
    return {
      assignments: course_res.data.assignments,
      permissions: course_res.data.permissions,
      title: course_res.data.course.title,
      description: course_res.data.course.description
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  methods: {
    go_to_new_assignment() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/new`
      )
    },
    go_to_deleted_assignments() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/deleted-assignments`
      )
    },
    go_to_assignment(id) {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${id}`
      )
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

table {
  margin-bottom: 5vh;
}

.assignment-row:hover {
  background-color: #f5f5f5;
}

#course {
  display: flex;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
}

#options {
  margin-left: 54vw;
  display: flex;
}

#assignments-div {
  display: inline-block;
}

#new-assignment,
#deleted-assignments {
  margin-right: 1vw;
  background-color: #0c2343;
  font-size: 2.5vh;
  color: white;
  padding-left: 0.5vw;
  padding-right: 0.5vw;
  border-radius: 0.5vh;
  cursor: pointer;
}

#assignments {
  font-size: 2vh;
  color: #0c2343;
  margin-top: 2vh;
}

#assignments-header {
  font-size: 2.75vh;
}

.assignments-body {
  font-size: 2.5vh;
}

#name-header {
  width: 25vw;
}

#status-header,
#published-header {
  text-align: center;
  padding-right: 7vw;
  width: 18vw;
}

#group-header-title {
  padding-right: 7vw;
}

#due-header {
  text-align: center;
}

.assignment-row {
  cursor: pointer;
}

.assignment-title {
  width: 25vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 5vw;
}

.assignment-status,
.assignment-published {
  width: 18vw;
  text-align: center;
  padding-right: 7vw;
}

.assignment-group {
  text-align: center;
  padding-right: 7vw;
}

.assignment-due {
  text-align: center;
}
</style>
