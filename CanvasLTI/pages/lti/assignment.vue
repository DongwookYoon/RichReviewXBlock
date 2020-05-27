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

    <!--if user role is instructor or TA then show grading view  -->
    <GraderContainer v-if="userRoles.includes(Assignment.INSTRUCTOR) || userRoles.includes(Assignment.TA)" :submit_data="submitData" />

    <!--else if user role is learner and NOT submitted then  -->
    <div v-else-if="userRoles.includes(Assignment.STUDENT) && submit_data.submitted === false" class="submit-area">
      <DocumentSubmitter v-if="assignmentType==='document_submission'" />

      <!--else if assignment_type is comment_submission then -->
      <CommentSubmitter
        v-else-if="assignmentType==='comment_submission'"
        :title="assignmentTitle"
        :userid="userID"
        :submit_data="submitData"
      />
    </div>

    <div v-else-if="submitted===true">
      <p>You have already submitted this assignment.</p>
    </div>
  </div>
</template>

<script lang="ts">
import * as https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import { Route } from 'vue-router'
// eslint-disable-next-line camelcase
import jwt_decode from 'jwt-decode'
import DocumentSubmitter from '../../components/document_submitter.vue'
import CommentSubmitter from '../../components/comment_submitter.vue'
import GraderContainer from '../../components/grader_container.vue'
import { ltiAuth } from '~/store' // Pre-initialized store.

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
  userID: 'aeaf282'
}

@Component({
  components: {
    DocumentSubmitter,
    CommentSubmitter,
    GraderContainer
  },

  async asyncData (context) {
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
            Authorization: ltiAuth.userID
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
  private userID: string = ''


  private assignmentTitle ?: string
  private assignmentType ?: string
  private assignmentID ?: string
  private ltiLaunchMessage ?: any
  // eslint-disable-next-line camelcase
  private submit_data !: SubmitData
  private userRoles ?: string[]

  created () : void {
    this.isCreated = true

    this.submit_data.accessCode = Assignment.getQueryVariable('access_code')
    this.submit_data.docID = Assignment.getQueryVariable('docid')
    this.submit_data.groupID = Assignment.getQueryVariable('group_id')

    this.injectTest() // Inject dummy data
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

  private static getQueryVariable (variable : string) : string {
    const query = window.location.search.substring(1)
    const vars = query.split('&')
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=')
      if (decodeURIComponent(pair[0]) == variable) {
        return decodeURIComponent(pair[1])
      }
    }
    console.log('Query variable %s not found', variable)
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
    this.userID = testData.userID
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
