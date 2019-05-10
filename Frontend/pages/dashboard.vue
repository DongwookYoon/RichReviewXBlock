<template>
  <div class="container">
    <div class="courses">
      <h1>Enrolments:</h1>
      <div v-for="e in enrolments" :key="e.key" class="enrolments">
        <div class="course card" @click="$router.push(`courses/${e.id}`)">
          {{ e.title }}
        </div>
      </div>
      <h1>TAing:</h1>
      <div v-for="e in taing" :key="e.key" class="taing">
        <div class="course card" @click="$router.push(`courses/${e.id}`)">
          {{ e.title }}
        </div>
      </div>
      <h1>Instructing:</h1>
      <div v-for="e in instructing" :key="e.key" class="instructing">
        <div class="course card" @click="$router.push(`courses/${e.id}`)">
          {{ e.title }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable require-await,no-unused-vars,no-console,prettier/prettier,no-undef,camelcase */

import axios from 'axios'

export default {
  asyncData(context) {
    console.log({ test: context.app.$auth.user })
    return axios
      .get(`http://localhost:3000/courses`, {
        headers: {
          Authorization: context.app.$auth.user.sub
        }
      })
      .then(res => {
        console.log(res.data)
        return {
          enrolments: res.data.enrolments,
          taing: res.data.taing,
          instructing: res.data.teaching
        }
      })
      .catch(e => {
        console.log(e)
        return {
          enrolments: [],
          taing: [],
          instructors: []
        }
      })
  }
}
</script>

<style>
.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family: 'Quicksand', 'Source Sans Pro', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  color: #35495e;
  letter-spacing: 1px;
}

.subtitle {
  font-weight: 300;
  font-size: 42px;
  color: #526488;
  word-spacing: 5px;
  padding-bottom: 15px;
}

.links {
  padding-top: 15px;
}
</style>
