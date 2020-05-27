<template>
  <div id="create-assignment">
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
// eslint-disable-next-line camelcase
import jwt_decode from 'jwt-decode'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import { ltiAuth } from '~/store' // Pre-initialized store.

@Component({
  asyncData ({ req }: any) : any {
    if (process.server === true) {
      const jwt : any = req.body

      // TODO Decode and verify jwt. Need to verify using the platform's (Canvas) public
      // key which is retrieved using OAuth
      const ltiReqMessage : any = jwt_decode(jwt)

      if (CreateAssignment.validateToken(ltiReqMessage) === true) {
        // Generate assignment key
        const assignmentKey : string = `${Date.now()}_${Math.floor((Math.random() * 100000) + 1)}`
        return {
          ltiReqMessage,
          assignmentKey
        } // Inject into CreateAssignment instance data
      } else {
        console.warn('Invalid ltiDeepLinkRequest\n' + ltiReqMessage)
      }
    }
  }
})
export default class CreateAssignment extends Vue {
  /* Component data */
  private saved: boolean = true
  private assignmentType : string = 'document_submission'
  private files : File [] = []
  private assignmentKey ?: string;
  ltiReqMessage ?: any
  /* End data */

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

        formData.append('assignment_data', JSON.stringify({
          assignment_key: this.assignmentKey
        }))

        await this.$axios.$post(
            `https://${process.env.backend}:3000/lti_assignments/comment_submission_assignment`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: this.ltiReqMessage.sub // TODO verify that sub is an immutable GUID across contexts
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
        )
      } // End-if
      else {
        await this.$axios.$post(
            `https://${process.env.backend}:3000/lti_assignments/document_submission_assignment`,
            { assignment_key: this.assignmentKey },
            {
              headers: {
                Authorization: this.ltiReqMessage.sub // TODO verify that sub is an immutable GUID across contexts
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
        )
      }// end-else
      const ltiLink = `/lti/assignment/${this.assignmentType}/${this.assignmentKey}`
      this.postBackToPlatform(ltiLink)
    } catch (e) {
      this.saved = false
      window.alert(e.response.data.message)
    }
  }

  /**
   *  Take user back to the LTI platform
   */
  public cancel () : void {
    if (this.saved === false) {
      if (confirm('Do you want to exit this? Changes you made may not be saved.') === true) {
        this.postBackToPlatform()
      }
    } else {
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
    const jwtResponse = this.generateJWTResponse(ltiLink)
    const postBackAddress = this.ltiReqMessage['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'].deep_link_return_url
    const formData : FormData = new FormData()

    formData.append('JWT', jwtResponse)
    await this.$axios.$post(postBackAddress, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })
  }

  /**
   * Generate base-64 JWT string for ltiDeepLinkResponse message
   * // TODO Determine best approach to sign the JWT response
   */
  private generateJWTResponse (ltiLink ?: string) : string {
    const reqMsg = this.ltiReqMessage
    const contentItems : [] = []

    /* Per LTI spec, details of how to launch RR are send back in contentItems array.
       If no items were created (i.e. user cancelled), provider must still send
       empty contentItems array */
    if (ltiLink !== undefined) {
      const linkItem : any = {
        type: 'link',
        title: 'Create a RichReview Assignment',
        url: ltiLink,
        window: {
          targetName: 'RichReview',
          windowFeatures: 'height=1920,width=1080,menubar=no'
        },
        iframe: {
          width: 800,
          height: 600,
          src: ltiLink
        }
      }
    }
    const jwtResponse : string = `{
      "iss": "${reqMsg.aud[0]}",
      "aud": ["${reqMsg.iss}"],
      "exp": "${reqMsg.exp}",
      "iat": "${reqMsg.iat}",
      "nonce" "${reqMsg.nonce}",
      "azp" "${reqMsg.azp}",
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "${process.env.deployment_id}",
      "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": ${JSON.stringify(contentItems)},
      "https://purl.imsglobal.org/spec/lti-dl/claim/data": "${reqMsg.data}"
      }`

    return jwtResponse
  }

  /**
   * TODO Validate the jwt token
   */
  private static validateToken (jwt: Object) : boolean {
    console.log(jwt)
    return true
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
