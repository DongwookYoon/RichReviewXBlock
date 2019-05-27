<template>
  <div class="container">
    <h1 v-if="permissions !== 'instructor' && permissions !== 'ta'">401</h1>
    <div v-if="permissions === 'instructor' || permissions === 'ta'">
      <li v-for="user in users" :key="user.key">
        {{ user.name }} - usr:{{ user.id }}
      </li>
      <input v-model="group_data.name" placeholder="Group name" />
      <div v-for="index in count" :key="index">
        <input
          v-model="group_data.users[index - 1]"
          placeholder="Enter user id"
        />
      </div>
      <button @click="count++">+</button>
      <button
        @click="
          $router.push(`/courses/${$route.params.course_id}/course_groups`)
        "
      >
        Cancel
      </button>
      <button @click="save()">Save</button>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'NewGroup',
  data: function() {
    return {
      group_data: {
        name: '',
        users: []
      },
      count: 1
    }
  },
  async asyncData(context) {
    try {
      const permission = await axios.get(
        `http://localhost:3000/courses/${
          context.params.course_id
        }/users/permissions`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          }
        }
      )
      const users = await axios.get(
        `http://localhost:3000/courses/${context.params.course_id}/users`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          }
        }
      )

      return {
        users: users.data.students,
        permissions: permission.data.permissions
      }
    } catch (e) {
      console.warn(e)
      return {
        users: [],
        permissions: undefined
      }
    }
  },
  methods: {
    save() {
      axios
        .post(
          `http://localhost:3000/courses/${
            this.$route.params.course_id
          }/course_groups`,
          { group_data: this.group_data },
          {
            headers: {
              Authorization: this.$auth.user.sub
            }
          }
        )
        .then(() => {
          this.$router.push(
            `/courses/${this.$route.params.course_id}/course_groups`
          )
        })
        .catch(e => {
          console.log(e)
        })
    }
  }
}
</script>

<style scoped></style>
