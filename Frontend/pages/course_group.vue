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
    <button
      v-if="permissions === 'instructor' || permissions === 'ta'"
      @click="delete_group()"
    >
      Delete
    </button>
  </div>
</template>

<script>
/* eslint-disable no-console */
import https from 'https'
import axios from 'axios'

export default {
  name: 'CourseGroup',
  asyncData(context) {
    return axios
      .get(
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
      .then(res => {
        return {
          permissions: res.data.permissions,
          group: res.data.group,
          submitters: res.data.submitters
        }
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
