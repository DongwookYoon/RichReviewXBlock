<router>
  {
    path: '/lti/assignment/:assignment_type/:assignment_key?'
  }
</router>

<template>
  <div v-if="isCreated===true">
    <!--TODO determine what data needs to be passed to components, and load it in
      this page, instead of in the component, if possible -->
    <p>assignment.vue test </p>
    <p>component is {{ checkDisplayComponent }} </p>

    <!--If user has submitted the assignment OR user is has role of instructor or TA then
        show the assignment in the RichReview viewer-->
    <RichReviewViewer
      v-if="submit_data.submitted === true || userRoles.includes(Assignment.INSTRUCTOR) || userRoles.includes(Assignment.TA)"
      :submit_data="submitData"
    />

    <!--Else if user role is student then  -->
    <div v-else-if="userRoles.includes(Assignment.STUDENT)" class="submit-area">
      <!-- If assignment type is document_submission then -->
      <DocumentSubmitter
        v-if="assignmentType==='document_submission'"
        :user_id="lti_auth.authUser.userId"
        @submit-assignment="handleSubmit"
      />

      <!--else if assignment_type is comment_submission then -->
      <CommentSubmitter
        v-else-if="assignmentType==='comment_submission'"
        :title="assignmentTitle"
        :user_id="lti_auth.authUser.userId"
        :submit_data="submitData"
        @submit-assignment="handleSubmit"
      />
    </div>
  </div>
</template>

<script lang="ts">
import * as https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import { Route } from 'vue-router'
// eslint-disable-next-line camelcase
import jwt_decode from 'jwt-decode'
import ClientAuth from '~/utils/client-auth'
import DocumentSubmitter from '../../components/document_submitter.vue'
import CommentSubmitter from '../../components/comment_submitter.vue'
import RichReviewViewer from '../../components/richreview_viewer.vue'
// eslint-disable-next-line camelcase
import { lti_auth } from '~/store' // Pre-initialized store.

export class SubmitData {
  viewerLink : string = ''
  accessCode ?: string
  docID ?: string
  groupID ?: string
  submitted ?: boolean
}

const testData = {
  submitted: true,
  assignmentType: 'comment_submission',
  userRole: 'instructor',
  assignmentTitle: 'Test Assignment',
  userId: 'aeaf282'
}

