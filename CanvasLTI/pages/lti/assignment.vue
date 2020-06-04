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
      :submit_data="submit_data"
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
        :submit_data="submit_data"
        :course_id ="courseId"
        @submit-assignment="handleSubmit"
      />
    </div>
  </div>
</template>

<script lang="ts">
import * as https from 'https'
import querystring from 'querystring'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import { Route } from 'vue-router'
import JwtUtil from '~/utils/jwt-util'
import ClientAuth from '~/utils/client-auth'
import DocumentSubmitter from '../../components/document_submitter.vue'
import CommentSubmitter from '../../components/comment_submitter.vue'
import RichReviewViewer from '../../components/richreview_viewer.vue'
// eslint-disable-next-line camelcase
import { lti_auth } from '~/store' // Pre-initialized store.
import ApiHelper from '../../utils/api-helper';
import { NuxtAxiosInstance } from '@nuxtjs/axios'

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
  // middleware: 'oidc_handler',            // Handle OIDC login request

  components: {
    DocumentSubmitter,
    CommentSubmitter,
    RichReviewViewer
  },

  async asyncData (context) {
    /*
    if (lti_auth.isLoggedIn === false) {
      console.warn('OIDC login failed')
      alert('Please log in to Canvas to access RichReview. ')
      context.redirect('/')
    }
    */
   if (process.server) {
      const generalError: string = `An error occurred. Please try reloading the page.
          Contact the RichReview system administrator if this continues.`
      let jwt : string
      let ltiLaunchMessage : object | null = null

      try {
      /* Note that the platform sends the encoded jwt in a form with a single parameter, which
         is 'JWT'. The form is parsed here to get the jwt. */
       jwt = querystring.parse((context.req as any).body).JWT as string
       ltiLaunchMessage = await Assignment.getLaunchMessage(jwt, process.env.canvas_public_key_set_url as string)
      } catch(ex) {
        console.warn('Error occurred while getting ltiLaunchMessage from jwt. Reason: ' + ex)
        ltiLaunchMessage = null
      }
      finally {
        if (ltiLaunchMessage === null) {
          alert(generalError)
          console.warn('Authentication failed.')
          return {}
        }
      }

      const launchMessage = ltiLaunchMessage as any
      const assignmentType : string = context.params.assignment_type
      const assignmentId : string = context.params.assignment_key
      const userRoles = Assignment.getUserRoles(launchMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])
      const isInstructorOrTA : boolean = (userRoles.includes(Assignment.INSTRUCTOR) || userRoles.includes(Assignment.TA))
      const courseId = launchMessage[
        'https://purl.imsglobal.org/spec/lti/claim/context'].id

      try {
        await Assignment.ensureUserEnrolled(courseId, lti_auth.authUser.userId, userRoles, context.$axios)
      } catch (ex) {
        console.warn('Could not verify user enrollment in course. Reason: ' +ex)
        alert(generalError)
        return {}
      }

      let resp
      try {
        resp = await context.$axios.$get(`https://${process.env.backend}:3000/courses/${
        courseId
        }/assignments/${assignmentId}`,
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
        resp = null
      }
      finally {
        if (!resp || !resp.data) {
          console.warn('Assignment data could not be loaded. ')
          alert(generalError)
          return { }
        }
      }

      const submit_data : SubmitData = {
        submitted: resp.data.submission_status,
        viewerLink: resp.data.link
      }

      return {
        assignmentTitle: resp.data.title,
        assignmentType,
        assignmentId,
        launchMessage,
        submit_data,
        userRoles,
        courseId
      }
    }
  },

  fetch(){
    if (lti_auth.isLoggedIn === false) {
      console.warn('OIDC login failed')
      alert('Please log in to Canvas to view this assignment. ')
      this.$router.push('/')
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
  private assignmentId ?: string
  private launchMessage ?: any
  // eslint-disable-next-line camelcase
  private submit_data !: SubmitData
  private userRoles ?: string[]
  private courseId ?: string


  public created () {
    this.isCreated = true

    this.submit_data.accessCode = Assignment.getQueryVariable('access_code', this.submit_data.viewerLink)
    this.submit_data.docID = Assignment.getQueryVariable('docid', this.submit_data.viewerLink)
    this.submit_data.groupID = Assignment.getQueryVariable('group_id', this.submit_data.viewerLink)

    this.injectTest() // Inject dummy data
  }


  public async handleSubmit () {
    const courseId : string = this.launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/context'].id
    let assignmentResp

    try {
      await this.updateClientCredentials()     // Update client credentials token in store
    } catch (ex) {
      console.warn('OAuth client credential grant for assignment submission failed. Reason: ' +ex)
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
    const assignmentResourceId : string = this.launchMessage[
      'https://purl.imsglobal.org/spec/lti/claim/resource_link'].id
    let lineItemId : string = ''

    try {
      const lineItemsResp = await this.$axios.$get(
        `${process.env.canvas_path}/api/lti/courses/${courseId}/line_items`,
        {
          headers: {
            Accept: 'application/json+canvas-string-ids',
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

      let scoreData : any = {
          timestamp: `${new Date().toISOString()}`,
          activityProgress: 'Submitted',
          gradingProgress: 'PendingManual',
          userId: `${lti_auth.authUser.userId}`,
      }
      scoreData["https://canvas.instructure.com/lti/submission"] = {
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
              Authorization: `Bearer ${lti_auth.clientCredentialsToken}`,
              'Content-Type': 'application/x-www-form-urlencoded'
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
    if ( (this.userRoles) && (this.userRoles.includes('instructor') || this.userRoles.includes('ta')) ) {
      return 'GraderContainer'
    } else if (this.assignmentType === 'document_submission') {
      return 'DocumentSubmitter'
    } else if (this.assignmentType === 'comment_submission') {
      return 'CommentSubmitter'
    }

    return 'Error. No assignment component.'
  }


  private async updateClientCredentials() {
    const authHandler : ClientAuth = new ClientAuth(process.env.canvas_client_id as string,
      process.env.canvas_path as string)

    const clientToken = await authHandler.getGradeServicesToken()

    lti_auth.updateClientCredentialsToken(clientToken)
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

  /**
   * Decode and verify jwt. Need to verify using the platform's (Canvas) public keyset.
   */
  private static async getLaunchMessage (jwtBase64 : string, keysetUrl: string) : Promise<object | null> {
        return await JwtUtil.getAndVerifyWithKeyset(jwtBase64, keysetUrl)
  }



  private static getUserRoles (ltiRoles : string[]) : string[] {
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

  private static async ensureUserEnrolled(courseId: string, userId: string, roles: string[], axios: NuxtAxiosInstance){
    await ApiHelper.ensureRichReviewUserExists(lti_auth.authUser)
    const userRes = await axios.post(`https://${process.env.backend}:3000/courses/${
      courseId}/users/${lti_auth.authUser.userId}`,
      {roles},
      {
      headers: {
        Authorization: lti_auth.authUser.userId
      },
      httpsAgent: new https.Agent({
         rejectUnauthorized: false
      })
    })

    if (userRes.status > 202) {
      throw new Error(`Could not ensure that the user ${userId} is enrolled in the course ${courseId}`)
    }
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
