<template>
  <div>
    <p v-if="loadSuccess === false">
      An error occurred while loading. Try to refresh the page. If this continues,
      please contact the RichReview system administrator.
    </p>

    <div v-if="isCreated===true">
      <div v-if="gradeData.isGraded && gradeData.grade">
        <p><strong>Grade: {{ gradeData.grade }}</strong></p>
      </div>
      <!--The button to open/close a new submission -->
      <button
        v-if="showNewSubmissionButton"
        id="new-submission-button"
        title="Create a new submission that will replace your existing submission."
        :class="{
          new_submission_open: addingSubmission,
          new_submission_button: true
        }"
        @click="addingSubmission = !addingSubmission"
      >
        New Submission
      </button>

      <div v-if="isTemplate === true" id="template-container">
        <SubmissionsDashboard
          v-if="!templateOpen"
          id="submission-dashboard"
          :user_data="user"
          :course_id="courseId"
          :assignment_id="assignmentId"
          :group_id="submit_data.groupID"
        />
        <button
          v-if="assignmentType==='comment_submission'"
          id="toggle-template-button"
          title="The document template allows the instructor to change what all students will see."
          :class="{
            template_open: templateOpen,
            template_toggle_button: true
          }"
          @click="templateOpen = !templateOpen"
        >
          {{ templateOpen ? 'Close Template' : 'Show Template' }}
        </button>
      </div>

      <!--if user role is student AND NOT an instructor AND no submission or it is
      an additional submission for an already submitted assignment  -->
      <div
        v-if="isUserStudent && !isUserInstructor &&
          (submit_data.submitted === false || addingSubmission === true)"
      >
        <!-- If assignment type is document_submission and not submitted OR
        there is an additional submission being created then -->
        <DocumentSubmitter
          v-if="assignmentType==='document_submission'"
          class="document-submitter"
          :user_id="user.id"
          :course_id="courseId"
          :assignment_id="assignmentId"
          :is_adding_submission="addingSubmission"
          @cancel-submit="addingSubmission = false"
          @submit-assignment="handleSubmit"
        />

        <!--else if assignment_type is comment_submission then -->
        <CommentSubmitter
          v-else-if="assignmentType==='comment_submission' &&
            submit_data.submitted === false"
          class="rich-review-view"
          :user="user"
          :submit_data="submit_data"
          :course_id="courseId"
          :assignment_id="assignmentId"
          @submit-assignment="handleSubmit"
        />
      </div>

      <!--RichReview viewer which provides template or grader view for an instructor OR TA,
       and student assignment review after submission for a student -->
      <div v-else-if="showViewer">
        <RichReviewViewer
          class="rich-review-view"
          :submit_data="submit_data"
          :user_data="user"
          :assignment_type="assignmentType"
          :course_id="courseId"
          :assignment_id="assignmentId"
          :is_template="isTemplate"
          :is_muted="isMuted"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/* eslint-disable no-multiple-empty-lines */
import * as fs from 'fs'
import * as path from 'path'
import { Component, Vue } from 'nuxt-property-decorator'
import { mapGetters } from 'vuex'
import JwtUtil from '~/utils/jwt-util'
import DocumentSubmitter from '~/components/lti/document_submitter.vue'
import CommentSubmitter from '~/components/lti/comment_submitter.vue'
import RichReviewViewer from '~/components/lti/richreview_viewer.vue'
import SubmissionsDashboard from '~/components/lti/submissions_dashboard.vue'
// eslint-disable-next-line camelcase
import ApiHelper, { GradeData } from '~/utils/api-helper'
import User from '~/model/user'
import Roles from '~/utils/roles'
import SubmitData from '~/model/submit-data'
import { NuxtAxiosInstance } from '@nuxtjs/axios'

const DEBUG: boolean = process.env.debug_mode !== undefined &&
  process.env.debug_mode.toLowerCase().trim() === 'true'


