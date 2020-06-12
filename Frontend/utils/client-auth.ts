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
    const oauthPath = `${this.domain}/login/oauth2/auth`
    const assertionJWT: string | null = await this.generateClientAssertion()

    if (assertionJWT === null) {
      throw new Error('Error. Could not create client assertion during client credential grant.')
    }
    const requestData = {
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertionJWT,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score'
    }

    /* Get JSON response with token */
    const tokenResp = await axios.post(oauthPath, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
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
  public static async getDeepLinkingToken (code : string) {
    // const scope = 'https://purl.imsglobal.org/spec/lti-dl/scope/ltideeplinkingresponse'
    const tokenResp = await axios.post(
      `https://${process.env.backend}:3000/api/jwt/oauth_token`,
      {
        code
        // scope
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

  private async generateClientAssertion () {
    const jwtResponse = await axios.get(
      `https://${process.env.backend}:3000/api/jwt/client_assertion`,
      {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })

    if (!jwtResponse.data) {
      return null
    }

    return jwtResponse.data.jwt
  }
}
