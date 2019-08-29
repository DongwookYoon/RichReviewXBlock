<template>
  <div id="course-group">
    <dashboard-sidebar :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
    <course-sidebar :name="name" />
    <div id="content">
      <nav-bar :course="course" people="true" :course_group="group.name" />
      <div id="header">
        <p id="group-name">{{ group.name }}</p>
        <button
          v-if="permissions === 'instructor' || permissions === 'ta'"
          id="delete-button"
          @click="delete_group()"
        >
          Delete
        </button>
      </div>
      <div id="group-body">
        <div id="members">
          <p id="members-header">Members</p>
          <div v-for="u in group.users" :key="u.key">
            <p>{{ u.display_name }}</p>
          </div>
        </div>
        <div id="submissions">
          <p id="submissions-header">Submissions</p>
          <div v-for="s in submitters" :key="s.key">
            <p>
              {{ s.submission.submission_status }} - {{ s.assignment.title }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console */
import https from 'https'
import axios from 'axios'
import CourseSidebar from '../components/course_sidebar'
import Footer from '../components/footer'
import NavBar from '../components/nav_bar'
import DashboardSidebar from '../components/dashboard_sidebar'

export default {
  name: 'CourseGroup',
  components: { NavBar, Footer, CourseSidebar, 'dashboard-sidebar': DashboardSidebar },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/course_groups/${context.params.group_id}`,
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
      permissions: res.data.permissions,
      group: res.data.group,
      submitters: res.data.submitters,
      course: res.data.course,
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
    async delete_group() {
      await axios.delete(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/course_groups/${this.$route.params.group_id}`,
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/users`
      )
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

#course-group {
  display: flex;
  min-height: 100vh;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
}

#header,
#group-body {
  display: flex;
}

#delete-button {
  position: fixed;
  right: 0;
  margin-right: 20vw;
  font-size: 2vh;
  background-color: #0c2343;
  border-radius: 0.5vh;
  color: white;
}

#members,
#submissions {
  display: block;
  width: 35vw;
  font-size: 2.5vh;
  color: #0c2343;
  margin-right: 5%;
}

#members-header,
#submissions-header {
  font-size: 2.75vh;
  width: 100%;
  border-bottom: 1px solid lightgrey;
}

#group-name {
  font-size: 3vh;
  color: #0c2343;
}
</style>
