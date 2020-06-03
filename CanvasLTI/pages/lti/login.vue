<template>

</template>

<script lang="ts">
/* eslint-disable camelcase */
import * as https from 'https'
import { v5 as uuidv5 } from 'uuid'
import { Component, Vue } from 'nuxt-property-decorator'
import * as _ from 'lodash'
import { lti_auth, IAuthPayload } from '~/store'
import { initialiseStores } from '~/utils/store-accessor';

/**
 *  Page handles OIDC login request from LTI Platform (i.e. Canvas) for
 *  third party login. No user interaction is involved.
 */
@Component({
  asyncData({query, redirect}){
    const iss : string | null = query.iss as string | null
    const login_hint : string | null = query.login_hint as string | null
    const target_link_uri : string | null = query.target_link_uri as string | null

    if (Login.verifyRequest(iss, login_hint, target_link_uri) === false) {
      console.warn('Invalid OIDC third-party login request')
      alert('Invalid login request')
      redirect('/')
    }

    const state : string = uuidv5()
    const authRedirectUrl : string = Login.generateAuthRequestUrl(login_hint as string,
      target_link_uri as string,
      state)

    return {
      authRedirectUrl,
      state
    }

  }
})
export default class Login extends Vue {
  private authRedirectUrl ?: string
  private state ?: string

  public created(){
    if (this.state && this.authRedirectUrl) {
      window.sessionStorage.setItem('rr_oidc_state', this.state)
      window.location.replace(this.authRedirectUrl)
    }
    else {
      window.location.replace('/')
    }
  }


  public static generateAuthRequestUrl(loginHint: string, targetLinkURI: string, state: string) : string {
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
      nonce: uuidv5(),
      prompt: 'none'
    }

    let searchParams = new URLSearchParams()

    for (let key in queryParams) {
      searchParams.append(key, `${queryParams[key]}`)
    }

    return `${authEndpoint}?${searchParams}`

  }

  public static verifyRequest(iss: string | null,
  loginHint: string | null,
  targetLinkURI: string | null) : boolean {

    if (iss === null || loginHint === null || targetLinkURI === null) {
      return false
    }

    const issPath: URL = new URL(iss)

    if ( !(issPath.host !== `${process.env.canvas_host}`) ) {
       console.warn('Invalid issuer in OIDC login request.')
       return false
    }

    const targetLinkPath : URL = new URL(targetLinkURI)

    if ( !(targetLinkPath.host !== `${process.env.hostname}`)) {
      console.warn('Invalid resource link in OIDC login request')
      return false
    }

    return true
  }


}


</script>

<style scoped>

</style>
