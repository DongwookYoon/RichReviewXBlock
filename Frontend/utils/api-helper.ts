import https from 'https'
import axios from 'axios'
import { IUser } from '~/store/modules/LtiAuthStore'


export default class ApiHelper{

  public static async ensureRichReviewUserExists(user : IUser){
    const loginRes = await axios.post(`https://${process.env.backend}:3000/lti_login`,
        {
          id: user.userId,
          name: user.userName
        },
        {
          headers: {
            Authorization: user.userId
        },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        })
  }


}
