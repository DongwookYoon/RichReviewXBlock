<template>
  <div>
    <Header />
    <div id="options">
      <img
        v-if="permissions === 'instructor' || permissions === 'ta'"
        id="more-options"
        src="/delete.png"
        @click="go_to_deleted_assignments"
      />
    </div>
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
          id="new-assignment"
          @click="go_to_new_assignment"
        >
          + Assignment
        </p>
      </div>
      <table id="assignments">
        <thead id="assignments-header">
          <tr>
            <th id="name-header">Assignment Name</th>
            <th v-if="permissions === 'student'" id="status-header">Status</th>
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
  name: 'Course',
  components: { Footer, Header, StudentAssignmentCard },
  asyncData(context) {
    return axios
      .get(`https://localhost:3000/courses/${context.params.course_id}`, {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
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
    go_to_deleted_assignments() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/deleted-assignments`
      )
    },
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

#content {
  width: 100%;
  height: 100%;
  display: flex;
}

#more-options {
  margin-left: 93vw;
  margin-top: 4vh;
  margin-bottom: -7vh;
  cursor: pointer;
}

#sidebar {
  font-size: 3.5vh;
  color: #0c2343;
  margin-top: 20vh;
  margin-right: 5vw;
  margin-left: 2vw;
  min-width: 12vw;
}

#people,
#grades,
#new-assignment {
  margin-bottom: 5vh;
  cursor: pointer;
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

#name-header {
  width: 30vw;
}

#status-header,
#published-header {
  text-align: center;
  padding-right: 7vw;
  width: 23vw;
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
  width: 30vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 5vw;
}

.assignment-status,
.assignment-published {
  width: 23vw;
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
