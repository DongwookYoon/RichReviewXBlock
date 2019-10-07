<template>
  <div id="submissions">
    <dashboard-sidebar :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
    <course-sidebar :name="name" />
    <div id="content">
      <nav-bar :course="course" :assignment="assignment" submissions="true" />
      <button @click="mute_all_submissions" id="mute-all-button">Mute All</button>
      <button @click="unmute_all_submissions" id="unmute-all-button">Unmute All</button>
      <table id="submissions-table">
        <thead id="submissions-header">
          <tr>
            <th id="name-header">Name</th>
            <th id="status-header">Status</th>
            <th id="mark-header">Mark</th>
            <th id="submission-time-header">Submission Time</th>
            <th id="muted-header">Muted</th>
            <th id="grader-header">Grader</th>
          </tr>
        </thead>
        <tbody class="submissions-body">
          <tr
            v-for="s in submissions"
            :key="s.key"
            class="submission-row"
          >
            <td class="submission-name">{{ s.submitter_name }}</td>
            <td class="submission-status">
              {{ s.submission_status }}
            </td>
            <td class="submission-mark">
              {{ s.mark === '' ? '-' : s.mark }}/{{ s.points }}
            </td>
            <td class="submission-time">
              {{
                s.submission_time !== '' ? format_date(s.submission_time) : '-'
              }}
            </td>
            <td class="mute">
              <button @click="unmute_submission(s.submission_id)"
                      class="unmute-button" v-if="s.muted === true">Unmute</button>
              <button @click="mute_submission(s.submission_id)"
                      class="mute-button" v-if="s.muted === false">Mute</button>
            </td>
            <td class="grader">
              <button class="grader-button" @click="go_to_submission(s.submission_id, s.link)">Grader</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase */

import https from 'https'
import axios from 'axios'
import CourseSidebar from '../components/course_sidebar'
import Footer from '../components/footer'
import NavBar from '../components/nav_bar'
import DashboardSidebar from '../components/dashboard_sidebar'

export default {
  name: 'AssignmentSubmissions',
  components: { NavBar, Footer, CourseSidebar, 'dashboard-sidebar': DashboardSidebar },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/assignments/${context.params.assignment_id}/submissions`,
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
      submissions: res.data.submissions,
      course: res.data.course_title,
      assignment: res.data.assignment_title,
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
    go_to_submission(submission_id, link) {
      if (link !== '')
        window.open(
          `/edu/courses/${this.$route.params.course_id}/assignments/${
            this.$route.params.assignment_id
          }/submissions/${submission_id}/grader?${link}`
        )
    },
    async mute_all_submissions () {
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
          }/assignments/${this.$route.params.assignment_id}/mute_all`,
        {},
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      window.location.reload(true)
    },
    async unmute_all_submissions () {
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
          }/assignments/${this.$route.params.assignment_id}/unmute_all`,
        {},
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      window.location.reload(true)
    },
    async mute_submission(submission_id) {
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
          }/assignments/${this.$route.params.assignment_id}/mute/${submission_id}`,
        {},
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      window.location.reload(true)
    },
    async unmute_submission(submission_id) {
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
          }/assignments/${this.$route.params.assignment_id}/unmute/${submission_id}`,
        {},
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      window.location.reload(true)
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

#mute-all-button,
#unmute-all-button,
.mute-button,
.unmute-button,
.grader-button {
  font-size: 2vh;
  background-color: #0c2343;
  border-radius: 0.5vh;
  color: white;
  padding-right: 0.5vw;
  padding-left: 0.5vw;
  height: 4.25vh;
  margin-bottom: 0.5vw;
}

.mute-button {
  background-color: #e01700;
  color: white;
}

.unmute-button {
  background-color: #32c51c;
  color: white;
}

.submission-row:hover {
  background-color: #f5f5f5;
}

#submissions {
  display: flex;
  min-height: 100vh;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
}

#submissions-table {
  font-size: 2vh;
  color: #0c2343;
}

#submissions-header {
  font-size: 2.75vh;
}

.submissions-body {
  font-size: 2.5vh;
}

#name-header,
.submission-name {
  width: 20vw;
}

#status-header,
.submission-status {
  width: 10vw;
}

#mark-header,
.submission-mark {
  width: 15vw;
  text-align: center;
}

#submission-time-header,
.submission-time {
  width: 15vw;
  text-align: center;
}

#muted-header,
.mute {
  width: 6vw;
  text-align: center;
}

#grader-header,
.grader {
  width: 7vw;
  text-align: center;
}
</style>
