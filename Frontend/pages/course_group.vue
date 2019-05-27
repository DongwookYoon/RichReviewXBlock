<template>
  <div>
    <h1>{{ group.name }}</h1>
    <h1>Members:</h1>
    <div v-for="u in group.users" :key="u.key">
      <li>{{ u.display_name }}</li>
    </div>
    <h1>Submissions:</h1>
    <div v-for="s in submitters" :key="s.key">
      {{ s.assignment.title }} - {{ s.submission.mark }}/{{
        s.assignment.points
      }}
      -
      {{ format_date(s.submission.submission_time) }}
    </div>
    <button @click="delete_group()">Delete</button>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'CourseGroup',
  asyncData(context) {
    return axios
      .get(
        `http://localhost:3000/courses/${
          context.params.course_id
        }/course_groups/${context.params.group_id}`,
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
  },
  methods: {
    delete_group() {
      axios
        .delete(
          `http://localhost:3000/courses/${
            this.$route.params.course_id
          }/course_groups/${this.$route.params.group_id}`,
          {
            headers: {
              Authorization: this.$auth.user.sub
            }
          }
        )
        .then(res => {
          this.$router.push(
            `/courses/${this.$route.params.course_id}/course_groups`
          )
        })
        .catch(e => {
          console.log(e)
          this.$router.push(
            `/courses/${this.$route.params.course_id}/course_groups`
          )
        })
    }
  }
}
</script>

<style scoped></style>
