
<template>
  <div><p>Logging in...</p></div>
</template>

<script lang="ts">
/* eslint-disable camelcase */
import { v4 as uuidv4 } from 'uuid'
import { Component, Vue } from 'nuxt-property-decorator'
import oidcUtil from '~/utils/oidc-util'

/**
 *  Page handles OIDC login request from LTI Platform (i.e. Canvas) for
 *  third party login. No user interaction is involved.
 *
 *  As per LTI IMS Security Framework spec, the tool MUST support
 *  both GET and POST OIDC login requests.
 *  @see https://www.imsglobal.org/spec/security/v1p0/#message-security-and-message-signing
 *
 *  Note that for POST requests, the incoming request data has been handled by
 *  body parser in the Express (legacy) server middleware. Therefore, it is already
 *  in JSON format.
 */
@Component({
  asyncData ({ query, redirect, req }) {
    if (!process.server) {
      return
    }

    let iss : string | null = null
    let login_hint : string | null = null
    let target_link_uri : string | null = null
    let lti_message_hint : string | null = null

    if (req.method && req.method.toUpperCase() === 'GET') {
      iss = query.iss as string | null
      login_hint = query.login_hint as string | null
      target_link_uri = query.target_link_uri as string | null
      lti_message_hint = query.lti_message_hint as string | null
    }

    else if (req.method && req.method.toUpperCase() === 'POST') {
      const reqBody = req.body

      iss = reqBody.iss
      login_hint = reqBody.login_hint
      target_link_uri = reqBody.target_link_uri
      lti_message_hint = reqBody.lti_message_hint
    }

    else {
      console.warn(`Invalid OIDC request. Request method must be GET or POSt, but it is ${req.method}.`)
      redirect('/')
    }

    if (oidcUtil.verifyRequest(iss, login_hint, target_link_uri) === false) {
      console.warn('Error. Invalid OIDC third-party login request. ')
      redirect('/')
    }

    const state : string = uuidv4()
    const authRedirectUrl : string = oidcUtil.generateAuthRequestUrl(login_hint as string,
      target_link_uri as string,
      state,
      ((lti_message_hint !== null) ? lti_message_hint : undefined))


    return {
      authRedirectUrl,
      state
    }
  }
})
export default class LoginLti extends Vue {
  private authRedirectUrl ?: string
  private state ?: string

  public mounted () {
    console.log('mounted')
    if (this.state && this.authRedirectUrl) {
      window.sessionStorage.setItem('rr_oidc_state', this.state)
      console.log('OIDC login succeeded. Redirecting to: ' + this.authRedirectUrl)
      window.location.replace(this.authRedirectUrl)
    }
    else {
      console.warn(`Invalid ${this.state ? 'state' : 'authRedirectUrl'} for OIDC login`)
      alert('Accessing RichReview failed. Please try again. If this issue continues, contact ' +
      ' the RichReview system administrator.')
      window.location.replace('/')
    }
  }
}

</script>

<style scoped>

</style>