@Component({
  components: {
    DocumentSubmitter,
    CommentSubmitter,
    RichReviewViewer
  },

  async asyncData (context) {
    /* If user is not authenticated, attempt authentication and pass this page as redirect URI */
    if (lti_auth.isAuthenticated() === false) {
      context.redirect(`/lti/oauth_handler?redirect_uri=${context.route.fullPath}`)
    }

    if (process.server) {
      const jwt : any = (context.req as any).body
      // Use req.body and req.query to get the required data from lti deep linking launch request
      // TODO Decode and verify jwt. Need to verify using the platform's (Canvas) public
      // key which is retrieved using OAuth
      const ltiLaunchMessage : any = jwt_decode(jwt)

      const assignmentType : string = context.params.assignment_type
      const assignmentID : string = context.params.assignment_key
      const userRoles = Assignment.getUserRoles(ltiLaunchMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])
      const isInstructorOrTA : boolean = (userRoles.includes(Assignment.INSTRUCTOR) || userRoles.includes(Assignment.TA))

      let resp
      try {
        resp = await context.$axios.$get(
        `https://${process.env.backend}:3000/lti_assignments/${assignmentID}/${isInstructorOrTA ? 'true' : 'false'}`,
        {
          headers: {
            Authorization: lti_auth.authUser.userId // Pass Canvas userId in Authorization header
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
        )
      } catch (e) {
        console.warn(e)
        return { ltiLaunchMessage }
      }
      if (!resp.data) {
        console.warn('Assignment data could not be loaded. Assignment does not exist.')
        return { ltiLaunchMessage }
      }

      // eslint-disable-next-line camelcase
      const submit_data : SubmitData = {
        submitted: resp.data.submission_status,
        viewerLink: resp.data.link
      }

      return {
        assignmentTitle: resp.data.title,
        assignmentType,
        assignmentID,
        ltiLaunchMessage,
        submit_data,
        userRoles
      }
    }
  }
})
export default class Assignment extends Vue {
  private static readonly INSTRUCTOR : string = 'instructor'
  private static readonly TA : string = 'ta'
  private static readonly STUDENT : string = 'student'

  private isCreated: boolean = false

  private assignmentTitle ?: string
  private assignmentType ?: string
  private assignmentID ?: string
  private ltiLaunchMessage ?: any
  // eslint-disable-next-line camelcase
  private submit_data !: SubmitData
  private userRoles ?: string[]

  public created () {
    this.isCreated = true

    this.submit_data.accessCode = Assignment.getQueryVariable('access_code', this.submit_data.viewerLink)
    this.submit_data.docID = Assignment.getQueryVariable('docid', this.submit_data.viewerLink)
    this.submit_data.groupID = Assignment.getQueryVariable('group_id', this.submit_data.viewerLink)

    this.injectTest() // Inject dummy data
  }

  public async handleSubmit () {
    let assignmentResp
    await this.updateClientCredentials()     // Update client credentials token in store

    try {
      assignmentResp = await this.$axios.$get(
        `https://${process.env.backend}:3000/lti_assignments/${assignmentID}/false`,
        {
          headers: {
            Authorization: lti_auth.authUser.userId // Pass the Canvas user id in Authorization header
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
    } catch (e) {
      console.warn('Getting updated assignment data on submit failed. Reason: ' + e)
      alert(`
          Error. Could not submit assignment to Canvas.
          Contact the system adminstrator for assistance if this continues.`)
      return
    }

    const submissionId = assignmentResp.data.grader_submission_id
    const submissionURL = `${this.$route.path}?${assignmentResp.data.link}&submission_id=${submissionId}`
    const assignmentResourceId : string = this.ltiLaunchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/resource_link'].id
    const courseId : string = this.ltiLaunchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/context'].id
    let lineItemId : string = ''

    try {
      const lineItemsResp = await this.$axios.$get(
        `${process.env.canvas_path}/api/lti/courses/${courseId}/line_items`,
        {
          headers: {
            Authorization: `Bearer ${lti_auth.clientCredentialsToken}`
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

      const scoreData = `{
          "timestamp": "${new Date().toISOString()}",
          "activityProgress": "Submitted",
          "gradingProgress": "PendingManual",
          "userId": "${lti_auth.authUser.userId}",
          "https://canvas.instructure.com/lti/submission": {
            "new_submission": true,
            "submission_type": "basic_lti_launch",
            "submission_data": "${submissionURL}"
          }
        }`
      /* Send the score resource to Canvas to indicate submission in gradebook */
      this.$axios.$post(
          `${process.env.canvas_path}/api/lti/courses/${courseId}/line_items/${lineItemId}/scores`,
          scoreData,
          {
            headers: {
              Authorization: `Bearer ${lti_auth.clientCredentialsToken}`
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          })
    } catch (e) {
      alert(`
          Error. Could not submit assignment to Canvas.
          Contact the system adminstrator for assistance if this continues.`)
    }
  }

  /**
   *  Only for testing purposes.
   *  Returns the name of component that will be used to display assignment.
   */
  public get checkDisplayComponent () {
    if (this.userRoles.includes('instructor') || this.userRoles.includes('ta')) {
      return 'GraderContainer'
    } else if (this.assignmentType === 'document_submission') {
      return 'DocumentSubmitter'
    } else if (this.assignmentType === 'comment_submission') {
      return 'CommentSubmitter'
    }

    return 'Error. No assignment component.'
  }


  private async updateClientCredentials() {
    let authHandler : ClientAuth = new ClientAuth(process.env.canvas_client_id, process.env.canvas_path)

    lti_auth.updateClientCredentialsToken(authHandler.getGradeServicesToken())
  }

  private static getQueryVariable (variable : string, route : string) : string {
    const vars : string[] = route.split('&')
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=')
      if (decodeURIComponent(pair[0]) == variable.toLowerCase()) {
        return decodeURIComponent(pair[1])
      }
    }
    console.warn(`Query variable ${variable} not found`)
    return ''
  }

  private static getUserRoles (ltiRoles : string[]) {
    const friendlyRoles : string[] = []

    for (const curRole of ltiRoles) {
      const curRoleLower = curRole.toLowerCase()
      if (curRoleLower.includes('student') || curRole.includes('learner')) {
        friendlyRoles.push(Assignment.STUDENT)
      } else if (curRoleLower.includes('instructor')) {
        friendlyRoles.push(Assignment.INSTRUCTOR)
      } else if (curRoleLower.includes('teachingassistant')) {
        friendlyRoles.push(Assignment.TA)
      }
    }

    return friendlyRoles
  }

  private injectTest () {
    this.submit_data.submitted = testData.submitted
    this.assignmentType = testData.assignmentType
    this.userRoles = [testData.userRole]
    this.assignmentTitle = testData.assignmentTitle
  }
}
</script>

<style scoped>
  @import url('@/static/nuxt_static_viewer/stylesheets/lti_style.css');

  .submit-area {
    margin: 1.5rem 2%;
  }

</style>