@Component({
  head: {
    script: [
      {
        src:
          'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/js/bootstrap.min.js'
      },
      { src: '/my_viewer_helper.js', mode: 'client', body: true }
    ]
  },
  middleware: DEBUG ? '' : 'oidc_handler', // Handle OIDC login request

  components: {
    DocumentSubmitter,
    CommentSubmitter,
    RichReviewViewer,
    SubmissionsDashboard
  },

  async asyncData (context) {
    let testData
    if (DEBUG === true) {
      console.log('Running in DEBUG mode')
      testData = AssignmentLti.loadTestData()
      context.store.dispatch('LtiAuthStore/logIn', testData.testUser)
    }

    const loadSuccess: boolean = false

    /* Server-side login check */
    if (context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
      return
    }

    if (!context.query.assignment_id) {
      console.warn('No assignment id passed in query string!')
      return { loadSuccess }
    }

    let jwt : string = ''

    if (!DEBUG) {
      const req : any = context.req as any

      /* On ititial launch, the jwt will be available on req during SSR */
      if (req && req.body.id_token) {
        jwt = req.body.id_token
        console.log('Initial LTI launch.')
      }
      else {
        console.log('Not an LTI launch. Must rehydrate data on client side...')
        return
      }
    }

    return await AssignmentLti.initAssignment(jwt, context, DEBUG ? testData.testDataStudent.courseId : undefined)
  },

  fetch (context) {
    /* Expect that OIDC login will be complete on initial LTI launch */
    if (context.req && context.req.body.id_token &&
        context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
      console.warn('Invalid lti launch. OIDC authentication failed. Redirecting to provider login page.')
      context.redirect(process.env.canvas_path as string)
    }
  },

  computed: {
    ...mapGetters('LtiAuthStore', {
      isLoggedIn: 'isLoggedIn'
    })
  }

})
export default class AssignmentLti extends Vue {
  public readonly INSTRUCTOR : string = Roles.INSTRUCTOR
  public readonly TA : string = Roles.TA
  public readonly STUDENT : string = Roles.STUDENT

  private debug: boolean = DEBUG
  private isCreated: boolean = false
  private loadSuccess : boolean = false

  /* Mappings for Vuex store getters */
  public isLoggedIn !: boolean
  /* End mapped getters */

  /* Component data */
  private user !: User
  private assignmentType ?: string
  private assignmentId !: string
  private assignmentData : any
  private launchMessage ?: any
  // eslint-disable-next-line camelcase
  private submit_data !: SubmitData
  private isTemplate !: boolean
  private gradeData !: GradeData
  private courseId !: string
  private idToken: string | null = null
  private addingSubmission: boolean = false
  private templateOpen: boolean = false
  private isMuted: boolean = false
  /* End Component data */

  /* Computed properties */
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

  get isUserInstructor (): boolean {
    return this.user.isInstructor
  }

  get showNewSubmissionButton (): boolean {
    /* Button not shown for muted assignments or submissions already graded */
    if (this.isMuted === true || this.gradeData.isGraded === true) {
      return false
    }

    if (this.isUserStudent && !this.isUserInstructor &&
          this.assignmentType === 'document_submission' &&
          this.submit_data.submitted === true) {
      return true
    }

    return false
  }

  get showViewer () : boolean {
    /* Template view where instructor has opened templated */
    if (this.isTemplate === true && this.templateOpen === true) {
      return true
    }
    /* Instructor grader view */
    if (this.isUserInstructor === true && !this.isTemplate) {
      return true
    }
    /* Student assignment review */
    if (this.isUserStudent && (!this.isUserTa || !this.isUserInstructor) &&
      this.submit_data.submitted === true) {
      return true
    }

    return false
  }

  /* End computed properties */



