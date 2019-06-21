<template>
  <div>
    <Header />
    <div>
      <div
        v-for="g in grades_data"
        :key="g.key"
        class="grade"
        @click="go_to_assignment(g.course_id, g.assignment_id)"
      >
        <p>{{ g.assignment }}</p>
        <p>{{ g.submission_status }}</p>
        <p>{{ g.mark }} / {{ g.points }}</p>
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
  name: 'AllUserGrades',
  components: { Footer, Header },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/0/grades/all_user_grades`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const grades_data = res.data
    return {
      grades_data
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
  margin-right: 5vw;
}

.grade {
  display: flex;
}
</style>
