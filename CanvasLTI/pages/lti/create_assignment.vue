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

      <div id="file-upload-section" v-if="assignmentType === 'comment_submission'">
        <div>
          <h2 id="files-header" for="files">
            Files
          </h2>
          <input ref="files" @change="handleFileUpload()" type="file" multiple>
        </div>

        <div v-for="(file, key) in files" :key="key" class="file-listing">
          <p class="file">
            {{ file.name }} <span @click="removeFile(key)" class="remove-file">Remove</span>
          </p>
        </div>

        <button id="add-file-button" @click="addFile" class="modal-button">
          Add Files
        </button>
      </div>
    </div>

    <div id="finish-button-section">
      <button id="save-button" @click="save" class="modal-button" value="Save">
        Ok
      </button>
      <button id="cancel-button" @click="cancel" class="modal-button" value="Cancel">
        Cancel
      </button>
    </div>
  </div>
</template>

<script lang = "ts">
import * as https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import $axios from 'axios'
import { ltiAuth } from '~/store' // Pre-initialized store.

@Component
export default class CreateAssignment extends Vue {
  /* Component data */
  private saved: boolean = true;
  private assignmentType : string = 'document_submission';
  private files : File [] = [];
  /* End data */

  middleware = 'auth'

  /* Component methods */
  public addFile () {
    const filesInput : any = this.$refs.files
    filesInput.click() // Simulate click on the upload button so enable 1 button add+open file system UI
  }

  public uploadFile () {
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

        await $axios.post(
            `https://${process.env.backend}:3000/courses/${
              this.$route.params.course_id
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
        this.postBackToPlatform()
      } // End-if

      else {
        await $axios.post(
            `https://${process.env.backend}:3000/courses/${
              this.$route.params.course_id
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
        this.postBackToPlatform()
      }
    } catch (e) {
      this.saved = false
      window.alert(e.response.data.message)
    }
  }

  /**
   *  Take user back to the LTI platform
   */
  public cancel () {
    console.log(ltiAuth)
  }

  /* End methods */

  private postBackToPlatform () {

  }

  /* Vuex route leave handler. Gives user chance to save if
  changes are not saved. */
  beforeRouteLeave (to: any, from : any, next : any) {
    if (this.saved === false) {
      if (confirm('Do you want to exit this? Changes you made may not be saved.') === true) {
        return next()
      } else {
        return next(false)
      }
    }
    return next()
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
}

</style>
