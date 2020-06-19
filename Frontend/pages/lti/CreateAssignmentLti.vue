<template>
  <div v-if="success === true" id="create-assignment">
    <div id="assignment-details">
      <div id="assignment-type-section">
        <label id="assignment-type-label" for="assignment-type">Assignment type</label>
        <select id="assignment-type-selection" v-model="assignmentType" @change="saved = false">
          <option value="document_submission">
            PDF Document Submission
          </option>
          <option value="comment_submission">
            RichReview Comment Submission
          </option>
        </select>
      </div>

      <div v-if="assignmentType === 'comment_submission'" id="file-upload-section">
        <div>
          <h2 id="files-header" for="files">
            Files
          </h2>
          <input ref="files" class="doc-file-input" type="file" multiple @change="uploadFile()">
        </div>

        <div v-for="(file, key) in files" :key="key" class="file-listing">
          <p class="file">
            {{ file.name }} <span class="remove-file" @click="removeFile(key)">Remove</span>
          </p>
        </div>

        <button id="add-file-button" class="modal-button" @click="addFile">
          Add Files
        </button>
      </div>
    </div>

    <div id="finish-button-section">
      <button id="save-button" class="modal-button" value="Save" @click="save">
        Ok
      </button>
      <button id="cancel-button" class="modal-button" value="Cancel" @click="cancel">
        Cancel
      </button>
    </div>

    <div id="lti-data">
      <form
        id="lti_postback"
        ref="lti_response_form"
        method="POST"
        :action="postback_url"
      >
        <input type="hidden" name="JWT" :value="postback_jwt">
      </form>
    </div>
  </div>
</template>

<script lang = "ts">
import * as https from 'https'
import ApiHelper, { CourseData } from '~/utils/api-helper'
import JwtUtil from '~/utils/jwt-util'
import { Component, Vue } from 'nuxt-property-decorator'
import { mapGetters } from 'vuex'
import Roles from '~/utils/roles'
import { User, ITokenInfo } from '~/store/modules/LtiAuthStore'
// eslint-disable-next-line camelcase

const testData = {
  assignmentId: `${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`,
  success: true,
  courseId: `test_2`
}

const testCourseData = {
  id: testData.courseId,
  title: 'Test Course',
  dept: 'Test Department',
  number: '0000',
  section: '0000'
}

const testUser: User = {
  id: '109022885000538247847',
  userName: 'Test Instructor'
}

const DEBUG: boolean = process.env.debug_mode !== undefined &&
  process.env.debug_mode.toLowerCase().trim() === 'true'

/* eslint-disable camelcase */
@Component({
  middleware: DEBUG ? '' : 'oidc_handler', // Handle OIDC login request

  async asyncData (context) {
    if (DEBUG === true) {
      console.log(`Running in DEBUG mode.\n Test data: ${
        JSON.stringify(testData)
        }\n Test course: ${JSON.stringify(testCourseData)}`)

      context.store.dispatch('LtiAuthStore/logIn', testUser)
      await CreateAssignmentLti.makeCourseAndEnrollInstructor(testCourseData, testUser)

      return testData
    }

    /* Expect that middleware will handle login before this point. So
       if login has failed, this property in store will be false */
    if (context.store.getters['LtiAuthStore/isLoggedIn'] === false) {
      console.warn('Error. Platform user is expected to be authenticated before accessing this page.')
      return { }
    }

    /* // OAuth authorization token NOT required for lti deep linking
    if (context.store.getters['LtiAuthStore/codeToken'] === null) {
      console.log('No valid OAuth code token. Redirecting to OAuth handler...')

      const redirectUri: string = encodeURIComponent(`https://${
        process.env.backend}${context.route.fullPath}`)

      context.redirect(`/lti/oauth?redirect_uri=${redirectUri}`)
      return { }
    }
    */

    if (process.server === false) {
      return
    }

    let assignmentId: string = ''
    let ltiReqMessage : any
    let success : boolean = false

    /* As per IMS Security Framework Spec (https://www.imsglobal.org/spec/security/v1p0/),
      the data required to perform the launch is contained within the id_token jwt */
    const jwt : string = (context.req.body).id_token as string

    try {
      ltiReqMessage = await JwtUtil.getAndVerifyWithKeyset(jwt, process.env.canvas_public_key_set_url as string)
    }
    catch (ex) {
      console.warn(`Invalid ltiDeepLinkRequest. Could not validate jwt.  ${jwt}
          \n Reason: ${ex}`)
      console.warn('Request body contained: ' + JSON.stringify(context.req.body))
      return { success }
    }

    const userRoles = Roles.getUserRoles(ltiReqMessage['https://purl.imsglobal.org/spec/lti/claim/roles'])

    if (userRoles.includes(Roles.INSTRUCTOR) === false) {
      console.warn('Unauthorized. Only instructors may create assignments.')
      context.redirect(process.env.canvas_path as string)
      return { success }
    }

    const courseId = ltiReqMessage['https://purl.imsglobal.org/spec/lti/claim/context'].id

    // Generate assignment key
    assignmentId = `${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`

    try {
      await CreateAssignmentLti.ensureCourseInstructorEnrolled(ltiReqMessage,
        context.store.getters['LtiAuthStore/authUser'],
        courseId)

      success = true

      return {
        ltiReqMessage,
        assignmentId,
        courseId,
        success
      } // Inject into CreateAssignment instance data
    }
    catch (ex) {
      console.warn('Failed to add instructor in RichReview record of course. Reason: ' + ex)
      return { success }
    }
  },

  computed: {
    ...mapGetters('LtiAuthStore', {
      user: 'authUser',
      isLoggedIn: 'isLoggedIn',
      codeToken: 'codeToken'
    })
  }

})
export default class CreateAssignmentLti extends Vue {
  /* Component data */
  private saved: boolean = true
  private assignmentType : string = 'document_submission'
  private files : File [] = []
  private assignmentId ?: string
  private ltiReqMessage ?: any
  private success !: boolean
  private courseId !: string
  private postback_jwt : string = ''
  private postback_url : string = ''
  /* End data */

