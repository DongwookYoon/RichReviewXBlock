<template>
  <div id="dashboard">
    <Loading :loading="isLoading ? true : false"/>
    <sidebar id="sidebar" :style="loadingCSS" :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
    <div :style="loadingCSS" id="content">
      <div id="courses">
        <div v-if="taing.length > 0 || instructing.length > 0" id="teaching-div">
          <p class="courses-header">Courses you are teaching:</p>
          <hr />
          <div class="course-contents">
            <div v-for="e in taing" :key="e.key" class="taing">
              <course-card
                :title="e.title"
                :description="e.description"
                role="TA"
                :assignment_count="e.assignment_count"
                :link="`/edu/courses/${e.id}`"
                v-on:done="doneLoading"
              ></course-card>
            </div>
            <div v-for="e in instructing" :key="e.key" class="instructing">
              <course-card
                :title="e.title"
                :description="e.description"
                role="Instructor"
                :assignment_count="e.assignment_count"
                :link="`/edu/courses/${e.id}`"
                v-on:done="doneLoading"
              ></course-card>
            </div>
          </div>
        </div>
        <div v-if="enrolments.length > 0" id="enrolment-div">
          <p class="courses-header">Courses you are enrolled in:</p>
          <hr />
          <div id="student-contents">
            <div class="course-contents">
              <div v-for="e in enrolments" :key="e.key" class="enrolments">
                <course-card
                  :title="e.title"
                  :description="e.description"
                  role="Student"
                  :assignment_count="e.assignment_count"
                  :link="`/edu/courses/${e.id}`"
                  class="course-card"
                  v-on:done="doneLoading"
                ></course-card>
              </div>
            </div>
            <div v-if="enrolments.length > 0" id="upcoming-assignments">
              <p id="upcoming-assignments-title">Upcoming Assignments:</p>
              <p v-if="assignments.length === 0" id="no-assignments">
                No upcoming assignments
              </p>
              <div v-for="a in assignments" :key="a.key" class="assignments">
                <upcoming-assignment
                  :title="a.title.toString()"
                  :status="a.submission_status"
                  :late="a.late"
                  :link="
                `/edu/courses/${a.course_id}/assignments/${a.assignment_id}`
              "
                ></upcoming-assignment>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable require-await,no-unused-vars,no-console,prettier/prettier,no-undef,camelcase */

import https from 'https'
import Loading from '../components/loading-icon'
import axios from 'axios'
import Footer from '../components/footer'
import CourseCard from '../components/course-card'
import UpcomingAssignment from '../components/upcoming-assignment'
import Sidebar from '../components/dashboard_sidebar'

export default {
  components: { Loading, Sidebar, UpcomingAssignment, CourseCard, Footer },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const res = await axios
      .get(`https://${process.env.backend}:3000/courses`, {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
    console.log(res.data.user_name)
    let done = {}
    if (res.data.enrolments.length === 0 &&
        res.data.taing.length === 0 &&
        res.data.teaching.length === 0){
        done.isLoading = false,
        done.loadingCSS = ''
        }
    return {
      enrolments: res.data.enrolments,
      taing: res.data.taing,
      instructing: res.data.teaching,
      assignments: res.data.assignments,
      name: res.data.user_name || '',
      ...done
      }
  },
  data() {
    return {isLoading: true, loadingCSS: 'display: none'}
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  methods: {
    doneLoading() {
      this.isLoading = false,
      this.loadingCSS = ''
    },
    go_to_dashboard() {
      this.$router.push('/edu/dashboard')
    },
    go_to_all_assignments() {
      this.$router.push('/edu/all-assignments')
    },
    go_to_all_groups() {
      this.$router.push('/edu/all-groups')
    },
    go_to_all_grades() {
      this.$router.push('/edu/all-grades')
    },
    async logout() {
      await this.$auth.logout()
      this.$router.push('/edu')
    }
  }
}
</script>

<style scoped>
#dashboard {
  overflow-y:scroll;
  height: 100vh;
}
#sidebar {
  float: left;
  width: 100px;
  min-height: 750px;
  height: 100%;
  z-index: 10;
}
#content {
  padding-left: 120px;
  height: 100%;
}
.course-contents {
  display: inline-grid;
grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  padding: 10px;
  grid-gap: 50px 25px;
  width: 70%;
}
hr,
p {
  margin: 0;
}

#teaching-div {
  margin-bottom: 5vh;
}

.courses-header {
  font-size: 1.5em;
  color: #0c2343;
}

#student-contents {
  display: flex;
}

#upcoming-assignments {
  display: inline-block;
  /*width: 20%;*/
  margin-right: 2vw;
  margin-left: 2vw;
  font-size: 1.2em;
  color: #0c2343;
  margin-bottom: 50px;
}

#upcoming-assignments-title {
  font-size: 1.5em;
  border-bottom: 1px solid #0c2343;
  margin: 0 1vw 0 0;
}

#no-assignments {
  color: #535353;
}
@media only screen and (max-width: 600px) {
  #content {
    padding-left: 100px;
  }
  #student-contents {
    display: inline-block;
    margin: auto;
  }
}
</style>
