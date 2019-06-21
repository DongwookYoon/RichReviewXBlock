<template>
  <div>
    <Header />
    <div>
      <div
        v-for="a in assignment_data"
        :key="a.key"
        class="assignment-card"
        @click="go_to_assignment(a.course_id, a.assignment_id)"
      >
        <p>{{ a.title }}</p>
        <p>{{ a.course }}</p>
        <p>{{ a.submission_status }}</p>
        <p>{{ a.role }}</p>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-unused-vars,camelcase */

import https from 'https'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/footer'

export default {
  name: 'AllUserAssignments',
  components: { Footer, Header },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/0/assignments/all_user_assignments`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const assignment_data = res.data
    return {
      assignment_data
    }
  },
  methods: {
    go_to_assignment(course_id, assignment_id) {
      this.$router.push(`/courses/${course_id}/assignments/${assignment_id}`)
    }
  }
}
</script>

<style scoped>
p {
  margin-right: 3vw;
}

.assignment-card {
  display: flex;
}
</style>
