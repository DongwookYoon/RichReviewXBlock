import https from 'https'
import axios from 'axios'
import { User } from '~/store/modules/LtiAuthStore'

export default class ApiHelper {
  public static async ensureRichReviewUserExists (user : User) {
    const loginRes : any = await axios.post(`https://${process.env.backend}:3000/lti_login`,
      {
        id: user.id,
        name: user.userName
      },
      {
        headers: {
          Authorization: user.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
  }
}
