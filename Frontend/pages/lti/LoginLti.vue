
<template>
  <div><p>Logging in...</p></div>
</template>

<script lang="ts">
/* eslint-disable camelcase */
import { v4 as uuidv4 } from 'uuid'
import { Component, Vue } from 'nuxt-property-decorator'
import * as _ from 'lodash'

/**
 *  Page handles OIDC login request from LTI Platform (i.e. Canvas) for
 *  third party login. No user interaction is involved.
 */
@Component({
  asyncData ({ query, redirect }) {
    const iss : string | null = query.iss as string | null
    const login_hint : string | null = query.login_hint as string | null
    const target_link_uri : string | null = query.target_link_uri as string | null

    console.log(`Incoming OIDC login request: ISS=${iss} login_hint=${login_hint} target_link_uri=${target_link_uri}`)
    if (LoginLti.verifyRequest(iss, login_hint, target_link_uri) === false) {
      console.warn('Error. Invalid OIDC third-party login request. ')
      redirect('/')
    }

    const state : string = uuidv4()
    const authRedirectUrl : string = LoginLti.generateAuthRequestUrl(login_hint as string,
      target_link_uri as string,
      state)

    return {
      authRedirectUrl,
      state
    }
  }
})
export default class LoginLti extends Vue {
  private authRedirectUrl ?: string
  private state ?: string

  public created () {
    if (this.state && this.authRedirectUrl) {
      window.sessionStorage.setItem('rr_oidc_state', this.state)
      window.location.replace(this.authRedirectUrl)
    }
    else {
      window.location.replace('/')
    }
  }

  public static generateAuthRequestUrl (loginHint: string, targetLinkURI: string, state: string) : string {
    const authEndpoint : string = process.env.canvas_oidc_endpoint as string

    /* Params required to make OIDC auth request to platform. Note state and nonce are GUIDs */
    const queryParams : any = {
      scope: 'openid',
      response_type: 'id_token',
      client_id: process.env.canvas_client_id,
      redirect_uri: targetLinkURI,
      login_hint: loginHint,
      state,
      response_mode: 'form_post',
      nonce: uuidv4(),
      prompt: 'none'
    }

    const searchParams = new URLSearchParams()

    for (const key in queryParams) {
      searchParams.append(key, `${queryParams[key]}`)
    }

    return `${authEndpoint}?${searchParams}`
  }

  public static verifyRequest (iss: string | null,
    loginHint: string | null,
    targetLinkURI: string | null) : boolean {
    if (!iss) {
      console.warn('No iss provided in request query.')
      return false
    }

    if (!loginHint) {
      console.warn('No login hint provided in request query.')
      return false
    }

    if (!targetLinkURI) {
      console.warn('No target link URI provided in request query.')
      return false
    }

    const issPath: URL = new URL(iss)

    if ((issPath.host.toLowerCase() !== `${(process.env.canvas_host as string).toLowerCase()}`)) {
      console.warn('Invalid issuer in OIDC login request.')
      console.warn(`Expected host is ${process.env.canvas_host} but issuer is ${issPath.host}.`)
      return false
    }

    const targetLinkPath = new URL(targetLinkURI)
    if (targetLinkPath.host.toLowerCase() !== `${(process.env.hostname as string).toLowerCase()}`) {
      console.warn('Invalid resource link in OIDC login request')
      console.warn(`Expected target link host is ${process.env.hostname} but target link path host is ${targetLinkPath.host}`)
      return false
    }

    return true
  }
}

</script>

<style scoped>

</style>
