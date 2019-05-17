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
          {{ format_date(a.due_date) }}
        </div>
      </div>
      <button
        @click="$router.push(`/courses/${$route.params.course_id}/users`)"
      >
        People
      </button>
    </div>
    <button
      v-if="permissions === 'ta' || permissions === 'instructor'"
      @click="
        $router.push(`/courses/${$route.params.course_id}/assignments/new`)
      "
    >
      + Assignment
    </button>
    <button @click="$router.push(`/courses/${$route.params.course_id}/grades`)">
      Grades
    </button>
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
          assignments: res.data.assignments,
          permissions: res.data.permissions
        }
      })
      .catch(e => {
        console.log(e)
        return { assignments: [], permissions: undefined }
      })
  }
}
</script>

<style scoped></style>
