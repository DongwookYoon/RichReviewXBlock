<template>
  <div>
    <h1>Submissions</h1>
    <div v-for="s in submissions" :key="s.key">
      <li @click="go_to_submission(s.submission_id, s.link)">
        {{ s.submitter_name }} - {{ s.submission_status }} - {{ s.mark }}/{{
          s.points
        }}
      </li>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase */

import https from 'https'
import axios from 'axios'

export default {
  name: 'AssignmentSubmissions',
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
    return { submissions: res.data.submissions }
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
</style>
