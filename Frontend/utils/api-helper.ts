import https from 'https'
import { ITokenInfo } from '../store/modules/LtiAuthStore'
import JwtUtil from './jwt-util'
import axios from 'axios'
import { User } from '~/store/modules/LtiAuthStore'
import { NuxtAxiosInstance } from '@nuxtjs/axios'

export default class ApiHelper {
  /**
   * Checks that a user exists within RichReview and creates that user
   * if it does not exist.
   * @param user User with id to check
   */
  public static async ensureRichReviewUserExists (user : User) {
    console.log(`Ensure user ${user.id} exists in RichReview.`)
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

  /**
   * Ensures that a RichReview user exists and is is enrolled in a given course.
   *
   * @param courseId Course ID corresponding to Canvas course ID
   * @param user User object representing
   * @param roles Determine roles of user within course
   */
  public static async ensureUserEnrolled (courseId: string, user: User, roles: string[]) {
    await ApiHelper.ensureRichReviewUserExists(user)

    console.log('courseid' + courseId)
    /* Ensure user is enrolled in course */
    const userRes = await axios.post(
      `https://${process.env.backend}:3000/courses/${
      courseId}/users/${user.id}`,
      { roles },
      {
        headers: {
          Authorization: user.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })

    if (userRes.status > 202) {
      throw new Error(`Could not ensure that the user ${user.id} is enrolled in the course ${courseId}`)
    }
  }

  public static async ensureCourseExists (courseData: CourseData, userId: string) {
    // eslint-disable-next-line camelcase
    const course_res = await axios.post(
      `https://${process.env.backend}:3000/courses/${courseData.id}`,
      courseData, {
        headers: {
          Authorization: userId
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })

    if (course_res.status > 202) {
      throw new Error(`Could not ensure that the course ${courseData.id} exists in RR`)
    }
  }

  /**
   * Get assignment data from RichReview.
   * @param courseId
   * @param assignmentId
   * @param userId
   */
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

    if (resp.status !== 200) {
      throw new Error(`Could not get assignment data for assignment id ${
        assignmentId} and course id ${courseId}`)
    }

    console.log(JSON.stringify(resp.data))
    return resp.data
  }

  /**
   * Submits an assignment to LTI platform (i.e. Canvas)
   * so that it can be manually graded.
   *
   * IMPORTANT: This assignment is submitted in grading progress
   * state of 'pendingManual', so no grade is yet assigned. This
   * allows instructors to grade it manually.
   */
  public static async submitAssignmentToCanvas (launchMessage: any,
    courseId: string,
    clientCredentialsToken: string,
    userId: string,
    richReviewUrl: URL) {
    const assignmentResourceId : string = launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/resource_link'].id

    let lineItemId : string = ''

    const lineItemsResp = await axios.get(
        `${process.env.canvas_path}/api/lti/courses/${courseId}/line_items`,
        {
          headers: {
            Accept: 'application/json+canvas-string-ids',
            Authorization: `Bearer ${clientCredentialsToken}`
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        })

    const lineItems = lineItemsResp.data // The parsed JSON which contains array of line items

    /* Find the ID of the line item for which we want to create a submission in gradebook */
    for (const curItem of lineItems) {
      if (curItem.resourceLinkId === assignmentResourceId) {
        lineItemId = curItem.id
        break
      }
    }
    if (lineItemId === '') {
      console.warn('Error. Could not find a line item to create assignment submission')
      throw new Error('Could not find a line item to create assignment submission')
    }

    const scoreData : any = {
      timestamp: `${new Date().toISOString()}`,
      activityProgress: 'Submitted',
      gradingProgress: 'PendingManual',
      userId: `${userId}`
    }
    scoreData['https://canvas.instructure.com/lti/submission'] = {
      new_submission: true,
      submission_type: 'basic_lti_launch',
      submission_data: `${richReviewUrl}`
    }

    // TODO Make sure this is secure. Call backend to sign.
    const scoreJWT = await JwtUtil.encodeJWT(scoreData, launchMessage.nonce)
    if (scoreJWT === null) {
      throw new Error('Creating the JWT failed.')
    }

    const urlEncodedJWT = JwtUtil.createJwtFormUrlEncoded(scoreJWT)

    /* Send the score resource to Canvas to indicate submission in gradebook */
    axios.post(
          `${process.env.canvas_path}/api/lti/courses/${courseId}/line_items/${lineItemId}/scores`,
          urlEncodedJWT,
          {
            headers: {
              Authorization: `Bearer ${clientCredentialsToken}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          })
  }
}

export interface CourseData {
  id: string,
  title: string
  dept: string
  number: string
  section: string
}
