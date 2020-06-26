import https from 'https'
import axios from 'axios'
import { ITokenInfo } from '~/store/modules/LtiAuthStore'

export default class ClientAuth {
  /**
   * Obtain token which gives app access to Canvas Advantage Grading Services
   * line items and score to support assignment submission
   */
  public static async getGradeServicesToken () : Promise<string> {
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
   * Checks to determine if a given token is expired. Expiration
   * is calculated using the configured token duration in config.
   * @param token ITokenInfo containing token value and creation time.
   */
  public static isTokenValid (token : ITokenInfo) : boolean {
    if (!token.creationTime) {
      return false
    }

    const duration : number = parseInt(process.env.canvas_token_duration as string)
    const now : Date = new Date()
    const created : Date = token.creationTime
    const dif = (now.getTime() - created.getTime()) / 1000

    return (dif < duration)
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
