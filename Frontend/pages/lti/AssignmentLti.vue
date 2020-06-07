<template>
  <div v-if="isCreated===true">
    <!--TODO determine what data needs to be passed to components, and load it in
      this page, instead of in the component, if possible -->
    <p>assignment.vue test </p>
    <p>Component:</p>

    <!--If user has submitted the assignment OR user is has role of instructor or TA then
        show the assignment in the RichReview viewer-->
    <RichReviewViewer
      v-if="submit_data.submitted === true ||
        userRoles.includes(INSTRUCTOR) || userRoles.includes(TA)"
      class="rich-review-view"
      :submit_data="submit_data"
      :user="user"
      :course_id="courseId"
    />

    <!--Else if user role is student then  -->
    <div v-else-if="userRoles.includes(STUDENT)">
      <!-- If assignment type is document_submission then -->
      <DocumentSubmitter
        v-if="assignmentType==='document_submission'"
        class="document-submitter"
        :user_id="user.id"
        @submit-assignment="handleSubmit"
      />

      <!--else if assignment_type is comment_submission then -->
      <CommentSubmitter
        v-else-if="assignmentType==='comment_submission'"
        class="rich-review-view"
        :title="assignmentTitle"
        :user="user"
        :submit_data="submit_data"
        :course_id="courseId"
        @submit-assignment="handleSubmit"
      />
    </div>
  </div>
</template>

<script lang="ts">
import * as https from 'https'
import querystring from 'querystring'
import { Component, Vue } from 'nuxt-property-decorator'
import JwtUtil from '~/utils/jwt-util'
import ClientAuth from '~/utils/client-auth'
import DocumentSubmitter from '~/components/lti/document_submitter.vue'
import CommentSubmitter from '~/components/lti/comment_submitter.vue'
import RichReviewViewer from '~/components/lti/richreview_viewer.vue'
// eslint-disable-next-line camelcase
import ApiHelper from '~/utils/api-helper'
import { NuxtAxiosInstance } from '@nuxtjs/axios'
import { User } from '~/store/modules/LtiAuthStore'

export class SubmitData {
  viewerLink : string = ''
  accessCode ?: string
  docID ?: string
  groupID ?: string
  submitted ?: boolean
}

export class Roles {
  public static readonly INSTRUCTOR : string = 'instructor'
  public static readonly TA : string = 'ta'
  public static readonly STUDENT : string = 'student'

  public static getUserRoles (ltiRoles : string[]) : string[] {
    const friendlyRoles : string[] = []

    for (const curRole of ltiRoles) {
      const curRoleLower = curRole.toLowerCase()
      if (curRoleLower.includes('student') || curRole.includes('learner')) {
        friendlyRoles.push(this.STUDENT)
      }
      else if (curRoleLower.includes('instructor')) {
        friendlyRoles.push(this.INSTRUCTOR)
      }
      else if (curRoleLower.includes('teachingassistant')) {
        friendlyRoles.push(this.TA)
      }
    }

    return friendlyRoles
  }
}

const testUser : User = {
  id: 'google_102369315136728943851',
  userName: 'Test User'
}

const testDataStudent = {
  assignmentTitle: 'Test Assignment',
  assignmentType: 'comment_submission',
  assignmentId: '1_1591495925951_87362',
  userRoles: ['student'],
  courseId: '1',
  submit_data: {
    viewerLink: 'access_code=542cc5809e6f3d8670f47fa722691f70c1c5cd07&docid=google_109022885000538247847_1591495925932&groupid=google_102369315136728943851_1591495926073',
    submitted: false
  },
  user: testUser
}

