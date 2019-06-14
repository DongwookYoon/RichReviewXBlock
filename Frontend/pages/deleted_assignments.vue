<template>
  <div>
    <Header />
    <div id="content">
      <div id="sidebar">
        <p id="people" @click="go_to_people">
          People
        </p>
        <p id="grades" @click="go_to_grades">
          Grades
        </p>
        <p
          v-if="permissions === 'ta' || permissions === 'instructor'"
          @click="go_to_new_assignment"
        >
          + Assignment
        </p>
      </div>
      <table id="assignments">
        <thead id="assignments-header">
          <tr>
            <th>Name</th>
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

export default {
  name: 'DeletedAssignments',
  components: { Footer, Header, StudentAssignmentCard },
  asyncData(context) {
    return axios
      .get(
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
      .then(res => {
        console.log(res.data)
        return {
          assignments: res.data.assignments,
          permissions: res.data.permissions
        }
      })
      .catch(e => {
        console.log(e)
        return { assignments: [], permissions: undefined }
      })
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
    restore(id) {
      console.log(id)
      axios
        .post(
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
        .then(() => {
          this.assignments = this.assignments.filter(assignment => {
            return assignment.id !== id
          })
        })
        .catch(e => {
          console.log(e)
        })
    },
    deleteAssignment(id) {
      axios
        .delete(
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
        .then(() => {
          this.assignments = this.assignments.filter(assignment => {
            return assignment.id !== id
          })
        })
        .catch(e => {
          console.log(e)
        })
    }
  }
}
</script>

<style scoped>
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

#content {
  width: 100%;
  height: 100%;
  display: flex;
}

#sidebar {
  font-size: 3.5vh;
  color: #0c2343;
  margin-top: 25vh;
  margin-right: 5vw;
  margin-left: 2vw;
  min-width: 12vw;
}

#people,
#grades {
  margin-bottom: 5vh;
}

#assignments {
  font-size: 2vh;
  color: #0c2343;
  margin-top: 10vh;
}

#assignments-header {
  font-size: 2.75vh;
}

.assignments-body {
  font-size: 2.5vh;
}

.assignment-title {
  width: 55vw;
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
