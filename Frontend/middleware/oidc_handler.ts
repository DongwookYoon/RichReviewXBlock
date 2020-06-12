import querystring from 'querystring'
import { Middleware } from '@nuxt/types'
import JwtUtil from '~/utils/jwt-util'

// eslint-disable-next-line camelcase
const oidc_handler: Middleware = async (context) => {
  /* If user already logged in, simply return */
  if (context.store.getters['LtiAuthStore/isLoggedIn'] === true) {
    console.log('Already logged in')
    return
  }

  /* Handle the OIDC POST request from Authentication endpoint.
    Request body is expected to be urlencoded data with
    state and id_token properties.

    This request is expected after RichReview has redirected the
    client (user agent) to the LTI platform Authentication Endpoint */
  if (process.server) {
    const loginData = querystring.parse(context.req.body) // Parse the expected URL encoded POST request body
    context.store.dispatch('LtiAuthStore/updateOidcState', loginData.state as string)

    console.log('Processing OIDC login response from Canvas...')
    const tokenData : any = await JwtUtil.getAndVerifyWithKeyset(loginData.id_token as string,
      process.env.canvas_public_key_set_url as string)

    if (tokenData === null) {
      console.warn('OIDC login failed. Invalid request from authorization endpoint.')
      return
    }

    context.store.dispatch('LtiAuthStore/logIn', { id: tokenData.sub }) // JWT sub claim contains user id.
  }

  /* Verify the OIDC state. Invalidate login if session state doesn't match state in the Nuxt store */
  else if (process.client) {
    const state : string | null = window.sessionStorage.getItem('rr_oidc_state')

    if (state === null || state !== context.store.getters['LtiAuthStore/oidcState']) {
      context.store.dispatch('LtiAuthStore/logout')
      console.warn('Invalid OIDC state. Logging out.')
    }
  }
}

// eslint-disable-next-line camelcase
export default oidc_handler
