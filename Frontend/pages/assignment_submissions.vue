<template>
  <div id="submissions">
    <course-sidebar />
    <div id="content">
      <nav-bar :course="course" :assignment="assignment" submissions="true" />
      <table id="submissions-table">
        <thead id="submissions-header">
          <tr>
            <th id="name-header">Name</th>
            <th id="status-header">Status</th>
            <th id="mark-header">Mark</th>
            <th id="submission-time-header">Submission Time</th>
          </tr>
        </thead>
        <tbody class="submissions-body">
          <tr
            v-for="s in submissions"
            :key="s.key"
            class="submission-row"
            @click="go_to_submission(s.submission_id, s.link)"
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

export default {
  name: 'AssignmentSubmissions',
  components: { NavBar, Footer, CourseSidebar },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/${context.params.course_id}/assignments/${
        context.params.assignment_id
      }/submissions`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    console.log(res.data)
    return {
      submissions: res.data.submissions,
      course: res.data.course_title,
      assignment: res.data.assignment_title
    }
  },
  methods: {
    go_to_submission(submission_id, link) {
      if (link !== '')
        window.open(
          `/courses/${this.$route.params.course_id}/assignments/${
            this.$route.params.assignment_id
          }/submissions/${submission_id}/grader?${link}`
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

.submission-row:hover {
  background-color: #f5f5f5;
}

#submissions {
  display: flex;
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
  width: 25vw;
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
</style>
