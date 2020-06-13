
<template>
  <div>
    <p v-if="authFailed === true">
      Authentication failed. If this problem continues, please contact the system administrator for assistance.
    </p>
  </div>
</template>

<script lang="ts">
/* eslint-disable camelcase */
import { Component, Vue } from 'nuxt-property-decorator'
import * as _ from 'lodash'
import ClientAuth from '~/utils/client-auth'
import { mapActions } from 'vuex'
import { ITokenInfo } from '~/store/modules/LtiAuthStore'

@Component({
  methods: {
    ...mapActions('LtiAuthStore', {
      addTokenToStore: 'updatePlatformAuth'
    })
  }
})
export default class OAuthLti extends Vue {
  private authFailed ?: boolean = false


  public addTokenToStore !: (tokenInfo: ITokenInfo) => void // Mapped to updatePlatformAuth action in LtiAuthStore

  public mounted () {
    const query = this.$route.query
    const canvas_oauth_endpoint : string = process.env.canvas_oauth_endpoint as string
    const client_id : string = process.env.canvas_client_id as string
    const oauthRedirect : string = `https://${
        process.env.backend}${this.$route.path}`

    /* Handle the error OAuth response from Canvas */
    if (_.has(query, 'error')) {
      this.authFailed = true
      console.warn(query.error)
    }

    /* Request from app to begin OAuth flow */
    else if (_.has(query, 'code') === false && _.has(query, 'redirect_uri') === true) {
      const redirectUri : string = query.redirect_uri as string

      // Generate pseudorandom key for accessing the redirect_uri again
      const stateKey : string = (`RichReview_${
        Date.now()}_${Math.random() * 10000}`).replace('.', '_')

      const platformOauthUrl = `${canvas_oauth_endpoint}?client_id=${
          encodeURIComponent(client_id)}&response_type=code&state=${
            encodeURIComponent(stateKey)}&redirect_uri=${
              encodeURIComponent(oauthRedirect)}&scope=${
                encodeURIComponent('scope=/auth/userinfo')}`

      window.sessionStorage.setItem(stateKey, redirectUri)          //Store redirect URI in session storage

      console.log('Rich Review is requesting OAuth token for: ' + redirectUri)
      console.log('Redirecting to Canvas OAuth endpoint with URL ' + platformOauthUrl)

      window.location.replace(platformOauthUrl)
    }

    /*  Handle the redirect with OAuth response from Canvas containing code in query string */
    else if (_.has(query, 'code')) {
      const code : string | null = query.code as string | null
      let stateKey : string = query.state as string

      console.log('Got authorization code from Canvas')
      if (!stateKey) {
        throw new Error(`Error. Invalid OAuth response from Canvas.
        State query param must be included to access redirect_uri`)
      }

      stateKey = decodeURIComponent(stateKey)
      const redirectUri: string | null = window.sessionStorage.getItem(stateKey)

      if (redirectUri === null) {
        throw new Error(`Error. The redirect_uri could not be retrieved from
        session storage for state key ${stateKey}`)
      }

      ClientAuth.getDeepLinkingToken(code as string, oauthRedirect, client_id).then((authInfo) => {
        this.addTokenToStore({
          token: authInfo.access_token,
          name: authInfo.user.name
        })
        this.$router.push(redirectUri) // Redirect user back to original page where auth was initiated
      }).catch((reason) => {
        console.warn('Error getting OAuth token in code flow authorization grant. Reason ' + reason)
        this.authFailed = true
      })
    }
    else {
      console.warn('Invalid request to oauth handler. Request URL was ' + this.$route.fullPath)
      this.authFailed = true
    }
  }
}

</script>

<style scoped>

</style>
