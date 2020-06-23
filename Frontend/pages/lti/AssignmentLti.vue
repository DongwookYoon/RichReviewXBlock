<template>
  <div v-if="isCreated===true">
    <div v-if="debug===true">
      <p>assignment.vue test </p>
      <p>Component: {{ curComponent }}</p>
    </div>

    <p v-if="loadSuccess === false">
      An error occurred while loading. Try to refresh the page. If this continues,
      please contact the RichReview system administrator.
    </p>

    <!--if user role is student AND no submission then  -->
    <div
      v-if="isUserStudent && !isUserInstructor
        && submit_data.submitted === false"
    >
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

    <div v-else-if="isUserInstructor && assignmentType === 'document_submission'">
      <p>RichReview document submission assignment. Student submissions can be viewed in SpeedGrader.</p>
    </div>

    <div v-else>
      <RichReviewViewer
        class="rich-review-view"
        :submit_data="submit_data"
        :user_data="user"
        :assignment_type="assignmentType"
        :course_id="courseId"
        :is_template="isTemplate"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import { mapGetters } from 'vuex'
import JwtUtil from '~/utils/jwt-util'
import ClientAuth from '~/utils/client-auth'
import DocumentSubmitter from '~/components/lti/document_submitter.vue'
import CommentSubmitter from '~/components/lti/comment_submitter.vue'
import RichReviewViewer from '~/components/lti/richreview_viewer.vue'
// eslint-disable-next-line camelcase
import ApiHelper from '~/utils/api-helper'
import { ITokenInfo } from '~/store/modules/LtiAuthStore'
import User, { IUser } from '~/model/user'
import Roles from '~/utils/roles'

const DEBUG: boolean = process.env.debug_mode !== undefined &&
  process.env.debug_mode.toLowerCase().trim() === 'true'

const testUser = new User(
  'google_109022885000538247847',
  'Test Instructor',
  [Roles.INSTRUCTOR]
)

const testDataStudent = {
  loadSuccess: true,
  user: testUser,
  assignmentTitle: 'Test Assignment',
  assignmentType: 'document_submission',
  assignmentId: '1592790355002_84952',
  courseId: 'test_2'
}

