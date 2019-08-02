<template>
  <div></div>
</template>

<script>
/* eslint-disable no-console */

import https from 'https'
import axios from 'axios'

export default {
  name: 'Authentication',
  asyncData(context) {
    console.log(
      JSON.parse(Buffer.from(context.query.info, 'base64').toString('utf8'))
    )
  },
  beforeMount() {
    this.login()
  },
  methods: {
    async login() {
      const res = await axios.post(
        `https://${process.env.backend}:3000/login`,
        {
          auth: this.$auth.user
        },
        {
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      console.log(process.env.NODE_ENV)
      console.log(res)
      this.$router.replace('/education/dashboard')
    }
  }
}
</script>

<style scoped></style>
