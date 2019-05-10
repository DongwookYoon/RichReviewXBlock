<template>
  <div></div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'Authentication',
  beforeMount() {
    this.login()
  },
  methods: {
    login() {
      axios
        .post('http://localhost:3000/login', {
          auth: this.$auth.user
        })
        .then(() => {
          this.$router.replace('/dashboard')
        })
        .catch(e => {
          console.log(e)
          this.$router.replace('/login')
        })
    }
  }
}
</script>

<style scoped></style>
