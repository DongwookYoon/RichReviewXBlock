
<template>
  <div>
    <p v-if="authSuccess===false">
      Authentication failed. If this problem continues, please contact the system administrator for assistance.
    </p>
  </div>
</template>

<script lang="ts">
/* eslint-disable camelcase */
import { Component, Vue } from 'nuxt-property-decorator'
import * as _ from 'lodash'
import ClientAuth from '~/utils/client-auth'

@Component
export default class OAuthLti extends Vue {
  private authSuccess !: boolean

  public mounted () {
    const query = this.$route.query
    const canvas_path = process.env.canvas_path
    const client_id = process.env.canvas_client_id

    /* Handle the error OAuth response from Canvas */
    if (_.size(query) === 0 || _.has(query, 'error')) {
      this.authSuccess = false
    }

    /* Request from app to begin OAuth flow */
    else if (_.has(query, 'code') === false && _.has(query, 'redirect_uri') === true) {
      const redirect_uri : string = query.redirect_uri as string

      // Generate pseudorandom key for accessing the redirect_uri again
      const stateKey : string = (`RichReview_${Date.now()}_${Math.random() * 10000}`).replace('.', '_')
      window.sessionStorage.setItem(stateKey, redirect_uri)

      window.location.replace(`${canvas_path}/login/oauth2/auth?client_id=${
          client_id}&response_type=code&state=${stateKey}`)
    }

    /*  Handle the redirect with OAuth response from Canvas containing code in query string */
    else if (_.has(query, 'code')) {
      const code : string | null = query.code as string | null
      const stateKey : string | null = query.state as string | null

      if (stateKey === null) {
        throw new Error('Error. State query param must be included to access redirect_uri')
      }
      const redirect_uri: string | null = window.sessionStorage.getItem('redirect_uri') as string
      if (redirect_uri === null) {
        throw new Error('Error. The redirect_uri could not be retrieved from session storage')
      }

      ClientAuth.getDeepLinkingToken(code as string).then((authInfo) => {
        this.$store.dispatch('LtiAuthStore/updatePlatformAuth',
          {
            token: authInfo.access_token,
            name: authInfo.user.name
          })
        this.$router.push(redirect_uri) // Redirect user back to original page where auth was initiated
      }).catch((reason) => {
        console.warn('Error getting OAuth token in code flow authorization grant. Reason ' + reason)
        alert(`An error occurred while logging in.
            Please try again. Contact the system adminstrator if this error continues.`)
        this.authSuccess = false
      })
    }
    else {
      console.warn('Invalid request to oauth handler. Request URL was ' + this.$route.fullPath)
      alert(`An error occurred while logging in.
          Please try again. Contact the system adminstrator if this error continues.`)
      this.authSuccess = false
    }
  }
}
</script>

<style scoped>

</style>