@Component({
  // middleware: 'oidc_handler',            // Handle OIDC login request

  components: {
    DocumentSubmitter,
    CommentSubmitter,
    RichReviewViewer
  },

  async asyncData (context) {
    if (process.env.test_mode &&
        (process.env.test_mode as string).toLowerCase() === 'true') {
      context.store.dispatch('LtiAuthStore/logIn', testDataStudent.user)
      return testDataStudent
    }

    if (context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
      return { }
    }

    if (process.server) {
      let jwt : string
      let ltiLaunchMessage : object | null = null

      try {
      // Note that the platform sends the encoded jwt in a form with a single parameter, which
      //   is 'JWT'. The form is parsed here to get the jwt.
        jwt = querystring.parse((context.req as any).body).JWT as string
        ltiLaunchMessage = await AssignmentLti.getLaunchMessage(jwt, process.env.canvas_public_key_set_url as string)
      }
      catch (ex) {
        console.warn('Error occurred while getting ltiLaunchMessage from jwt. Reason: ' + ex)
        ltiLaunchMessage = null
      }
      finally {
        if (ltiLaunchMessage === null) {
          return {}
        }
      }

      const launchMessage = ltiLaunchMessage as any
      const userRoles = Roles.getUserRoles(launchMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])
      const isInstructorOrTA : boolean = (userRoles.includes(Roles.INSTRUCTOR) || userRoles.includes(Roles.TA))
      const courseId = launchMessage[
        'https://purl.imsglobal.org/spec/lti/claim/context'].id

      const assignmentType : string = context.params.assignment_type
      const assignmentId : string = context.params.assignment_key

      try {
        await AssignmentLti.ensureUserEnrolled(courseId, context.store.getters['LtiAuthStore/authUser'], userRoles, context.$axios)
      }
      catch (ex) {
        console.warn('Could not verify user enrollment in course. Reason: ' + ex)
        return {}
      }

      let resp
      try {
        resp = await context.$axios.$get(`https://${process.env.backend}:3000/courses/${
        courseId
        }/assignments/${assignmentId}`,
        {
          headers: {
            Authorization: this.$store.getters['LtiAuthStore/authUser'].userId // Pass Canvas userId in Authorization header
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
        )
      }
      catch (e) {
        console.warn(e)
        resp = null
      }
      finally {
        if (!resp || !resp.data) {
          console.warn('Assignment data could not be loaded. ')
          return { }
        }
      }

      // eslint-disable-next-line camelcase
      const submit_data : SubmitData = {
        submitted: resp.data.submission_status,
        viewerLink: userRoles.includes(Roles.STUDENT) ? resp.data.link : resp.data.grader_link
      }

      return {
        assignmentTitle: resp.data.title,
        assignmentType,
        assignmentId,
        launchMessage,
        submit_data,
        userRoles,
        courseId,
        user: this.$store.getters['LtiAuthStore/authUser']
      }
    }
  },

  fetch (context) {
    if (context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
      console.warn('OIDC login failed')
    }
  }

})
export default class AssignmentLti extends Vue {
  public readonly INSTRUCTOR : string = Roles.INSTRUCTOR
  public readonly TA : string = Roles.TA
  public readonly STUDENT : string = Roles.STUDENT

  private isCreated: boolean = false

  private assignmentTitle ?: string
  private assignmentType ?: string
  private assignmentId ?: string
  private launchMessage ?: any
  // eslint-disable-next-line camelcase
  private submit_data !: SubmitData
  private userRoles ?: string[]
  private courseId ?: string
  private user?: User

  public created () {
    if (this.$store.getters['LtiAuthStore/isLoggedIn'] === true) {
      console.log(`Logged in user: ${this.$store.getters['LtiAuthStore/authUser'].userId}`)
      this.isCreated = true

      this.submit_data.accessCode = AssignmentLti.getQueryVariable('access_code', this.submit_data.viewerLink)
      this.submit_data.docID = AssignmentLti.getQueryVariable('docid', this.submit_data.viewerLink)
      this.submit_data.groupID = AssignmentLti.getQueryVariable('groupid', this.submit_data.viewerLink)
    }
  }

  public mounted () {
    if (this.$store.getters['LtiAuthStore/isLoggedIn'] === false) {
      alert('You must be logged in to Canvas to view this assignment.')
      window.location.replace(process.env.canvas_path as string)
    }

    console.log(this)
  }

  public async handleSubmit () {
    const courseId : string = this.launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/context'].id
    let assignmentResp

    try {
      await this.updateClientCredentials() // Update client credentials token in store
    }
    catch (ex) {
      console.warn('OAuth client credential grant for assignment submission failed. Reason: ' + ex)
      alert('Could not submit assignment. Please try again.')
      return
    }

    try {
      assignmentResp = await this.$axios.$get(
         `https://${process.env.backend}:3000/courses/${
        courseId
      }/assignments/${this.assignmentId}`,
         {
           headers: {
             Authorization: this.$store.getters['LtiAuthStore/authUser'].userId // Pass the Canvas user id in Authorization header
           },
           httpsAgent: new https.Agent({
             rejectUnauthorized: false
           })
         }
      )
    }
    catch (e) {
      console.warn('Getting updated assignment data on submit failed. Reason: ' + e)
      alert(`
          Error. Could not submit assignment to Canvas.
          Contact the system adminstrator for assistance if this continues.`)
      return
    }

    const submissionId = assignmentResp.data.grader_submission_id
    const submissionURL = `${this.$route.path}?${assignmentResp.data.link}&submission_id=${submissionId}`
    const assignmentResourceId : string = this.launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/resource_link'].id
    let lineItemId : string = ''

    try {
      const lineItemsResp = await this.$axios.$get(
        `${process.env.canvas_path}/api/lti/courses/${courseId}/line_items`,
        {
          headers: {
            Accept: 'application/json+canvas-string-ids',
            Authorization: `Bearer ${this.$store.getters['LtiAuthStore/clientCredentialsToken']}`
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
        userId: `${this.$store.getters['LtiAuthStore/authUser'].userId}`
      }
      scoreData['https://canvas.instructure.com/lti/submission'] = {
        new_submission: true,
        submission_type: 'basic_lti_launch',
        submission_data: `${submissionURL}`
      }

      // TODO Make sure this is secure. Call backend to sign.
      const scoreJWT = await JwtUtil.encodeJWT(scoreData, this.launchMessage.nonce)
      if (scoreJWT === null) {
        throw new Error('Creating the JWT failed.')
      }

      const urlEncodedJWT = JwtUtil.createJwtFormUrlEncoded(scoreJWT)

      /* Send the score resource to Canvas to indicate submission in gradebook */
      this.$axios.$post(
          `${process.env.canvas_path}/api/lti/courses/${courseId}/line_items/${lineItemId}/scores`,
          urlEncodedJWT,
          {
            headers: {
              Authorization: `Bearer ${this.$store.getters['LtiAuthStore/clientCredentialsToken'].userId}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          })
    }
    catch (e) {
      alert(`
          Error. Could not submit assignment to Canvas.
          Contact the system adminstrator for assistance if this continues.`)
    }
  }

  private async updateClientCredentials () {
    const authHandler : ClientAuth = new ClientAuth(process.env.canvas_client_id as string,
      process.env.canvas_path as string)

    const clientToken = await authHandler.getGradeServicesToken()

    this.$store.dispatch('updateClientCredentialsToken', clientToken)
  }

  private static getQueryVariable (variable : string, route : string) : string {
    const vars : string[] = route.split('&')
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=')
      if (decodeURIComponent(pair[0]) === variable.toLowerCase()) {
        return decodeURIComponent(pair[1])
      }
    }
    console.warn(`Query variable ${variable} not found`)
    return ''
  }

  /**
   * Decode and verify jwt. Need to verify using the platform's (Canvas) public keyset.
   */
  private static async getLaunchMessage (jwtBase64 : string, keysetUrl: string) : Promise<object | null> {
    return await JwtUtil.getAndVerifyWithKeyset(jwtBase64, keysetUrl)
  }

  private static async ensureUserEnrolled (courseId: string, user: User, roles: string[], axios: NuxtAxiosInstance) {
    await ApiHelper.ensureRichReviewUserExists(user)

    const userRes = await axios.post(`https://${process.env.backend}:3000/courses/${
      courseId}/users/userId}`,
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
}

</script>

<style scoped>
  @import url('@/static/nuxt_static_viewer/stylesheets/lti_style.css');

  .document-submitter {
    margin: 1.5rem 2%;
  }

  .rich-review-view {
    margin: 0
  }

</style>
