<template>
  <div id="document-submitter">
    <div id="file-upload-section">
      <div>
        <h2 id="files-header">
          Assignment Files
        </h2>
        <input ref="files" @change="handleFileUpload()" class="file-input" type="file" multiple>
      </div>

      <div v-for="(file, key) in files" :key="key" class="file-listing">
        <p class="file">
          {{ file.name }} <span @click="removeFile(key)" class="remove-file">Remove</span>
        </p>
      </div>

      <button id="add-file-button" @click="addFile" class="assignment-button">
        Add Files
      </button>
    </div>

    <div>
      <button id="submit-button" v-if="files.length > 0" @click="submitAssignment()" class="assignment-button">
        Submit
      </button>
    </div>
  </div>
</template>

<script lang="ts">

import * as https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
// import { Route } from 'vue-router'
// import { ltiAuth } from '~/store' // Pre-initialized store for authentication.

@Component
export default class DocumentSubmitter extends Vue {
  @Prop({ type: Boolean, required: true }) readonly submitted !: boolean;
  @Prop({ type: String, required: true }) readonly userID !: string;

  private files : File[] = [];


  private submitAssignment () {
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
    /* TODO Submit to Canvas and mark associated assignment as marked in RichReview */

    try {
      await this.$axios.$post(
          `https://${process.env.backend}:3000/lti_assignments/${
            this.$route.params.assignment_id}/document_submissions`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: this.userID
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
      )
    } catch (e) {
      window.alert(e.response.data.message)
      return
    }

    alert('Assignment successfully submitted!')
    this.isSubmitted = true
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
  font-size: 1.75rem;
  font-weight: bold;
  border-bottom: 1px solid black;
}

#add-file-button {
  margin-top: 1rem;
  font-size: 1.2rem;
}

.assignment-button {
  color: white;
  background-color: #0c2343;
  border-radius: 0.3rem;
  min-width: 5rem;
  min-height: 1rem;
  text-align: center;
  cursor: pointer;
  font-size: 1.2rem;
  padding:0.1 0.2rem;
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

#submit-button{
  margin-top: 8rem;
  font-size: 1.5rem;
}

</style>