  /* Mappings for Vuex store getters */
  public isLoggedIn !: boolean
  public codeToken !: ITokenInfo
  public user !: User
  /* End mapped getters */
  public mounted () {
    if (this.isLoggedIn === false) {
      alert('You must be logged in to Canvas to create an assignment')
      window.location.replace(process.env.canvas_path as string)
    }
    if (this.success === false) {
      alert('An error occurred while loading. Please try to refresh the page.\n' +
        'If this error persists, contact the RichReview system administrator for assistance.')
    }
  }

  /* Component-level methods */
  public addFile () : void {
    const filesInput : any = this.$refs.files
    filesInput.click() // Simulate click on the upload button so enable 1 button add+open file system UI
  }

  public uploadFile () : void {
    const filesInput : any = this.$refs.files
    const uploadedFiles : FileList = filesInput.files

    for (let i = 0; i < uploadedFiles.length; i++) {
      this.files.push(uploadedFiles[i])
    }
  }

  public removeFile (key: number) : any {
    this.files.splice(key, 1)
  }

  public async save () {
    this.saved = true
    const courseId : string = this.courseId

    // eslint-disable-next-line camelcase
    const now_date = new Date()
    // eslint-disable-next-line camelcase
    const until_date = now_date.setFullYear(now_date.getFullYear() + 100)
    // eslint-disable-next-line camelcase
    const assignment_data = {
      id: this.assignmentId,
      title: 'RichReview',
      description: 'LTI Assignment',
      lti: true,
      hidden: false,
      available_date: new Date().toISOString(),
      due_date: until_date,
      until_date,
      type: this.assignmentType,
      group_assignment: false,
      allow_multiple_submissions: false,
      count_toward_final_grade: 0
    }
    /* Create a record of the assignment record in RichReview first */
    try {
      if (this.assignmentType === 'comment_submission') {
        if (this.files.length === 0) {
          alert('One or more files is required for a comment submission assignment')
          return
        }

        const formData = new FormData()
        for (let i = 0; i < this.files.length; i++) {
          const file : File = this.files[i]
          if (file.type !== 'application/pdf') {
            alert('Files must be in pdf format')
            return
          }
          formData.append(`file-${i}`, file)
        }

        formData.append('assignment_data', JSON.stringify(assignment_data))

        await this.$axios.$post(
            `https://${process.env.backend}:3000/courses/${
              courseId
              }/assignments/comment_submission_assignment`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: this.user.id
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
        )
      } // End-if
      else {
        await this.$axios.$post(
            `https://${process.env.backend}:3000/courses/${
              courseId
              }/assignments/document_submission_assignment`,
            { assignment_data },
            {
              headers: {
                Authorization: this.user.id
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
        )
      }// end-else

      /* General format of URL should be /lti/assignment/:assignment_type/:assignment_key.
      Note that this is sufficient for retreiving all assignment data from RR
      backend when the user accesses assignment. */
      const ltiLink = `${process.env.prod_url}/lti/assignments/${this.assignmentType}/${this.assignmentId}`
      console.log(` Successfuly created assignment in RichReview! \nSubmission lti Link: ${ltiLink}`)

      await this.postBackToPlatform(ltiLink)
      this.saved = true
    }
    catch (e) {
      this.saved = false
      console.warn(e)
      window.alert('Creating the assignment failed. Please try again. If this error continues,' +
      ' please contact the RichReview administrator.')
    }
  }

  /**
   *  Take user back to the LTI platform. If the user has made changes that are not saved,
   *  prompt user to ask if they want to cancel, as the cancel action cannot be reversed.
   */
  public cancel () : void {
    try {
      if (this.saved === false) {
        if (confirm('Do you want to exit this? Changes you made may not be saved.') === true) {
          this.postBackToPlatform()
        }
      }
      else {
        this.postBackToPlatform()
      }
    }
    catch (ex) {
      console.warn('Cancelling assignment creation failed. Reason ' + ex)
      alert('Cancelling failed. You may click the X in the top right to exit this window.')
    }
  }
  /* End component-level methods */

  /**
   * Finish LTI deep linking flow to send the user back to the consumer (LTI platform).
   * Sends the required POST ltiDeepLinkResponse back to the consumer in an HTML form.
   *
   * See LTI spec for more details here: https://www.imsglobal.org/spec/lti-dl/v2p0#dfn-deep-linking-response-message
   */
  public async postBackToPlatform (ltiLink ?: string) {
    if (DEBUG) {
      (this.$refs.lti_response_form as HTMLFormElement).submit()
      return
    }

    const jwtResponse = this.generateJWTResponse(ltiLink)

    /* Set form post back URL for submitting data back to Canvas */
    this.postback_url = this.ltiReqMessage[
      'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'].deep_link_return_url

    try {
      this.postback_jwt = await ApiHelper.createDeepLinkJWT(jwtResponse,
        this.ltiReqMessage.nonce,
        this.ltiReqMessage.iss)
    }
    catch (ex) {
      console.warn(`Creating JWT for lti deep link response failed. Reason: ${ex}`)
      throw ex
    }

    console.log('Response postback jwt:' + this.postback_jwt);
    console.log(this.$refs.lti_response_form);
    console.log(JSON.stringify(this.$refs.lti_response_form));

    /* Submit the form to complete lti deep linking flow */
    (this.$refs.lti_response_form as HTMLFormElement).submit()
  }

  /**
   * Generate base-64 JWT string for ltiDeepLinkResponse message.
   * Note that if no items were created (i.e. user cancelled), provider must still send
   * back a response with no content items. This can be achieved by calling this
   * method without the option ltiLink argument.
   */
  private generateJWTResponse (ltiLink ?: string) {
    const reqMsg = this.ltiReqMessage
    const verificationData = reqMsg[
      'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'].data
    const contentItems : {}[] = []

    /* Per LTI spec, details of how to launch RR are send back in contentItems array. */

    if (ltiLink !== undefined) {
      const linkItem : any = {
        type: 'link',
        title: 'RichReview Assignment',
        url: ltiLink,
        window: {
          targetName: `RichReview_${this.assignmentId}`,
          windowFeatures: 'menubar=yes,location=yes,status=yes,resizable=yes,scrollbars=no'
        },
        iframe: {
          width: 800,
          height: 600,
          src: ltiLink
        }
      }
      contentItems.push(linkItem)
    }

    let jwtResponse : string = `{
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "${process.env.deployment_id}",
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": ${JSON.stringify(contentItems)}
    `

    /* Only add 'data' claim if it was included in original message */
    if (verificationData !== undefined) {
      jwtResponse += `, "https://purl.imsglobal.org/spec/lti-dl/claim/data": "${verificationData}"`
    }
    jwtResponse += '}'

    return JSON.parse(jwtResponse)
  }

  private static async ensureCourseInstructorEnrolled (ltiMsg: any, user : User, courseId: string) {
    const contextPropName : string = 'https://purl.imsglobal.org/spec/lti/claim/context'
    const courseData : CourseData = {
      id: courseId,
      title: ltiMsg[contextPropName].title || '',
      dept: '',
      number: ltiMsg[contextPropName].label || '',
      section: ''
    }

    await CreateAssignmentLti.makeCourseAndEnrollInstructor(courseData, user)
  }

  private static async makeCourseAndEnrollInstructor (courseData: CourseData, user: User) {
    // Ensure that the course is created
    // eslint-disable-next-line camelcase
    console.log(`Creating course with id ${courseData.id} if it does not exist`)
    await ApiHelper.ensureCourseExists(courseData, user.id)

    console.log(`Adding instructor ${user.id} to course if they do not exist in course.`)
    await ApiHelper.ensureUserEnrolled(courseData.id, user, [Roles.INSTRUCTOR])
  }

  private static isInstructor (roles : string[]) : boolean {
    for (const curRole of roles) {
      if (curRole.toLowerCase().includes('instructor')) {
        return true
      }
    }

    return false
  }
}

</script>

<style scoped>
@import url('@/static/nuxt_static_viewer/stylesheets/lti_style.css');

#create-assignment {
  margin: 2rem 2rem 2rem 2%;
  min-height: 100vh;
}

#assignment-type-label {
  font-weight: bold;
  font-size: 0.95rem;
}

#assignment-type-selection {
  min-height: 1.2rem;
  margin-left: 0.5rem;
  font-size: 1rem;
}

#finish-button-section {
  margin-top: 5rem;
}

#file-upload-section {
  margin-top: 1.5rem;
  width: 25%;
  min-width: 20vw;
}

#files-header {
  font-size: 0.95rem;
  border-bottom: 1px solid black;
}

#add-file-button {
  margin-top: 1rem;
}

.modal-button {
  color: white;
  background-color: #0c2343;
  border-radius: 0.2rem;
  width: 5rem;
  text-align: center;
  cursor: pointer;
  font-size: 0.9rem;
  padding:0.1rem;
}

.remove-file {
  color: red;
  cursor: pointer;
  margin-left: 2rem;
}

.file {
  margin: 0;
}

.doc-file-input {
  display: none;
}

</style>
