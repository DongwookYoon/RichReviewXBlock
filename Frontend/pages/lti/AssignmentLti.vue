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

    <!--if user role is student AND NOT an instructor AND no submission then  -->
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
        :assignment_id="assignmentId"

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
        :assignment_id="assignmentId"

        @submit-assignment="handleSubmit"
      />
    </div>

    <!-- Instructor viewing document submission assignment NOT in grading view -->
    <div
      v-else-if="assignmentType === 'document_submission' && isTemplate === true "
      class="instructor-doc-submission-view"
    >
      <p>RichReview document submission assignment. Student submissions can be viewed in SpeedGrader.</p>
    </div>

    <!--RichReview viewer which handles comment submission template and grader view for an instructor OR TA,
       and student assignment review after submission for a student-->
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
/* eslint-disable no-multiple-empty-lines */

import { Component, Vue } from 'nuxt-property-decorator'
import { mapGetters } from 'vuex'
import JwtUtil from '~/utils/jwt-util'
import DocumentSubmitter from '~/components/lti/document_submitter.vue'
import CommentSubmitter from '~/components/lti/comment_submitter.vue'
import RichReviewViewer from '~/components/lti/richreview_viewer.vue'
// eslint-disable-next-line camelcase
import ApiHelper from '~/utils/api-helper'
import User from '~/model/user'
import Roles from '~/utils/roles'
import SubmitData from '~/model/submit-data'

const DEBUG: boolean = process.env.debug_mode !== undefined &&
  process.env.debug_mode.toLowerCase().trim() === 'true'

const testUser = new User(
  '109022885000538247847',
  'Test Student',
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
  middleware: DEBUG ? '' : 'oidc_handler', // Handle OIDC login request

  components: {
    DocumentSubmitter,
    CommentSubmitter,
    RichReviewViewer
  },

  async asyncData (context) {
    let loadSuccess: boolean = false

    if (!context.query.assignment_id) {
      console.warn('No assignment id passed in query string!')
      return { loadSuccess }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let courseId: string = ''
    let assignmentType : string = ''
    let launchMessage : any = {}
    let user: User = new User('', '')
    const assignmentId : string = decodeURIComponent(context.query.assignment_id as string)

    if (DEBUG) {
      console.log('Running in DEBUG mode')
      context.store.dispatch('LtiAuthStore/logIn', testUser)
      user = User.parse(context.store.getters['LtiAuthStore/authUser'])
      courseId = testDataStudent.courseId
    }

    if (context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
      console.warn('User is not logged in! This means OIDC login failed.')
      return {
        loadSuccess
      }
    }

    user = User.parse(context.store.getters['LtiAuthStore/authUser'])

    if (!DEBUG) {
      // eslint-disable-next-line prefer-const

      if (!process.server) {
        loadSuccess = true
        return {
          user,
          loadSuccess
        }
      }

      let jwt : string
      let ltiLaunchMessage : any = null

      try {
      /* As per IMS Security Framework Spec (https://www.imsglobal.org/spec/security/v1p0/),
        the data required to perform the launch is contained within the id_token jwt obtained
        from OIDC authentication. */
        jwt = context.req.body.id_token as string

        ltiLaunchMessage = await AssignmentLti.getLaunchMessage(jwt,
        process.env.canvas_public_key_set_url as string)

        console.log(`LTI Launch Message is:  ${JSON.stringify(ltiLaunchMessage)}`)
      }
      catch (ex) {
        console.warn('Error occurred while getting ltiLaunchMessage from jwt. Reason: ' + ex)
        ltiLaunchMessage = null
        return { loadSuccess }
      }

      launchMessage = ltiLaunchMessage as any
      user.roles = Roles.getUserRoles(
        launchMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])

      courseId = launchMessage[
        'https://purl.imsglobal.org/spec/lti/claim/context'].id
    } // End-if

    try {
      await ApiHelper.ensureUserEnrolled(courseId, user, context.$axios)
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

  fetch ({ redirect, store }) {
    if (store.getters['LtiAuthStore/isLoggedIn'] === false) {
      console.warn('User is not logged in to Canvas. Redirecting to Canvas login page...')
      redirect(process.env.canvas_path as string)   // TODO enable this
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
  private loadSuccess: boolean = false

  /* Mappings for Vuex store getters */
  public isLoggedIn !: boolean
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
    if (this.loadSuccess) {
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
          : AssignmentLti.getQueryVariable('submission_id', this.submit_data.viewerLink)

      this.submit_data.accessCode = accessCode
      this.submit_data.docID = docID
      this.submit_data.groupID = groupID
      this.submit_data.submissionID = submissionID

      this.isCreated = true
    }
  }

  public beforeMount () {
    window.addEventListener('beforeunload', this.refreshSafely)
  }

  public mounted () {
    if (this.loadSuccess === false) {
      alert('An error occurred while loading. Please try to refresh the page.\n' +
        'If this error persists, contact the RichReview system administrator for assistance.')
    }
  }


  /**
   * On LTI launch in external page mode, if the user refreshes the page
   * this will destroy context and force re-processing of lti launch message.
   * But there will be no lti launch message present, as refresh is simply a
   * new GET request to the current page at the top of the history stack. To get
   * around this, re-initiate lti launch whenever user refreshes by going
   * to previous state in history stack.
   */
  public refreshSafely (event: Event) {
    // Break out of event handler context
    window.setTimeout(function () {
      window.history.back()
    }, 0)
    event.preventDefault()
    window.removeEventListener('beforeunload', this.refreshSafely) // Prevent infinite loop on unload.
    event.returnValue = false
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

    alert('Assignment submitted!')
    window.removeEventListener('beforeunload', this.refreshSafely)
    window.history.back() // Relaunch after submit.
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
  private static async getLaunchMessage (jwtBase64 : string, keysetUrl: string) : Promise<object | null> {
    return await JwtUtil.getAndVerifyWithKeyset(jwtBase64, keysetUrl)
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

  .instructor-doc-submission-view {
    margin: 1rem 1rem 1rem 2rem;
  }

  .instructor-doc-submission-view p {
    font-size: 1.4rem;
  }

</style>
