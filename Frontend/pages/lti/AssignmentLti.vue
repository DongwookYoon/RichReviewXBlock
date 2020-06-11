<template>
  <div v-if="isCreated===true">
    <!--TODO determine what data needs to be passed to components, and load it in
      this page, instead of in the component, if possible -->
    <p>assignment.vue test </p>
    <p>Component: {{ curComponent }}</p>

    <p v-if="loadSuccess === false">
      An error occurred while loading. Try to refresh the page. If this continues,
      please contact the RichReview system administrator.
    </p>

    <div
      v-if="(userRoles.includes(INSTRUCTOR) || userRoles.includes(TA))
        && submit_data.submitted === false"
    >
      <p>The student has not yet submitted this assignment.</p>
    </div>

    <!--Else if user role is student then  -->
    <div v-else-if="userRoles.includes(STUDENT) && submit_data.submitted === false">
      <!-- If assignment type is document_submission then -->
      <DocumentSubmitter
        v-if="assignmentType==='document_submission'"
        class="document-submitter"
        :user_id="user.id"
        :course_id="courseId"
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

    <!--Otherwise assignment has been submitted, regardless of user role,
        show the assignment in the RichReview viewer-->
    <RichReviewViewer
      v-else
      class="rich-review-view"
      :submit_data="submit_data"
      :user="user"
      :course_id="courseId"
      :user_roles="userRoles"
    />
  </div>
</template>

<script lang="ts">
import * as https from 'https'
import querystring from 'querystring'
import { Component, Vue } from 'nuxt-property-decorator'
import { mapGetters } from 'vuex'
import JwtUtil from '~/utils/jwt-util'
import ClientAuth from '~/utils/client-auth'
import DocumentSubmitter from '~/components/lti/document_submitter.vue'
import CommentSubmitter from '~/components/lti/comment_submitter.vue'
import RichReviewViewer from '~/components/lti/richreview_viewer.vue'
// eslint-disable-next-line camelcase
import ApiHelper from '~/utils/api-helper'
import { NuxtAxiosInstance } from '@nuxtjs/axios'
import { User, ITokenInfo } from '~/store/modules/LtiAuthStore'
import Roles from '~/utils/roles'

export class SubmitData {
  viewerLink : string = ''
  accessCode ?: string | null
  docID ?: string | null
  groupID ?: string | null
  submissionID ?: string | null
  submitted ?: boolean
}

const testUser : User = {
  id: 'google_109022885000538247847',
  userName: 'Test Instructor'
}

const testDataStudent = {
  assignmentTitle: 'Test Assignment',
  assignmentType: 'document_submission',
  assignmentId: '1_1591495925951_87362',
  userRoles: ['instructor'],
  courseId: '1',
  submit_data: {
    viewerLink: 'access_code=542cc5809e6f3d8670f47fa722691f70c1c5cd07&docid=google_109022885000538247847_1591495925932&groupid=google_102369315136728943851_1591495926073',
    submitted: false
  }
}

