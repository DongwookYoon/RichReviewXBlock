<template>
  <div id="dashboard">
    <sidebar />
    <div id="content">
      <div id="courses">
        <div v-for="e in enrolments" :key="e.key" class="enrolments">
          <course-card
            :title="e.title"
            :description="e.description"
            role="Student"
            :assignment_count="e.assignments.length"
            :link="`courses/${e.id}`"
            class="course-card"
          ></course-card>
        </div>
        <div v-for="e in taing" :key="e.key" class="taing">
          <course-card
            :title="e.title"
            :description="e.description"
            role="TA"
            :assignment_count="e.assignments.length"
            :link="`courses/${e.id}`"
          ></course-card>
        </div>
        <div v-for="e in instructing" :key="e.key" class="instructing">
          <course-card
            :title="e.title"
            :description="e.description"
            role="Instructor"
            :assignment_count="e.assignments.length"
            :link="`courses/${e.id}`"
          ></course-card>
        </div>
      </div>
      <div id="upcoming-assignments">
        <p id="upcoming-assignments-title">Upcoming Assignments:</p>
        <p v-if="assignments.length === 0" id="no-assignments">
          No upcoming assignments
        </p>
        <div v-for="a in assignments" :key="a.key" class="assignments">
          <upcoming-assignment
            :title="a.title.toString()"
            :status="a.submission_status"
            :late="a.late"
            :link="`courses/${a.course_id}/assignments/${a.assignment_id}`"
          ></upcoming-assignment>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable require-await,no-unused-vars,no-console,prettier/prettier,no-undef,camelcase */

import https from 'https'
import axios from 'axios'
import Footer from '../components/footer'
import CourseCard from '../components/course-card'
import UpcomingAssignment from '../components/upcoming-assignment'
import Sidebar from '../components/dashboard_sidebar'

export default {
  components: { Sidebar, UpcomingAssignment, CourseCard, Footer },
  async asyncData(context) {
    const res = await axios
      .get(`https://localhost:3000/courses`, {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
    return {
      enrolments: res.data.enrolments,
      taing: res.data.taing,
      instructing: res.data.teaching,
      assignments: res.data.assignments
    }
  },
  methods: {
    go_to_dashboard() {
      this.$router.push('/dashboard')
    },
    go_to_all_assignments() {
      this.$router.push('/all-assignments')
    },
    go_to_all_groups() {
      this.$router.push('/all-groups')
    },
    go_to_all_grades() {
      this.$router.push('/all-grades')
    },
    async logout() {
      await this.$auth.logout()
      this.$router.push('/')
    }
  }
}
</script>

<style>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

#test {
  height: 1px;
  margin-top: 0;
  margin-bottom: 0;
  background-color: #0c2343;
  margin-right: 10%;
}

#dashboard {
  display: flex;
}

#content {
  width: 100%;
  display: flex;
}

#courses {
  display: grid;
  margin-top: 5%;
  margin-left: 4%;
  grid-template-columns: 20vw 20vw 20vw;
  grid-column-gap: 1vw;
  grid-row-gap: 6vh;
  max-width: 60%;
}

#upcoming-assignments {
  position: absolute;
  right: 0;
  display: inline-block;
  width: 20%;
  margin-top: 4.5%;
  margin-left: 4%;
  font-size: 2.5vh;
  color: #0c2343;
}

#upcoming-assignments-title {
  font-size: 3vh;
  border-bottom: 1px solid #0c2343;
  margin: 0 1vw 0 0;
}

#no-assignments {
  color: #535353;
}
</style>
