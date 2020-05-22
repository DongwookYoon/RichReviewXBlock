<template>
  <div id="document-submitter">
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
import $axios from 'axios'
import { Route } from 'vue-router'
import { ltiAuth } from '~/store' // Pre-initialized store for authentication.

@Component
export default class DocumentSubmitter extends Vue {
  @Prop({ type: Boolean, required: true }) readonly submitted !: boolean;

  private isSubmitted : boolean = false;
  private files : File[] = [];

  created () {
    this.isSubmitted = this.submitted
  }

  private async submitAssignment () : Promise<any> {
    if (this.files.length === 0) {
      alert('One or more files is required for a submission.')
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
      await $axios.post(
          `https://${process.env.backend}:3000/courses/${
            this.$route.params.course_id
            }/assignments/${this.$route.params.assignment_id}/document_submissions`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: this.$store.state.authUser.id
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
      )
      alert('Assignment successfully submitted!')
      this.isSubmitted = true
      this.$router.push(`/edu/courses/${this.$route.params.course_id}`)
    } catch (e) {
      window.alert(e.response.data.message)
    }
  }

  private addFiles () : void {
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
  min-width: 20vw;
}

#files-header {
  font-size: 0.95rem;
  border-bottom: 1px solid black;
}

#add-file-button {
  margin-top: 1rem;
}

.assignment-button {
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
