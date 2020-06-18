import https from 'https'
import axios from 'axios'

export default class ClientAuth {
  private domain: string
  private toolUrl: string

  constructor (ltiDomain: string, toolUrl: string) {
    this.domain = ltiDomain
    this.toolUrl = toolUrl
  }

  /**
   * Obtain token which gives app access to Canvas Advantage Grading Services
   * line items and score to support assignment submission
   */
  public async getGradeServicesToken () : Promise<string> {
    const tokenResp = await axios.get(
      `https://${process.env.backend}:3000/lti/grading_services_token`,
      {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })

    return tokenResp.data.access_token
  }

  /**
   *  Obtain an OAuth authorization token with lti deep link scopes
   *  via the RichReview backend API.
   *
   *  @param code:string The code obtained from the LTI authorization
   *  server during the initial authorization request.
   */
  public static async getDeepLinkingToken (code : string, redirectUri: string, clientId: string) {
    // const scope = 'https://purl.imsglobal.org/spec/lti-dl/scope/ltideeplinkingresponse'
    const tokenResp = await axios.post(
      `https://${process.env.backend}:3000/api/jwt/oauth_code_token`,
      {
        code,
        redirectUri,
        clientId
      }, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })

    if (!tokenResp.data.auth_info) {
      return null
    }

    return tokenResp.data.auth_info
  }

}
