import https from 'https'
import User from '~/model/user'
import { NuxtAxiosInstance } from '@nuxtjs/axios'

export default class ApiHelper {
  static async getAllSubmissions (courseId: string,
    assignmentId: string,
    userId: string,
    $axios: NuxtAxiosInstance) {
    const response = await $axios.$get(
        `rr-api/courses/${
          courseId
        }/assignments/${assignmentId}/submissions`,
        {
          headers: {
            Authorization: userId
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
    )

    return response.submissions
  }

  static async isAssignmentMuted (courseId: string,
    assignmentId: string,
    groupId: string,
    userId: string,
    $axios: NuxtAxiosInstance
  ) {
    const res = await $axios.$get(
      `rr-api/courses/${
        courseId
      }/assignments/${
        assignmentId
        }/comment_submissions/${groupId}`,
      {
        headers: {
          Authorization: userId
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    return (res.muted === true) as boolean
  }

  /**
   * Mutes the submission of the specified assignment with a matching
   * submissionId
   * @param courseId
   * @param assignmentId
   * @param submissionId
   * @param userId
   * @param $axios
   */
  static async muteSubmission (courseId: string,
    assignmentId: string,
    submissionId: string,
    userId: string,
    $axios: NuxtAxiosInstance) {
    await $axios.$post(
      `rr-api/courses/${
        courseId}/assignments/${assignmentId}/mute/${submissionId}`,
      {},
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: userId
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
  }

  static async unmuteSubmission (courseId: string,
    assignmentId: string,
    submissionId: string,
    userId: string,
    $axios: NuxtAxiosInstance) {
    await $axios.$post(
      `rr-api/courses/${
        courseId
        }/assignments/${assignmentId}/unmute/${submissionId}`,
      {},
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: userId
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
  }

  /**
   * Mute all submissions for a given assignment.
   * @param courseId
   * @param assignmentId
   * @param userId
   * @param $axios
   */
  static async muteAllSubmissions (courseId: string,
    assignmentId: string,
    userId: string,
    $axios: NuxtAxiosInstance) {
    await $axios.$post(
        `rr-api/courses/${
          courseId
          }/assignments/${assignmentId}/mute_all`,
        {},
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: userId
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
    )
  }

  /**
   * Unmute all submissions for a given assignment.
   * @param courseId
   * @param assignmentId
   * @param userId
   * @param $axios
   */
  static async unmuteAllSubmissions (courseId: string,
    assignmentId: string,
    userId: string,
    $axios: NuxtAxiosInstance) {
    await $axios.$post(
        `rr-api/courses/${
          courseId
          }/assignments/${assignmentId}/unmute_all`,
        {},
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: userId
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
    )
  }

  public static async getViewerData (courseId: string,
    groupId: string,
    userId: string,
    $axios: NuxtAxiosInstance) : Promise<any> {
    return await $axios.$get(
        `rr-api/courses/${
          courseId
        }/groups/${groupId}`,
        {
          headers: {
            Authorization: userId
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
    )
  }

  /**
   * Checks that a user exists within RichReview and creates that user
   * if it does not exist.
   * @param user User with id to check
   */
  public static async ensureRichReviewUserExists (user : User, $axios: NuxtAxiosInstance) {
    console.log(`Ensure user ${user.id} exists in RichReview.`)
    await $axios.post(`/rr-api/lti_login`,
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
  public static async ensureUserEnrolled (courseId: string, user: User, $axios: NuxtAxiosInstance) {
    console.log(`Ensuring that the user ${JSON.stringify(user)} is enrolled in course ${
      courseId} with roles ${user.roles}`)

    await ApiHelper.ensureRichReviewUserExists(user, $axios)

    console.log('courseid' + courseId)
    /* Ensure user is enrolled in course */
    const userRes = await $axios.post(
      `/rr-api/courses/${
      courseId}/users/${user.id}`,
      { roles: user.roles },
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

  public static async ensureCourseExists (courseData: CourseData, userId: string, $axios: NuxtAxiosInstance) {
    // eslint-disable-next-line camelcase
    const course_res = await $axios.post(
      `/rr-api/courses/${courseData.id}`,
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
  public static async getAssignmentData (courseId: string, assignmentId: string, userId: string, $axios: NuxtAxiosInstance) {
    const resp = await $axios.get(`/rr-api/courses/${courseId
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

    return resp.data
  }

  /**
   *  Sign an lti response message via the RichReview backend and return the
   *  resulting jwt.
   **/
  public static async createDeepLinkJWT (ltiResponseMessage: any,
    userId: string,
    courseId: string,
    $axios: NuxtAxiosInstance,
    nonce?: string,
    audience?: string) {
    const message = ltiResponseMessage
    if (nonce) {
      message.nonce = nonce
    }

    message.aud = audience || process.env.canvas_path

    const res = await $axios.post(`/rr-api/lti/deeplink`,
      {
        message,
        courseId
      }, {
        headers: {
          Authorization: userId
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })

    return res.data.jwt
  }

  /**
   * Submits an assignment to LTI platform (i.e. Canvas)
   * so that it can be manually graded.
   *
   * IMPORTANT: This assignment is submitted in grading progress
   * state of 'pendingManual', so no grade is yet assigned. This
   * allows instructors to grade it manually.
   */
  public static async submitAssignmentToPlatform (launchMessage: any,
    courseId: string,
    userId: string,
    richReviewUrl: URL,
    $axios: NuxtAxiosInstance
  ) {
    await $axios.post(`/rr-api/lti/assignment`,
      {
        launchMessage,
        courseId,
        userId,
        richReviewUrl: richReviewUrl.toString()
      },
      {
        headers: {
          Authorization: userId
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
