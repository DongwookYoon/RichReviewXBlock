<template>
  <div>
    <Header />
    <div id="content">
      <div id="sidebar">
        <p
          id="people"
          @click="$router.push(`/courses/${$route.params.course_id}/users`)"
        >
          People
        </p>
        <p
          id="grades"
          @click="$router.push(`/courses/${$route.params.course_id}/grades`)"
        >
          Grades
        </p>
        <p
          v-if="permissions === 'ta' || permissions === 'instructor'"
          @click="
            $router.push(`/courses/${$route.params.course_id}/assignments/new`)
          "
        >
          + Assignment
        </p>
      </div>
      <table id="assignments">
        <thead id="assignments-header">
          <tr>
            <th>Name</th>
            <th v-if="permissions === 'student'" id="status-header">Status</th>
            <th
              v-if="permissions === 'ta' || permissions === 'instructor'"
              id="published-header"
            >
              Published
            </th>
            <th id="group-header">
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
            @click="
              $router.push(
                `/courses/${$route.params.course_id}/assignments/${a.id}`
              )
            "
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

#status-header,
#published-header {
  text-align: center;
  padding-right: 7vw;
}

#group-header {
  padding-right: 7vw;
}

#due-header {
  text-align: center;
}

.assignment-title {
  min-width: 20vw;
  max-width: 30vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 5vw;
}

.assignment-status,
.assignment-published {
  min-width: 15vw;
  max-width: 25vw;
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
