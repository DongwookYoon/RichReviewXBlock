<template>
  <div id="deleted-assignments">
    <course-sidebar />
    <div id="content">
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

export default {
  name: 'DeletedAssignments',
  components: { CourseSidebar, Footer, Header, StudentAssignmentCard },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/${
        context.params.course_id
      }/deleted-assignments`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    return {
      assignments: res.data.assignments,
      permissions: res.data.permissions
    }
  },
  methods: {
    go_to_people() {
      this.$router.push(`/courses/${this.$route.params.course_id}/users`)
    },
    go_to_grades() {
      this.$router.push(`/courses/${this.$route.params.course_id}/grades`)
    },
    go_to_new_assignment() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/new`
      )
    },
    go_to_assignment(id) {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${id}`
      )
    },
    async restore(id) {
      await axios.post(
        `https://localhost:3000/courses/${
          this.$route.params.course_id
        }/deleted-assignments/restore`,
        { id: id },
        {
          headers: {
            Authorization: this.$auth.user.sub
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
      if (confirm('Do you with to permanently delete this assignment?')) {
        await axios.delete(
          `https://localhost:3000/courses/${
            this.$route.params.course_id
          }/assignments/${id}/permanently`,
          {
            headers: {
              Authorization: this.$auth.user.sub
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
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
}

#assignments {
  font-size: 2vh;
  color: #0c2343;
  margin-top: 10vh;
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
