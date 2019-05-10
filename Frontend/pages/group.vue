<template>
  <div class="container">
    <h1>{{ group.name }}</h1>
    <h1>Submissions:</h1>
    <div v-for="s in submitters" :key="s.key">
      {{ s.assignment.title }} - {{ s.submission.mark }}/{{
        s.assignment.points
      }}
      -
      {{ formate_date(s.submission.submission_time) }}
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'Group',
  asyncData(context) {
    return axios
      .get(
        `http://localhost:3000/courses/${context.params.course_id}/groups/${
          context.params.group_id
        }`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          }
        }
      )
      .then(res => {
        console.log(res.data)
        return { group: res.data.group, submitters: res.data.submitters }
      })
      .catch(e => {
        console.log(e)
        return { test: {} }
      })
  }
}
</script>

<style scoped></style>
