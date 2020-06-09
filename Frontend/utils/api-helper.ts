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

  public static async getAssignmentData (courseId: string, assignmentId: string, userId: string) {
    const resp = await await axios.get(`https://${process.env.backend}:3000/courses/${courseId
        }/assignments/${assignmentId}`,
    {
      headers: {
        Authorization: userId
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    }
    )

    console.log(JSON.stringify(resp.data))
    return resp.data
  }
}
