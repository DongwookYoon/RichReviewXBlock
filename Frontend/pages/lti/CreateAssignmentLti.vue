
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
  courseId: '1'
}

const testUser: User = {
  id: 'google_109022885000538247847',
  userName: 'Test Instructor'
}

@Component({
  middleware: 'oidc_handler', // Handle OIDC login request

  async asyncData (context) {
    if (process.env.debug_mode &&
        (process.env.debug_mode as string).toLowerCase() === 'true') {
      context.store.dispatch('LtiAuthStore/logIn', testUser)

      console.log('Assignment key should be ' + testData.assignmentId)
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

    const jwt : string = (context.req.body).JWT as string

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
      alert('Error. Only instructors may create assignments.')
      context.redirect(process.env.canvas_path as string)
      return { success }
    }

    const courseId = ltiReqMessage['https://purl.imsglobal.org/spec/lti/claim/context'].id

    // Generate assignment key
    assignmentId = `${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`

    try {
      await CreateAssignmentLti.ensureCourseInstructorEnrolled(ltiReqMessage,
        this.$store.getters['LtiAuthStore/authUser'].id,
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
      alert(`An error occurred while loading. Please try to refresh the page.\n
        If this error persists, contact the RichReview system administrator for assistance.`)
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
      const ltiLink = `${process.env.prod_url}/lti/assignments/${this.assignmentType}/${this.assignmentId}`
      console.log(` Successfuly created assignment in RichReview! \nSubmission lti Link: ${ltiLink}`)

      await this.postBackToPlatform(ltiLink)
    }
    catch (e) {
      this.saved = false
      window.alert(e)
    }
  }

  /**
   *  Take user back to the LTI platform. If the user has made changes that are not saved,
   *  prompt user to ask if they want to cancel, as the cancel action cannot be reversed.
   */
  public cancel () : void {
    if (this.saved === false) {
      if (confirm('Do you want to exit this? Changes you made may not be saved.') === true) {
        this.postBackToPlatform()
      }
    }
    else {
      this.postBackToPlatform()
    }
  }
  /* End component-level methods */

  /**
   * Finish LTI deep linking flow to send the user back to the consumer (LTI platform).
   * Sends the required POST ltiDeepLinkResponse back to the consumer.
   * General format of URL should be /lti/assignment/:assignment_type/:assignment_key.
   * Note that this is sufficient for retreiving all assignment data from RR
   * backend when the user accesses assignment.
   *
   * See LTI spec for more details here: https://www.imsglobal.org/spec/lti-dl/v2p0#dfn-deep-linking-response-message
   */
  private async postBackToPlatform (ltiLink ?: string) {
    const jwtResponse = await this.generateJWTResponse(ltiLink)
    const postBackAddress = this.ltiReqMessage[
      'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'].deep_link_return_url
    const jwtUrlEncoded = JwtUtil.createJwtFormUrlEncoded(jwtResponse)

    await this.$axios.$post(postBackAddress,
      jwtUrlEncoded, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
  }

  /**
   * Generate base-64 JWT string for ltiDeepLinkResponse message
   */
  private async generateJWTResponse (ltiLink ?: string) {
    const reqMsg = this.ltiReqMessage
    const contentItems : {}[] = []

    /* Per LTI spec, details of how to launch RR are send back in contentItems array.
       If no items were created (i.e. user cancelled), provider must still send
       empty contentItems array */
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

    const jwtResponse : string = `{
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "${process.env.deployment_id}",
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": ${JSON.stringify(contentItems)},
      "https://purl.imsglobal.org/spec/lti-dl/claim/data": "${reqMsg.data}"
      }`

    const scoreJWT = await JwtUtil.encodeJWT(JSON.parse(jwtResponse), reqMsg.nonce)
    if (scoreJWT === null) {
      throw new Error('Creating the JWT failed.')
    }

    return scoreJWT
  }

  private static async ensureCourseInstructorEnrolled (ltiMsg: any, user : User, courseId: string) {
    await ApiHelper.ensureRichReviewUserExists(user) // Create the user if they do not exist in RR.

    const contextPropName : string = 'https://purl.imsglobal.org/spec/lti/claim/context'
    const courseData : CourseData = {
      id: courseId,
      title: ltiMsg[contextPropName].title || '',
      dept: '',
      number: ltiMsg[contextPropName].label || '',
      section: ''
    }

    // Ensure that the course is created
    // eslint-disable-next-line camelcase
    await ApiHelper.ensureCourseExists(courseData, user.id)

    await ApiHelper.ensureUserEnrolled(courseId, user, [Roles.INSTRUCTOR])
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
