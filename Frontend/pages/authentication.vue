<template>
  <div></div>
</template>

<script>
/* eslint-disable no-console */

import https from 'https'
import axios from 'axios'
import * as certs from '../ssl/certs'

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
    decrypt(text) {
      const iv = Buffer.from('richreview', 'hex')
      const encryptedText = Buffer.from(text, 'hex')
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from('richreview'),
        iv
      )
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString()
    }
  }
}
</script>

<style scoped></style>
