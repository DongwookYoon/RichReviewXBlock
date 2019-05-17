<template>
  <div class="container">
    <li v-for="g in grades" :key="g.key" class="grades">
      {{ g }}
    </li>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'Grades',
  asyncData(context) {
    return axios
      .get(`http://localhost:3000/courses/${context.params.course_id}/grades`, {
        headers: {
          Authorization: context.app.$auth.user.sub
        }
      })
      .then(res => {
        console.log(res.data)
        return {
          grades: res.data
        }
      })
      .catch(e => {
        console.log(e)
        return { grades: [] }
      })
  }
}
</script>

<style scoped></style>