@Component({
  middleware: 'oidc_handler', // Handle OIDC login request

  components: {
    DocumentSubmitter,
    CommentSubmitter,
    RichReviewViewer
  },

  async asyncData (context) {
    let loadSuccess: boolean = false
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let courseId : string = ''
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let userRoles :string[] = ['']
    if (process.env.debug_mode &&
      (process.env.debug_mode as string).toLowerCase() === 'true') {
      context.store.dispatch('LtiAuthStore/logIn', testUser)
      courseId = testDataStudent.courseId
      userRoles = testDataStudent.userRoles
    }

    if (context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
      return {
        loadSuccess
      }
    }

    if (process.server) {
      let jwt : string
      let ltiLaunchMessage : object | null = null

      try {
      // Note that the platform sends the encoded jwt in a form with a single parameter, which
      // is 'JWT'. The form is parsed here to get the jwt.
        jwt = ((context.req as any).body).JWT as string
        ltiLaunchMessage = await AssignmentLti.getLaunchMessage(jwt, process.env.canvas_public_key_set_url as string)
      }
      catch (ex) {
        console.warn('Error occurred while getting ltiLaunchMessage from jwt. Reason: ' + ex)
        ltiLaunchMessage = null
      }
      finally {
        if (ltiLaunchMessage === null) {
          return
        }
      }

      const launchMessage = ltiLaunchMessage as any
      const userRoles = Roles.getUserRoles(launchMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])

      const courseId = launchMessage[
        'https://purl.imsglobal.org/spec/lti/claim/context'].id

      const assignmentType : string = context.params.assignment_type
      const assignmentId : string = context.params.assignment_key

      try {
        await AssignmentLti.ensureUserEnrolled(courseId,
          context.store.getters['LtiAuthStore/authUser'],
          userRoles,
          context.$axios)
      }
      catch (ex) {
        console.warn('Could not verify user enrollment in course. Reason: ' + ex)
        return {
          loadSuccess
        }
      }
      // eslint-disable-next-line camelcase
      let assignmentData = null
      // eslint-disable-next-line camelcase
      let submit_data : SubmitData | null = null

      try {
        assignmentData = await ApiHelper.getAssignmentData(courseId,
          assignmentId,
          context.store.getters['LtiAuthStore/authUser'].id)

        let submitted : boolean = (assignmentData.submission_status &&
                                      assignmentData.submission_status.toLowerCase() === 'submitted')

        if (submitted !== false) {
          if (
            context.query.access_code &&
              context.query.docid &&
              context.query.groupid
          ) {
            submitted = true
          }
        }

        const viewerLink = userRoles.includes(Roles.STUDENT) ? assignmentData.link : assignmentData.grader_link
        // eslint-disable-next-line camelcase
        submit_data = {
          submitted,
          viewerLink
        }

        loadSuccess = true
      }
      catch (e) {
        console.warn(e)
        assignmentData = null
      }
      finally {
        if (assignmentData === null) {
          console.warn('Assignment data could not be loaded. ')
        }
      }

      if (loadSuccess === false) {
        return { loadSuccess }
      }

      return {
        loadSuccess,
        assignmentTitle: assignmentData.title,
        assignmentType,
        assignmentId,
        launchMessage,
        submit_data,
        userRoles,
        courseId,
        assignmentData
      }
    }
  },

  computed: {
    ...mapGetters('LtiAuthStore', {
      user: 'authUser',
      isLoggedIn: 'isLoggedIn',
      clientCredentialsToken: 'clientCredentialsToken'
    })
  }

})
export default class AssignmentLti extends Vue {
  public readonly INSTRUCTOR : string = Roles.INSTRUCTOR
  public readonly TA : string = Roles.TA
  public readonly STUDENT : string = Roles.STUDENT

  private isCreated: boolean = false
  private loadSuccess: boolean = false

  /* Mappings for Vuex store getters */
  public isLoggedIn !: boolean
  public clientCredentialsToken ?: ITokenInfo
  public user !: User
  /* End mapped getters */

  /* Component data */
  private assignmentTitle ?: string
  private assignmentType ?: string
  private assignmentId !: string
  private assignmentData : any
  private launchMessage ?: any
  // eslint-disable-next-line camelcase
  private submit_data !: SubmitData
  private userRoles !: string[]
  private courseId !: string
  /* End Component data */

  public get curComponent () : string {
    if (this.userRoles.includes(this.INSTRUCTOR) ||
        this.userRoles.includes(this.TA) ||
        this.submit_data.submitted === true) {
      return 'richreview_viewer'
    }

    if (this.userRoles.includes(this.STUDENT)) {
      if (this.assignmentType === 'document_submission') {
        return 'document_submitter'
      }
      else if (this.assignmentType === 'comment_submission') {
        return 'comment_submitter'
      }
    }

    return 'default'
  }

