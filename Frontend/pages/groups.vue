<template>
  <div class="container">
    <h1>Groups:</h1>
    <div v-for="g in groups" :key="g.key">
      <div
        @click="
          $router.push(`/courses/${$route.params.course_id}/groups/${g.id}`)
        "
      >
        {{ g.name }}
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'Groups',
  asyncData(context) {
    return axios
      .get(`http://localhost:3000/courses/${context.params.course_id}/groups`, {
        headers: {
          Authorization: context.app.$auth.user.sub
        }
      })
      .then(res => {
        console.log(res.data)
        return { groups: res.data }
      })
      .catch(e => {
        console.log(e)
        return { groups: [] }
      })
  }
}
</script>

<style scoped></style>
