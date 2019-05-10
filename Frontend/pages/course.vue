<template>
  <div class="container">
    <div class="assignments">
      <h1>Assignments:</h1>
      <div v-for="a in assignments" :key="a.key" class="assignments">
        <div
          class="course card"
          @click="
            $router.push(
              `/courses/${$route.params.course_id}/assignments/${a.id}`
            )
          "
        >
          Title: {{ a.title }} Points: {{ a.points }} Due:
          {{ formate_date(a.due_date) }}
        </div>
      </div>
      <h2 @click="$router.push(`/courses/${$route.params.course_id}/users`)">
        People
      </h2>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'Course',
  asyncData(context) {
    return axios
      .get(`http://localhost:3000/courses/${context.params.course_id}`, {
        headers: {
          Authorization: context.app.$auth.user.sub
        }
      })
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
