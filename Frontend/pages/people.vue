<template>
  <div>
    <h1>People:</h1>
    <div v-for="(user_list, position) in users" :key="position">
      <li v-for="user in user_list" :key="user.key">
        {{ user.name }} - {{ position }}
      </li>
    </div>
    <h1
      @click="$router.push(`/courses/${$route.params.course_id}/course_groups`)"
    >
      Groups
    </h1>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'People',
  asyncData(context) {
    return axios
      .get(`http://localhost:3000/courses/${context.params.course_id}/users`, {
        headers: {
          Authorization: context.app.$auth.user.sub
        }
      })
      .then(res => {
        console.log(res.data)
        return {
          users: {
            instructor: res.data.instructors,
            ta: res.data.tas,
            student: res.data.students
          }
        }
      })
      .catch(e => {
        console.log(e)
        return { users: {} }
      })
  }
}
</script>

<style scoped></style>
