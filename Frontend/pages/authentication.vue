<template>
  <div></div>
</template>

<script>
/* eslint-disable no-console */

import https from 'https'
import axios from 'axios'

export default {
  name: 'Authentication',
  beforeMount() {
    this.login()
  },
  methods: {
    async login() {
      await axios.post(
        'https://localhost:3000/login',
        {
          auth: this.$auth.user
        },
        {
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      this.$router.replace('/dashboard')
    }
  }
}
</script>

<style scoped></style>