@Component({
  // middleware: DEBUG ? '' : 'oidc_handler', // Handle OIDC login request

  components: {
    DocumentSubmitter,
    CommentSubmitter,
    RichReviewViewer
  },

  async asyncData (context) {
    console.log('asyncData!')
    let loadSuccess: boolean = false

    // if (context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
    //   console.warn('User is not logged in! This means OIDC login failed.')
    //  return {
    //    loadSuccess
    //  }
    // }

    if (!context.query.assignment_id) {
      console.warn('No assignment id passed in query string!')
      return { loadSuccess }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let courseId: string = ''
    let assignmentType : string = ''
    let launchMessage : any = {}
    let user: User
    const assignmentId : string = decodeURIComponent(context.query.assignment_id as string)

    if (DEBUG) {
      console.log('Running in DEBUG mode')
      context.store.dispatch('LtiAuthStore/logIn', testUser)
      courseId = testDataStudent.courseId
    }

    // eslint-disable-next-line prefer-const

    //  else {
    let jwt : string
    let ltiLaunchMessage : any = null

    try {
      /* As per IMS Security Framework Spec (https://www.imsglobal.org/spec/security/v1p0/),
        the data required to perform the launch is contained within the id_token jwt obtained
        from OIDC authentication. */
      // jwt = context.req.body.id_token as string

      // DEBUG
      jwt = `eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjAtMDUtMDFUMDA6MDA6MDFaIn0.eyJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS9jbGFpbS9tZXNzYWdlX3R5cGUiOiJMdGlSZXNvdXJjZUxpbmtSZXF1ZXN0IiwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vdmVyc2lvbiI6IjEuMy4wIiwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vcmVzb3VyY2VfbGluayI6eyJpZCI6IjIwMTg5MWM3LTk0OTctNDIyYi1iYjFhLTExZjBiYTBjZWQ5YiIsImRlc2NyaXB0aW9uIjoiXHUwMDNjcFx1MDAzZVRlc3QgTFRJXHUwMDNjL3BcdTAwM2UiLCJ0aXRsZSI6IlRlc3QgTFRJIEFzc2lnbm1lbnQgVXBkYXRlZCIsInZhbGlkYXRpb25fY29udGV4dCI6bnVsbCwiZXJyb3JzIjp7ImVycm9ycyI6e319fSwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGktYWdzL2NsYWltL2VuZHBvaW50Ijp7InNjb3BlIjpbImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpLWFncy9zY29wZS9zY29yZSIsImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpLWFncy9zY29wZS9yZXN1bHQucmVhZG9ubHkiLCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS1hZ3Mvc2NvcGUvbGluZWl0ZW0ucmVhZG9ubHkiLCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS1hZ3Mvc2NvcGUvbGluZWl0ZW0iXSwibGluZWl0ZW1zIjoiaHR0cHM6Ly9jYW52YXMudWJjLmNhL2FwaS9sdGkvY291cnNlcy81MTk2NS9saW5lX2l0ZW1zIiwibGluZWl0ZW0iOiJodHRwczovL2NhbnZhcy51YmMuY2EvYXBpL2x0aS9jb3Vyc2VzLzUxOTY1L2xpbmVfaXRlbXMvNiIsInZhbGlkYXRpb25fY29udGV4dCI6bnVsbCwiZXJyb3JzIjp7ImVycm9ycyI6e319fSwiYXVkIjoiMTEyMjQwMDAwMDAwMDAwMDc3IiwiYXpwIjoiMTEyMjQwMDAwMDAwMDAwMDc3IiwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vZGVwbG95bWVudF9pZCI6IjEyMjc3OmY3Njg4YmE1OTFjZmNlMzdiM2JjYWNkNjEzNzBkNmRjNTkxY2Y1NDMiLCJleHAiOjE1OTI4ODQwMTQsImlhdCI6MTU5Mjg4MDQxNCwiaXNzIjoiaHR0cHM6Ly9jYW52YXMuaW5zdHJ1Y3R1cmUuY29tIiwibm9uY2UiOiI1MTQ2ZDk3OC1iZmQzLTRlMDYtYjQzZC01ZWQwNmVmYzA3MTAiLCJzdWIiOiI0ZmY2YmZkMy1iM2MyLTQ4NTUtOGRhYS01ZGQ3NjhiYzJlNDciLCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS9jbGFpbS90YXJnZXRfbGlua191cmkiOiJodHRwczovL3JpY2hyZXZpZXcubmV0L2x0aS9hc3NpZ25tZW50cz9hc3NpZ25tZW50X2lkPTE1OTI4NjU0MzY4NjVfNjE3MCIsImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL2NvbnRleHQiOnsiaWQiOiJmNzY4OGJhNTkxY2ZjZTM3YjNiY2FjZDYxMzcwZDZkYzU5MWNmNTQzIiwibGFiZWwiOiJTQi5PbG9mZkJpZXJtYW5uJ3NTYW5kYm94IiwidGl0bGUiOiJPbG9mZiBCaWVybWFubidzIFNhbmRib3giLCJ0eXBlIjpbImh0dHA6Ly9wdXJsLmltc2dsb2JhbC5vcmcvdm9jYWIvbGlzL3YyL2NvdXJzZSNDb3Vyc2VPZmZlcmluZyJdLCJ2YWxpZGF0aW9uX2NvbnRleHQiOm51bGwsImVycm9ycyI6eyJlcnJvcnMiOnt9fX0sImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL3Rvb2xfcGxhdGZvcm0iOnsiZ3VpZCI6IldpWUVLWkpJWW96SjYwanRPTmo5WEpkRndweHRNQVkwNzVsTFQ0cGo6Y2FudmFzLWxtcyIsIm5hbWUiOiJUaGUgVW5pdmVyc2l0eSBvZiBCcml0aXNoIENvbHVtYmlhIiwidmVyc2lvbiI6ImNsb3VkIiwicHJvZHVjdF9mYW1pbHlfY29kZSI6ImNhbnZhcyIsInZhbGlkYXRpb25fY29udGV4dCI6bnVsbCwiZXJyb3JzIjp7ImVycm9ycyI6e319fSwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vbGF1bmNoX3ByZXNlbnRhdGlvbiI6eyJkb2N1bWVudF90YXJnZXQiOiJpZnJhbWUiLCJoZWlnaHQiOm51bGwsIndpZHRoIjpudWxsLCJyZXR1cm5fdXJsIjoiaHR0cHM6Ly9jYW52YXMudWJjLmNhL2NvdXJzZXMvNTE5NjUvZXh0ZXJuYWxfY29udGVudC9zdWNjZXNzL2V4dGVybmFsX3Rvb2xfcmVkaXJlY3QiLCJsb2NhbGUiOiJlbi1DQSIsInZhbGlkYXRpb25fY29udGV4dCI6bnVsbCwiZXJyb3JzIjp7ImVycm9ycyI6e319fSwibG9jYWxlIjoiZW4tQ0EiLCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS9jbGFpbS9yb2xlcyI6WyJodHRwOi8vcHVybC5pbXNnbG9iYWwub3JnL3ZvY2FiL2xpcy92Mi9pbnN0aXR1dGlvbi9wZXJzb24jSW5zdHJ1Y3RvciIsImh0dHA6Ly9wdXJsLmltc2dsb2JhbC5vcmcvdm9jYWIvbGlzL3YyL2luc3RpdHV0aW9uL3BlcnNvbiNTdHVkZW50IiwiaHR0cDovL3B1cmwuaW1zZ2xvYmFsLm9yZy92b2NhYi9saXMvdjIvbWVtYmVyc2hpcCNJbnN0cnVjdG9yIiwiaHR0cDovL3B1cmwuaW1zZ2xvYmFsLm9yZy92b2NhYi9saXMvdjIvc3lzdGVtL3BlcnNvbiNVc2VyIl0sImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL2N1c3RvbSI6e30sImVycm9ycyI6eyJlcnJvcnMiOnt9fX0.lXcvinxdTkR-u1mRIWsln7Tk50J_q4_yx8nfj6AV4gL2oGP26EKDgAo40bITtgJUK0psL_4zPjgMO19vgMdG0DPo6BkUvO6l784IURDDDVKi0cGbAlB_Iif_W20wgNKtx1JaD9SYtK_0T32vLg0hSD9bAHapS4T-chNYZQnmg0gFoJeJSfpNZLvEBwFczFB1wGc44g3MKVaBx4_nEBVII40HWVEQttU1nxLN75l0ZceQBDd5Uzwgl30VHNaqS8tCGBP92RWYVJNF8Y8rHQr-6u1yVWQHZxU3SWGcNTpq_RJBsqPeLyVLmpHQA9e1M3tIi_qDb3UbiOoMRP-z50fOLg`
      // END DEBUG

      ltiLaunchMessage = await AssignmentLti.getLaunchMessage(jwt,
        process.env.canvas_public_key_set_url as string)

      console.log(`LTI Launch Message is:  ${JSON.stringify(ltiLaunchMessage)}`)
    }
    catch (ex) {
      console.warn('Error occurred while getting ltiLaunchMessage from jwt. Reason: ' + ex)
      ltiLaunchMessage = null
      return { loadSuccess }
    }

    // DEBUG
    context.store.dispatch('LtiAuthStore/logIn', new User(ltiLaunchMessage.sub as string, 'Canvas User'))
    // END DEBUG

    // eslint-disable-next-line prefer-const
    user = User.parse(context.store.getters['LtiAuthStore/authUser'])

    if (!process.server) {
      return
    }

    launchMessage = ltiLaunchMessage as any
    user.roles = Roles.getUserRoles(
      launchMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])

    courseId = launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/context'].id
// } // End-else

    try {
      console.log(`Ensuring that the user ${JSON.stringify(user)} is enrolled in course ${
        courseId} with roles ${user.roles}`)
      await ApiHelper.ensureUserEnrolled(courseId, user)
    }
    catch (ex) {
      console.warn('Could not verify user enrollment in course. Reason: ' + ex)
      loadSuccess = false
      return {
        loadSuccess
      }
    }

    // eslint-disable-next-line camelcase
    let assignmentData = null
    // eslint-disable-next-line camelcase
    let submit_data : SubmitData | null = null
    let isSubmittedView: boolean = false
    let isTemplate: boolean = false
    let submitted: boolean = false

    try {
      assignmentData = await ApiHelper.getAssignmentData(courseId,
        assignmentId,
        context.store.getters['LtiAuthStore/authUser'].id)

      assignmentType = assignmentData.assignment.type

      const markedSubmitted : boolean = (assignmentData.submission_status !== undefined &&
                                      assignmentData.submission_status.toLowerCase() === 'submitted')

      /* Is this view for submitted assignment, or main assignment view? */
      isSubmittedView = (
        context.query.access_code !== undefined &&
              context.query.docid !== undefined &&
              context.query.groupid !== undefined)

      isTemplate = ((isSubmittedView === false) && (user.isInstructor || user.isTa))
      submitted = (markedSubmitted !== false && isSubmittedView === true)

      /* Deciding viewer link is important, because it will determine what the
         user sees in RichReview. For student, we want to show assignment submit
         data from link property. For instructor, outside of grader, we
         want template data, to be able to modify comment submission assignment
         for all users. For instructor in grader, we want grader data */
      let contentLink : string = ''
      if (user.isStudent) {
        contentLink = assignmentData.link || ''
      }

      else if (user.isTa || user.isInstructor) {
        if (isSubmittedView) {
          contentLink = assignmentData.grader_link || ''
        }
        else {
          contentLink = assignmentData.template_link || ''
        }
      }

      // eslint-disable-next-line camelcase
      submit_data = {
        submitted,
        viewerLink: contentLink
      }

      console.log(`Assignment submission info: ${JSON.stringify(submit_data)}`)

      loadSuccess = true
    }
    catch (e) {
      console.warn(e)
      console.warn('Assignment data could not be loaded. ')
      loadSuccess = false
      assignmentData = null
    }

    if (loadSuccess === false) {
      return { loadSuccess }
    }

    return {
      loadSuccess,
      user,
      assignmentTitle: assignmentData.assignment.title,
      assignmentType,
      assignmentId,
      launchMessage,
      submit_data,
      isTemplate,
      courseId,
      assignmentData
    }
  },

  computed: {
    ...mapGetters('LtiAuthStore', {
      isLoggedIn: 'isLoggedIn',
      clientCredentialsToken: 'clientCredentialsToken'
    })
  }

})
export default class AssignmentLti extends Vue {
  public readonly INSTRUCTOR : string = Roles.INSTRUCTOR
  public readonly TA : string = Roles.TA
  public readonly STUDENT : string = Roles.STUDENT

