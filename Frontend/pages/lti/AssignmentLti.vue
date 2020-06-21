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

    <!-- TODO Check if this is actually necessary. Does Canvas show the
         RichReview view in speed grader, even if the assignment is not submitted??
         If not, then this check+view if not necessary.
    <div
      v-if="(user.isInstructor() || user.isTa())
        && submit_data.submitted === false"
    >
      <p>The student has not yet submitted this assignment.</p>
    </div>
    -->

    <!--if user role is student AND no submission then  -->
    <div v-if="user.isStudent && submit_data.submitted === false">
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

    <!--Otherwise, regardless of user role,
        show the assignment in the RichReview viewer-->
    <RichReviewViewer
      v-else
      class="rich-review-view"
      :submit_data="submit_data"
      :user="user"
      :assignment_type="assignmentType"
      :course_id="courseId"
    />
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
import User from '~/model/user'
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
  assignmentId: '1_1591495925951_87362',
  courseId: '1',
  submit_data: {
    viewerLink: 'access_code=542cc5809e6f3d8670f47fa722691f70c1c5cd07&docid=google_109022885000538247847_1591495925932&groupid=google_102369315136728943851_1591495926073',
    submitted: true
  }
}

@Component({
  middleware: DEBUG ? '' : 'oidc_handler', // Handle OIDC login request

  components: {
    DocumentSubmitter,
    CommentSubmitter,
    RichReviewViewer
  },

  async asyncData (context) {
    let loadSuccess: boolean = false
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let courseId: string = ''
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let assignmentType : string = ''

    if (!context.query.assignment_id) {
      console.warn('No assignment id passed in query string!')
      return { loadSuccess }
    }

    const assignmentId : string = decodeURIComponent(context.query.assignment_id as string)

    if (DEBUG) {
      context.store.dispatch('LtiAuthStore/logIn', testUser)
      testDataStudent.assignmentId = assignmentId
      return testDataStudent
    }

    if (context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
      return {
        loadSuccess
      }
    }

    if (process.server === false) {
      return
    }

    let jwt : string
    let ltiLaunchMessage : object | null = null

    try {
      /* As per IMS Security Framework Spec (https://www.imsglobal.org/spec/security/v1p0/),
        the data required to perform the launch is contained within the id_token jwt obtained
        from OIDC authentication. */
      jwt = context.req.body.id_token as string
      ltiLaunchMessage = await AssignmentLti.getLaunchMessage(jwt,
        process.env.canvas_public_key_set_url as string)
    }
    catch (ex) {
      console.warn('Error occurred while getting ltiLaunchMessage from jwt. Reason: ' + ex)
      ltiLaunchMessage = null
      return { loadSuccess }
    }

    const launchMessage = ltiLaunchMessage as any
    const user: User = context.store.getters['LtiAuthStore/authUser']

    user.roles = Roles.getUserRoles(
      launchMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])

    courseId = launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/context'].id

    try {
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

    try {
      assignmentData = await ApiHelper.getAssignmentData(courseId,
        assignmentId,
        context.store.getters['LtiAuthStore/authUser'].id)

      assignmentType = assignmentData.type
      let submitted : boolean = (assignmentData.submission_status &&
                                      assignmentData.submission_status.toLowerCase() === 'submitted')

      /* Is this view for submitted assignment, or main assignment view? */
      const isSubmittedView: boolean = (
        context.query.access_code !== null &&
              context.query.docid !== null &&
              context.query.groupid !== null
      )

      submitted = (submitted !== false && isSubmittedView === true)

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
      assignmentTitle: assignmentData.title,
      assignmentType,
      assignmentId,
      launchMessage,
      submit_data,
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

  public created () {
    const query = this.$route.query
    if (this.isLoggedIn === true && this.loadSuccess) {
      console.log(`Logged in user: ${this.user.id}`)
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
