import { v4 as uuidv4 } from 'uuid'

export default class OIDCUtil {
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

    let issPath: URL
    let targetLinkPath: URL
    try {
      issPath = new URL(iss)
      targetLinkPath = new URL(targetLinkURI)
    }
    catch (ex) {
      console.warn(ex)
      return false
    }

    if ((issPath.host.toLowerCase() !== `${(process.env.canvas_host as string).toLowerCase()}`)) {
      console.warn('Invalid issuer in OIDC login request.')
      console.warn(`Expected host is ${process.env.canvas_host} but issuer is ${issPath.host}.`)
      return false
    }

    if (targetLinkPath.host.toLowerCase() !== `${(process.env.hostname as string).toLowerCase()}`) {
      console.warn('Invalid resource link in OIDC login request')
      console.warn(`Expected target link host is ${process.env.hostname} but target link path host is ${targetLinkPath.host}`)
      return false
    }

    return true
  }
}
