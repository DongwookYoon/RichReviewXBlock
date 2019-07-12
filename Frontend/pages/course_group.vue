<template>
  <div id="course-group">
    <course-sidebar />
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

export default {
  name: 'CourseGroup',
  components: { NavBar, Footer, CourseSidebar },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/${
        context.params.course_id
      }/course_groups/${context.params.group_id}`,
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
      permissions: res.data.permissions,
      group: res.data.group,
      submitters: res.data.submitters,
      course: res.data.course
    }
  },
  methods: {
    async delete_group() {
      await axios.delete(
        `https://localhost:3000/courses/${
          this.$route.params.course_id
        }/course_groups/${this.$route.params.group_id}`,
        {
          headers: {
            Authorization: this.$auth.user.sub
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      this.$router.push(
        `/courses/${this.$route.params.course_id}/course_groups`
      )
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

#course-group {
  display: flex;
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
  width: 35%;
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