  private debug: boolean = DEBUG
  private isCreated: boolean = false
  private loadSuccess: boolean = false

  /* Mappings for Vuex store getters */
  public isLoggedIn !: boolean
  public clientCredentialsToken !: ITokenInfo
  /* End mapped getters */

  /* Component data */
  private user !: User
  private assignmentTitle ?: string
  private assignmentType ?: string
  private assignmentId !: string
  private assignmentData : any
  private launchMessage ?: any
  // eslint-disable-next-line camelcase
  private submit_data !: SubmitData
  private isTemplate !: boolean
  private courseId !: string
  /* End Component data */

  public get curComponent () : string {
    if (this.user.isInstructor ||
        this.user.isTa ||
        this.submit_data.submitted === true) {
      return 'richreview_viewer'
    }

    if (this.user.isStudent) {
      if (this.assignmentType === 'document_submission') {
        return 'document_submitter'
      }
      else if (this.assignmentType === 'comment_submission') {
        return 'comment_submitter'
      }
    }

    return 'default'
  }

  get isUserStudent () : boolean {
    return this.user.isStudent
  }

  get isUserTa () : boolean {
    return this.user.isTa
  }

  get isUserInstructor () : boolean {
    return this.user.isInstructor
  }


  public created () {
    const query = this.$route.query
    if (this.isLoggedIn === true && this.loadSuccess) {
      this.user = User.parse(this.user)

      console.log(`Logged in user: ${JSON.stringify(this.user)}`)
      console.log('The viewer link: ' + this.submit_data.viewerLink)

      /* If provided, get submission params from URL query string. Otherwise,
        get them from the viewer link */
      const accessCode: string | null =
        query.access_code ? query.access_code as string
          : AssignmentLti.getQueryVariable('access_code', this.submit_data.viewerLink)

      const docID: string | null =
        query.docid ? query.docid as string
          : AssignmentLti.getQueryVariable('docid', this.submit_data.viewerLink)

      const groupID : string | null =
        query.groupid ? query.groupid as string
          : AssignmentLti.getQueryVariable('groupid', this.submit_data.viewerLink)

      const submissionID : string | null =
        query.submission_id ? query.submission_id as string
          : AssignmentLti.getQueryVariable('submission_id', this.submit_data.viewerLink)

      this.submit_data.accessCode = accessCode
      this.submit_data.docID = docID
      this.submit_data.groupID = groupID
      this.submit_data.submissionID = submissionID

      this.isCreated = true
      console.log('Created!')
    }
  }

  public mounted () {
    console.log(JSON.stringify(this.assignmentData))

    if (this.isLoggedIn === false) {
      console.warn('OIDC login failed')
      alert('You must be logged in to Canvas to view this assignment.')
      window.location.replace(process.env.canvas_path as string)
    }
    else if (this.loadSuccess === false) {
      alert('An error occurred while loading. Please try to refresh the page.\n' +
        'If this error persists, contact the RichReview system administrator for assistance.')
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

    let submissionURL = `${process.env.prod_url}${this.$route.path}?${
      updatedAssignmentData.link}&assignment_id=${
        encodeURIComponent(this.assignmentId)}`

    if (submissionId) {
      submissionURL += `&submission_id=${encodeURIComponent(submissionId)}`
    }

    if (DEBUG) {
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

    try {
      await ApiHelper.submitAssignmentToCanvas(
        this.launchMessage,
        this.courseId,
        this.clientCredentialsToken.token,
        this.user.id,
        new URL(submissionURL))
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
}

export class SubmitData {
  viewerLink : string = ''
  accessCode ?: string | null
  docID ?: string | null
  groupID ?: string | null
  submissionID ?: string | null
  submitted ?: boolean
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
