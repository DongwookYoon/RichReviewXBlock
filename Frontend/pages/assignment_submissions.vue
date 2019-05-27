<template>
  <div>
    <h1>Submissions</h1>
    <div v-for="s in submissions" :key="s.key">
      <li>
        {{ s.submitter_name }} - {{ s.submission_status }} - {{ s.mark }}/{{
          s.points
        }}
      </li>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'AssignmentSubmissions',
  asyncData(context) {
    return axios
      .get(
        `http://localhost:3000/courses/${
          context.params.course_id
        }/assignments/${context.params.assignment_id}/submissions`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          }
        }
      )
      .then(res => {
        console.log(res.data)
        return { submissions: res.data.submissions }
      })
      .catch(e => {
        console.log(e)
        return { test: {} }
      })
  }
}
</script>

<style scoped></style>