  public mounted () {
    if (this.idToken === null && !DEBUG) {
      this.idToken = window.sessionStorage.getItem('rr_session_token') // Get token from existing OIDC login
      /* Case where there is no existing session token */
      if (this.idToken === null) {
        console.warn('Could not rehydrate store on client side. No session token.')
        this.loadSuccess = false
        window.alert('You must be logged in to Canvas to view this assignment. Please log in and try accessing the assignment again.')
        window.location.replace(process.env.canvas_path as string)
      }
      else {
        this.initClient().then(() => {
          /* Case where there is a session token but login has failed. Typically occurs if session has expired */
          if (this.isLoggedIn === false) {
            window.alert('You must be logged in to Canvas to view this assignment. Please log in and try accessing the assignment again.')
            window.location.replace(process.env.canvas_path as string)
          }
          this.isCreated = true
        })
      }
    }

    else if (this.loadSuccess === false) {
      alert('An error occurred while loading. Please try to refresh the page.\n' +
        'If this error persists, contact the RichReview system administrator for assistance.')
    }

    /* Data has already been loaded on server side in this case, so we only need to
       init the submit data and store the session token in session storage */
    else {
      this.initSubmitData().then(() => {
        window.sessionStorage.setItem('rr_session_token', this.idToken as string)
        this.isCreated = true
      })
    }

    /* Add warning if students try to leave page without submitting when they have not yet submitted.
    Most browsers will only show a generic warning, however. */
    if (!this.isUserTa && !this.isUserInstructor && this.submit_data.submitted === false) {
      window.addEventListener('beforeunload', this.showLeaveWarning)
    }
  }


  public async handleSubmit () {
    try {
      await this.submitAssignment()
    }
    catch (ex) {
      console.log('Submitting the assignment failed. Reason: ' + ex)
      alert('Could not submit the assignment. If this error continues, ' +
      'please contact the system administrator.')
      return
    }
    /* We don't want to show the warning message for route leave,
       as assignment is already succesfully submitted by this point */
    window.removeEventListener('beforeunload', this.showLeaveWarning)
    alert('Assignment submitted!')

    AssignmentLti.relaunch()
  }


  public showLeaveWarning (ev: BeforeUnloadEvent) {
    ev.returnValue = 'You have not yet submitted the assignment. Do you want to exit?'
    return 'You have not yet submitted the assignment. Do you want to exit?'
  }

  private rehydrate ({
    loadSuccess,
    user,
    assignmentType,
    assignmentId,
    launchMessage,
    // eslint-disable-next-line camelcase
    submit_data,
    isTemplate,
    gradeData,
    courseId,
    assignmentData,
    idToken
  }: IAssignmentLtiData) {
    this.loadSuccess = loadSuccess
    this.user = user as User
    this.assignmentType = assignmentType
    this.assignmentId = assignmentId as string
    this.launchMessage = launchMessage
    // eslint-disable-next-line camelcase
    this.submit_data = submit_data as SubmitData
    this.isTemplate = isTemplate as boolean
    this.gradeData = gradeData as GradeData
    this.courseId = courseId as string
    this.assignmentData = assignmentData
    this.idToken = idToken as string
  }


  /**
   * Verifies OIDC session token and rehydrates store data on client.
   */
  private async initClient () {
    await this.loginClient(this.idToken)

    if (this.isLoggedIn) {
      const data: IAssignmentLtiData = await AssignmentLti.initAssignment(this.idToken, this.$nuxt.context)
      console.log('Rehydrated on client side.')
      this.rehydrate(data)
      await this.initSubmitData()

      if (this.loadSuccess === false) {
        alert('An error occurred while loading. Please try to refresh the page.\n' +
                'If this error persists, contact the RichReview system administrator for assistance.')
      }
    }
  }

