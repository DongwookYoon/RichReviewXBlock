import { Middleware } from '@nuxt/types'
import JwtUtil from '~/utils/jwt-util'

// eslint-disable-next-line camelcase
const oidc_handler: Middleware = async ({ store, req }) => {
  /* If user already logged in, simply return */
  if (store.getters['LtiAuthStore/isLoggedIn'] === true) {
    console.log('Already logged in')
    return
  }

  /* Handle the OIDC POST request from Authentication endpoint.
    Request body is expected to be urlencoded data with
    state and id_token properties.

    This request is expected after RichReview has redirected the
    client (user agent) to the LTI platform Authentication Endpoint

    Note that URL encoded request data has been pre-processed by body-parser in
    Express Server middleware (legacy) before being handled by this middleware module.
    Therefore, data is available as JSON object in req.body. */
  if (process.server) {
    const loginData = req.body
    store.dispatch('LtiAuthStore/updateOidcState', loginData.state as string)

    console.log('Processing OIDC login response from Canvas...')
    const tokenData : any = await JwtUtil.getAndVerifyWithKeyset(loginData.id_token as string,
      process.env.canvas_public_key_set_url as string)

    if (tokenData === null) {
      console.warn('OIDC login failed. Invalid request from authorization endpoint.')
      return
    }

    store.dispatch('LtiAuthStore/logIn', { id: tokenData.sub, userName: 'Canvas User' }) // JWT 'sub' claim contains unique global user id.
  }

  /* Verify the OIDC state. Invalidate login if session state doesn't match state in the Nuxt store */
  else if (process.client) {
    const state : string | null = window.sessionStorage.getItem('rr_oidc_state')

    if (state === null || state !== store.getters['LtiAuthStore/oidcState']) {
      store.dispatch('LtiAuthStore/logout')
      console.warn('Invalid OIDC state. Logging out.')
    }
  }
}

// eslint-disable-next-line camelcase
export default oidc_handler
