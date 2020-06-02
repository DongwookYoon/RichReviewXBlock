import axios from 'axios'
import https from 'https'
import jwtUtil from './jwt-util'

export default class ClientAuth {


  private domain: string
  private toolUrl: string


  constructor(ltiDomain: string, toolUrl: string) {
    this.domain = ltiDomain
    this.toolUrl = toolUrl
  }

  /**
   * Obtain token which gives app access to Canvas Advantage Grading Services
   * line items and score to support assignment submission
   */
  public async getGradeServicesToken() : Promise<string> {
    const oauthPath = `${this.domain}/login/oauth2/auth`
    const assertionJWT: string | null = this.generateClientAssertion(oauthPath)

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



  private async generateClientAssertion() {

    let jwtResponse = await axios.post(`/api/jwt/client_assertion`)

    if (!jwtResponse.data)
       return null

    return jwtResponse.data.jwt



  }




}