  private async submitAssignment () {
    const courseId : string = this.courseId
    let updatedAssignmentData

    try {
      updatedAssignmentData = await ApiHelper.getAssignmentData(courseId,
        this.assignmentId,
        this.user.id as string,
        this.$axios)
    }
    catch (e) {
      console.warn('Getting updated assignment data on submit failed. Reason: ' + e)
      throw e
    }

    const submissionId = updatedAssignmentData.grader_submission_id

    /* Force a redirect to assignment through /lti/launch by setting
       submit_view=true. This is required, as Canvas only supports one launch URL. */
    let submissionURL = `${process.env.prod_url}/lti/launch?${
      updatedAssignmentData.link}&assignment_id=${
        encodeURIComponent(this.assignmentId)}&submit_view=true`

    if (submissionId) {
      submissionURL += `&submission_id=${encodeURIComponent(submissionId)}`
    }

    if (DEBUG) {
      alert('DEBUG MODE: Got submit event from child component!')
      console.log('Submitted assignment viewer URL: ' + submissionURL)
      return
    }

    try {
      await ApiHelper.submitAssignmentToPlatform(
        this.launchMessage,
        courseId,
        this.user.id,
        new URL(submissionURL),
        this.$axios)
    }
    catch (e) {
      console.warn('Canvas submission failed. Reason: ' + e)
      throw e
    }
  }


  public static relaunch () {
    if (window.history.length > 1) {
      window.history.back()
    }
    else {
      /* Fallback for Chrome or any other browser that destroys history on redirect */
      window.close()
    }
  }

  private async initSubmitData () {
    const query = this.$route.query
    this.user = User.parse(this.user)

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
          : this.assignmentData.grader_submission_id

    this.submit_data.accessCode = accessCode
    this.submit_data.docID = docID
    this.submit_data.groupID = groupID
    this.submit_data.submissionID = submissionID

    this.isMuted = await this.getMuteStatus()
  }

  private async loginClient (sessionJwt: string | null) {
    if (sessionJwt !== null) {
      /* Note proxy path is used to prevent issue with cross-origin request */
      const tokenData : any = await JwtUtil.getAndVerifyWithKeyset(sessionJwt as string,
        '/canvas-jwk-keyset/', this.$axios)
      if (tokenData === null) {
        console.warn('OIDC login failed. Invalid session token.')
        return
      }
      this.$store.dispatch('LtiAuthStore/logIn', { id: tokenData.sub, userName: 'Canvas User' }) // JWT 'sub' claim contains unique global user id.
    }
    else {
      console.warn('Could not login client, as no valid session token was found.')
    }
  }


