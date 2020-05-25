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
import jwt_decode from 'jwt-decode'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import $axios from 'axios'
import { ltiAuth } from '~/store' // Pre-initialized store.

@Component({
  asyncData ({ req }: any) : any {
    if (process.server === true) {
      const jwt : any = req.body
      const ltiMessage : any = jwt_decode(jwt)

      if (CreateAssignment.validateToken(ltiMessage) === true) {
        return { ltiMessage } // Inject into CreateAssignment instance data
      } else {
        console.warn('Invalid ltiDeepLinkRequest\n' + ltiMessage)
      }
    }
  }
})
export default class CreateAssignment extends Vue {
  /* Component data */
  private saved: boolean = true
  private assignmentType : string = 'document_submission'
  private files : File [] = []
  ltiMessage ?: any
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
          assignment_type: this.assignmentType,
          lti: true
        }))
        //TODO change this to create the assignment without associating it with a course id;
        // need to change the route and handler on backend
        await $axios.post(
            `https://${process.env.backend}:3000/courses/${
              this.courseID
              }/assignments/comment_submission_assignment`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: ltiAuth.userID
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
        )
        // this.$router.push(`/edu/courses/${this.$route.params.course_id}`);
      } // End-if

      else {
        //TODO change this to create the assignment without associating it with a course id;
        // need to change the route and handler on backend
        await $axios.post(
            `https://${process.env.backend}:3000/courses/${
              this.courseID
              }/assignments/document_submission_assignment`,
            { assignment_type: this.assignmentType, lti: true },
            {
              headers: {
                Authorization: ltiAuth.userID
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
        )
        // this.$router.push(`/edu/courses/${this.$route.params.course_id}`)
      }// end-else
      await this.sendConsumerResponse()
      this.navigateToPlatform()
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
        this.navigateToPlatform()
      }
    } else {
      this.navigateToPlatform()
    }
  }
  /* End component-level methods */


  /**
   * TODO Validate the jwt token
   */
  private static validateToken (jwt: Object) : boolean {
    console.log(jwt)
    return true
  }

  /**
   * Sends the required POST ltiDeepLinkResponse back to the tool consumer (platform)
   */
  private async sendConsumerResponse () {

  }

  /**
   * Sends client browser back to the URL specified in LTI request.
   * This is typically the LMS consumer assignment creation page
   */
  private navigateToPlatform () : void {
    window.location.replace('/')
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
