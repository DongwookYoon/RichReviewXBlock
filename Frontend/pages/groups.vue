<template>
  <div class="container">
    <h1>Groups:</h1>
    <button
      @click="$router.push(`/courses/${$route.params.course_id}/groups/new`)"
    >
      + Group
    </button>
    <h2>Active Groups:</h2>
    <div v-for="g in active_course_groups" :key="g.key">
      <li
        @click="
          $router.push(`/courses/${$route.params.course_id}/groups/${g.id}`)
        "
      >
        {{ g.name }}
      </li>
    </div>
    <h2>Inactive Groups:</h2>
    <div v-for="g in inactive_course_groups" :key="g.key">
      <li
        @click="
          $router.push(`/courses/${$route.params.course_id}/groups/${g.id}`)
        "
      >
        {{ g.name }}
      </li>
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
        return {
          active_course_groups: res.data.active_course_groups,
          inactive_course_groups: res.data.inactive_course_groups
        }
      })
      .catch(e => {
        console.log(e)
        return { active_course_groups: [], inactive_course_groups: [] }
      })
  }
}
</script>

<style scoped></style>