  private static async initAssignment (jwt: string | null, context: any, debugCourseId ?: String): Promise<IAssignmentLtiData> {
    let loadSuccess: boolean = false
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let courseId: string = ''
    let assignmentType : string = ''
    let ltiLaunchMessage : any = null
    let launchMessage : any = null
    let gradeData !: GradeData
    const user: User = User.parse(context.store.getters['LtiAuthStore/authUser'])
    const assignmentId : string = decodeURIComponent(context.query.assignment_id as string)


    if (DEBUG) {
      courseId = debugCourseId as string
    }

    else {
      try {
        if (!jwt) {
          throw new Error('Cannot initialise assignment data. The jwt was not provided.')
        }

        /* As per IMS Security Framework Spec (https://www.imsglobal.org/spec/security/v1p0/),
        the data required to perform the launch is contained within the id_token jwt obtained
        from OIDC authentication. */
        ltiLaunchMessage = await AssignmentLti.getLaunchMessage(jwt as string,
        '/canvas-jwk-keyset/' as string,
        context.$axios)

        launchMessage = ltiLaunchMessage as any
        user.roles = Roles.getUserRoles(
          launchMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])

        courseId = launchMessage[
          'https://purl.imsglobal.org/spec/lti/claim/context'].id

        gradeData = await ApiHelper.getGradeFromPlatform(courseId,
          user.id,
          new URL(launchMessage[
            'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].lineitem),
          context.$axios)
      }
      catch (ex) {
        console.warn('Error occurred while getting launch data from Canvas. Reason: ' + ex)
        return { loadSuccess }
      }
    } // End-else

    try {
      await ApiHelper.ensureUserEnrolled(courseId, user, context.$axios)
    }
    catch (ex) {
      console.warn('Could not verify user enrollment in course. Reason: ' + ex)
      loadSuccess = false
      return { loadSuccess }
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
        context.store.getters['LtiAuthStore/authUser'].id,
        context.$axios)

      assignmentType = assignmentData.assignment.type

      const markedSubmitted : boolean = (assignmentData.submission_status !== undefined &&
                                      assignmentData.submission_status.toLowerCase() === 'submitted')

      /* Is this view for submitted assignment, or main assignment view? */
      isSubmittedView = ((markedSubmitted === true) ||
        (context.query.access_code !== undefined &&
              context.query.docid !== undefined &&
              context.query.groupid !== undefined))

      isTemplate = ((isSubmittedView === false) && (user.isInstructor || user.isTa))
      submitted = (markedSubmitted !== false || isSubmittedView === true)

      /* Deciding content link is important, because it will determine the
         user role in the RichReview document. For instructors and TAs in grader,
         we want grader data for a specific submission. For instructors and TAs
         outside of grader, we want template data, to be able to modify comment
         submission assignment for all users.

         Note that due to Canvas role handling, student, TA, instructor roles
         are NOT mutually exclusive */
      let contentLink : string = ''
      const isTaOrInstructor : boolean = (user.isInstructor || user.isTa)

      if (user.isStudent && !isTaOrInstructor) {
        contentLink = assignmentData.link || ''
      }

      else if (isTaOrInstructor) {
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
      assignmentType,
      assignmentId,
      launchMessage,
      submit_data,
      isTemplate,
      gradeData,
      courseId,
      assignmentData,
      idToken: jwt
    }
  }

  private async getMuteStatus () {
    try {
      const muted: boolean = await ApiHelper.isAssignmentMuted(this.courseId,
        this.assignmentId,
        this.submit_data.groupID as string,
        this.user.id,
        this.$axios)
      return muted
    }
    catch (ex) {
      console.warn('Could not get mute status for this assignment. Reason: ' + ex)
    }
    return false
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
   **/
  private static async getLaunchMessage (jwtBase64 : string, keysetUrl: string, axiosInstance: NuxtAxiosInstance) : Promise<object | null> {
    return await JwtUtil.getAndVerifyWithKeyset(jwtBase64, keysetUrl, axiosInstance)
  }

  private static loadTestData () {
    const testJson = path.resolve('test/data/AssignmentLtiTest.json')
    const testData = fs.readFileSync(testJson, 'utf8')
    console.log('Loaded test data: ' + testData)
    return JSON.parse(testData)
  }
}

interface IAssignmentLtiData {
    loadSuccess: boolean
    user ?: User
    assignmentType ?: string
    assignmentId ?: string
    launchMessage ?: any
    // eslint-disable-next-line camelcase
    submit_data ?: SubmitData | null
    isTemplate ?: boolean
    gradeData ?: GradeData
    courseId ?: string
    assignmentData ?: any
    idToken ?: string | null
}
</script>


<style scoped>
  @import url('@/static/nuxt_static_viewer/stylesheets/lti_style.css');

  #submission-dashboard {
    margin-bottom: 5rem;
  }

  #template-container {
    margin: 0.25rem
  }

  .document-submitter, .new_submission_button {
    margin: .75rem 2%;
  }

  .new_submission_button, .template_toggle_button {
    color: white;
    background-color: #0c2343;
    border-radius: 0.2rem;
    min-width: 5rem;
    text-align: center;
    cursor: pointer;
    font-size: 1.25rem;
    padding: .25rem .3rem .1rem .3rem
  }

  .template_open {
    background: darkred;
  }

  .new_submission_open {
    display: none
  }

  .rich-review-view {
    margin: 0
  }

  .instructor-doc-submission-view p {
    font-size: 1.4rem;
  }

</style>