  public created () {
    if (this.isLoggedIn === true && this.loadSuccess) {
      console.log(`Logged in user: ${this.user.id}`)
      console.log('The viewer link: ' + this.submit_data.viewerLink)
      /* If provided, get submission params from URL query string. Otherwise,
        get them from the assignment data */
      const accessCode: string | null =
        this.$route.query.access_code ? this.$route.query.access_code as string
          : AssignmentLti.getQueryVariable('access_code', this.submit_data.viewerLink)

      const docID: string | null =
        this.$route.query.docid ? this.$route.query.docid as string
          : AssignmentLti.getQueryVariable('docid', this.submit_data.viewerLink)

      const groupID : string | null =
        this.$route.query.groupid ? this.$route.query.groupid as string
          : AssignmentLti.getQueryVariable('groupid', this.submit_data.viewerLink)

      const submissionID : string | null =
        this.$route.query.submission_id ? this.$route.query.submission_id as string
          : AssignmentLti.getQueryVariable('submission_id', this.submit_data.viewerLink)

      this.submit_data.accessCode = accessCode
      this.submit_data.docID = docID
      this.submit_data.groupID = groupID
      this.submit_data.submissionID = submissionID

      this.isCreated = true
    }
  }

  public mounted () {
    console.log(JSON.stringify(this.assignmentData))
    console.log('Assignment submitted?: ' + this.submit_data.submitted)
    if (this.isLoggedIn === false) {
      console.warn('OIDC login failed')
      alert('You must be logged in to Canvas to view this assignment.')
      window.location.replace(process.env.canvas_path as string)
    }
  }

  public async handleSubmit () {
    const courseId : string = this.courseId
    let updatedAssignmentData

    try {
      updatedAssignmentData = await ApiHelper.getAssignmentData(courseId,
        this.assignmentId,
        this.user.id as string)
    }
    catch (e) {
      console.warn('Getting updated assignment data on submit failed. Reason: ' + e)
      alert(`
          Error. Could not submit assignment to Canvas.
          Contact the system adminstrator for assistance if this continues.`)
      return
    }

    const submissionId = updatedAssignmentData.grader_submission_id
    console.log(JSON.stringify(updatedAssignmentData))
    let submissionURL = `${this.$route.path}?${updatedAssignmentData.link}`

    if (submissionId) {
      submissionURL += `&submission_id=${submissionId}`
    }

    if (process.env.debug_mode &&
        (process.env.debug_mode as string).toLowerCase() === 'true') {
      alert('DEBUG MODE: Got submit event from child component!')
      console.log('Submitted assignment viewer URL: ' + submissionURL)
      return
    }

    try {
      await this.updateClientCredentials() // Update client credentials token in store
    }
    catch (ex) {
      console.warn('OAuth client credential grant for assignment submission failed. Reason: ' + ex)
      alert('Could not submit assignment. Please try again.')
      return
    }

    const assignmentResourceId : string = this.launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/resource_link'].id
    let lineItemId : string = ''

    try {
      const lineItemsResp = await this.$axios.$get(
        `${process.env.canvas_path}/api/lti/courses/${courseId}/line_items`,
        {
          headers: {
            Accept: 'application/json+canvas-string-ids',
            Authorization: `Bearer ${this.clientCredentialsToken}`
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
        userId: `${this.user.id}`
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
              Authorization: `Bearer ${this.clientCredentialsToken}`,
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

    // Get a client credential token with scopes required for the LTI grader services
    const clientToken = await authHandler.getGradeServicesToken()

    this.$store.dispatch('updateClientCredentialsToken', clientToken)
  }

  private static getQueryVariable (variable : string, route : string) : string | null {
    const vars : string[] = route.split('&')
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=')
      if (decodeURIComponent(pair[0]) === variable.toLowerCase()) {
        return decodeURIComponent(pair[1])
      }
    }
    return null
  }

  /**
   * Decode and verify jwt. Need to verify using the platform's (Canvas) public keyset.
   */
  private static async getLaunchMessage (jwtBase64 : string, keysetUrl: string) : Promise<object | null> {
    return await JwtUtil.getAndVerifyWithKeyset(jwtBase64, keysetUrl)
  }

  private static async ensureUserEnrolled (courseId: string, user: User, roles: string[], axios: NuxtAxiosInstance) {
    await ApiHelper.ensureRichReviewUserExists(user)

    console.log('courseid' + courseId)
    /* Ensure user is enrolled in course */
    const userRes = await axios.post(`https://${process.env.backend}:3000/courses/${
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
