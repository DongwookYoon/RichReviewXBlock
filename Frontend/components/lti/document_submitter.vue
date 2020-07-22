<template>
  <div id="document-submitter">
    <div id="file-upload-section">
      <div>
        <h2 id="files-header">
          Assignment Files
        </h2>
        <input ref="files" class="file-input" type="file" multiple @change="handleFileUpload()">
      </div>

      <div v-for="(file, key) in files" :key="key" class="file-listing">
        <p class="file">
          {{ file.name }} <span class="remove-file" @click="removeFile(key)">Remove</span>
        </p>
      </div>

      <button id="add-file-button" class="assignment-button" @click="addFile">
        Add Files
      </button>
    </div>

    <div id="task-end-buttons">
      <button v-if="files.length > 0" id="submit-button" class="assignment-button" @click="submitAssignment()">
        Submit
      </button>
      <button
        v-if="show_cancel_button === true"
        id="cancel-button"
        class="assignment-button"
        @click="cancel"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script lang="ts">

import * as https from 'https'
import { Component, Prop, Emit, Vue } from 'nuxt-property-decorator'

/* eslint-disable camelcase */
@Component
export default class DocumentSubmitter extends Vue {
  @Prop({ required: true }) readonly user_id !: string;
  @Prop({ required: true }) readonly course_id !: string;
  @Prop({ required: true }) readonly assignment_id !: string
  @Prop({ required: false }) readonly show_cancel_button !: boolean

  private files : File[] = [];

  @Emit('submit-assignment')
  public submitSuccess () {
    console.log('Assignment successfully submitted to RichReview!')
  }

  @Emit('cancel-submit')
  public cancel () {
    console.log('User cancelled submission.')
  }

  private async submitAssignment () {
    if (this.files.length === 0) {
      alert('One or more files is required for a submission.')
      return
    }
    if (confirm('Are you sure you want to submit this assignment?') === false) {
      return
    }
    const formData = new FormData()
    for (let i = 0; i < this.files.length; i++) {
      const file = this.files[i]
      if (file.type !== 'application/pdf') {
        alert('Files must be in pdf format')
        return
      }
      formData.append('files[' + i + ']', file)
    }

    try {
      await this.$axios.$post(
          `https://${process.env.backend}:3000/courses/${
            this.course_id}/assignments/${
            this.assignment_id}/document_submissions`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: this.user_id
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
      )
    }
    catch (e) {
      window.alert(e.response ? e.response.data.message : e)
      return
    }

    this.submitSuccess()
  }

  private addFile () : void {
    const filesInput : any = this.$refs.files
    filesInput.click()
  }

  private removeFile (key: number) : void {
    this.files.splice(key, 1)
  }

  private handleFileUpload () : void {
    const filesInput : any = this.$refs.files
    const uploadedFiles : FileList = filesInput.files

    for (let i = 0; i < uploadedFiles.length; i++) {
      this.files.push(uploadedFiles[i])
    }
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
  min-width: 200px;
}

#files-header {
  font-size: 1.5rem;
  font-weight: bold;
  border-bottom: 1px solid black;
}

#add-file-button {
  margin-top: 1rem;
  font-size: 1.2rem;
}

#cancel-button {
  background: darkred;
  margin-left: 2rem;
}

#task-end-buttons {
  margin-top: 8rem;
}

.assignment-button {
  color: white;
  background-color: #0c2343;
  border-radius: 0.3rem;
  min-width: 5rem;
  min-height: 1rem;
  text-align: center;
  cursor: pointer;
  font-size: 1.5rem;
  padding:0.1 0.3rem;
}

.file {
  margin: 0;
}

.remove-file {
  color: red;
  cursor: pointer;
  margin-left: 3rem;
}

.file-input {
  display: none;
}

</style>
