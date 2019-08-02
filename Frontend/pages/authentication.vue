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
    console.log(context.query.info)
  },
  beforeMount() {
    console.log(this.$route)
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
    },
    decrypt(objJsonB64) {
      return JSON.parse(Buffer.from(objJsonB64, 'base64').toString('utf8'))
    }
  }
}
</script>

<style scoped></style>
