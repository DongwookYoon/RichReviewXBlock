<template>
  <div class="container">
    <h1>Assignment Page</h1>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'Assignment',
  asyncData(context) {
    return axios
      .get(
        `http://localhost:3000/courses/${
          context.params.course_id
        }/assignments/${context.params.assignment_id}`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          }
        }
      )
      .then(res => {
        console.log(res.data)
        return {
          assignments: res.data.assignments
        }
      })
      .catch(e => {
        console.log(e)
        return { assignments: [] }
      })
  }
}
</script>

<style scoped></style>
