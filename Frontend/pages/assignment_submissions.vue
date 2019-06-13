<template>
  <div>
    <h1>Submissions</h1>
    <div v-for="s in submissions" :key="s.key">
      <li @click="go_to_submission(s.link)">
        {{ s.submitter_name }} - {{ s.submission_status }} - {{ s.mark }}/{{
          s.points
        }}
      </li>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */

import https from 'https'
import axios from 'axios'

export default {
  name: 'AssignmentSubmissions',
  asyncData(context) {
    return axios
      .get(
        `https://localhost:3000/courses/${
          context.params.course_id
        }/assignments/${context.params.assignment_id}/submissions`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      .then(res => {
        console.log(res.data)
        return { submissions: res.data.submissions }
      })
      .catch(e => {
        console.log(e)
        return { expand: {} }
      })
  },
  methods: {
    go_to_submission(link) {
      if (link !== '')
        this.$router.push(
          `/courses/${this.$route.params.course_id}/viewer?${link}`
        )
    }
  }
}
</script>

<style scoped></style>
