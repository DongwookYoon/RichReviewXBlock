import { Middleware } from '@nuxt/types'
import {lti_auth} from '~/store';
import querystring from 'querystring';
import JwtUtil from '../utils/jwt-util';


const oidc_handler: Middleware = async (context) => {
  /* If user already logged in, simply return */
  if (lti_auth.isLoggedIn === true) {
    return
  }

  /*Handle the OIDC POST request from Authentication endpoint.
    Request body is expected to be urlencoded data with
    state and id_token properties.

    This request is expected after RichReview has redirected the
    client (user agent) to the LTI platform Authentication Endpoint*/
  if (process.server) {
    const loginData = querystring.parse((context.req as any).body);   // Parse the expected URL encoded POST request body
    lti_auth.updateOidcState(loginData.state as string);

    const tokenData : any = await JwtUtil.getAndVerifyWithKeyset(loginData.id_token as string,
      process.env.canvas_public_key_set_url as string)

    if (tokenData === null) {
      console.warn('OIDC login failed. Invalid request from authorization endpoint.')
      return
    }

    lti_auth.logIn({userId: tokenData.sub})     // JWT sub claim contains user id.
  }

  /* Verify the OIDC state. Invalidate login if session state doesn't match state in the Nuxt store */
  else if (process.client){
    const state : string | null = window.sessionStorage.getItem('rr_oidc_state');

    if (state === null || state !== lti_auth.oidcState) {
      lti_auth.logOut();
    }

  }
}

export default oidc_handler


