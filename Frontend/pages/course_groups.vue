<template>
  <div>
    <h1>Groups:</h1>
    <button
      v-if="permissions === 'instructor' || permissions === 'ta'"
      @click="
        $router.push(`/courses/${$route.params.course_id}/course_groups/new`)
      "
    >
      + Group
    </button>
    <h2>Active Groups:</h2>
    <div v-for="g in active_course_groups" :key="g.key">
      <li
        @click="
          $router.push(
            `/courses/${$route.params.course_id}/course_groups/${g.id}`
          )
        "
      >
        {{ g.name }}
      </li>
    </div>
    <h2>Inactive Groups:</h2>
    <div v-for="g in inactive_course_groups" :key="g.key">
      <li
        @click="
          $router.push(
            `/courses/${$route.params.course_id}/course_groups/${g.id}`
          )
        "
      >
        {{ g.name }}
      </li>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */

import https from 'https'
import axios from 'axios'

export default {
  name: 'CourseGroups',
  asyncData(context) {
    return axios
      .get(
        `https://localhost:3000/courses/${
          context.params.course_id
        }/course_groups`,
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
        console.log(res.data)
        return {
          permissions: res.data.permissions,
          active_course_groups: res.data.groups.active_course_groups,
          inactive_course_groups: res.data.groups.inactive_course_groups
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
