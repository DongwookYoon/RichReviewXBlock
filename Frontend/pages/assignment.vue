<template>
  <div>
    <Header />
    <h1>Assignment Page</h1>
    <div>{{ assignment }}</div>
    <button
      v-if="permissions === 'instructor' || permissions === 'ta'"
      @click="go_to_edit_assignment"
    >
      Edit
    </button>
    <button
      v-if="permissions === 'instructor' || permissions === 'ta'"
      @click="delete_assignment()"
    >
      Delete
    </button>
    <button
      v-if="permissions === 'instructor' || permissions === 'ta'"
      @click="got_to_submissions"
    >
      View Submissions
    </button>
    <button
      v-if="
        (permissions === 'instructor' || permissions === 'ta') &&
          grader_link !== ''
      "
      @click="go_to_grader"
    >
      Grader
    </button>
    <div
      v-if="
        viewer_link !== '' &&
          assignment.type === 'comment_submission' &&
          permissions === 'student'
      "
    >
      <h2 @click="go_to_viewer">
        Click here to start annotating the document
      </h2>
    </div>
    <div
      v-if="
        viewer_link !== '' &&
          assignment.type === 'document_submission' &&
          permissions === 'student'
      "
    >
      <h2 @click="go_to_current_submission">
        View current submission
      </h2>
    </div>
    <div
      v-if="
        assignment.type === 'document_submission' &&
          (permissions === 'student' &&
            (viewer_link === '' ||
              (viewer_link !== '' && assignment.allow_multiple_submissions)))
      "
    >
      <div class="large-12 medium-12 small-12 cell">
        <label
          >Files
          <input
            id="files"
            ref="files"
            type="file"
            multiple
            @change="handleFileUpload()"
          />
        </label>
      </div>
      <div class="large-12 medium-12 small-12 cell">
        <div v-for="(file, key) in files" :key="key" class="file-listing">
          {{ file.name }}
          <span class="remove-file" @click="removeFile(key)">Remove</span>
        </div>
      </div>
      <br />
      <div class="large-12 medium-12 small-12 cell">
        <button @click="addFiles()">Add Files</button>
      </div>
      <br />
      <div class="large-12 medium-12 small-12 cell">
        <button @click="submitAssignment()">Submit</button>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase */

import https from 'https'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/footer'

export default {
  name: 'Assignment',
  components: { Footer, Header },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/${context.params.course_id}/assignments/${
        context.params.assignment_id
      }`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    return {
      permissions: res.data.permissions,
      assignment: res.data.assignment,
      viewer_link: res.data.link,
      files: [],
      grader_link: res.data.grader_link,
      grader_submission_id: res.data.grader_submission_id
    }
  },
  methods: {
    go_to_edit_assignment() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/edit`
      )
    },
    got_to_submissions() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/submissions`
      )
    },
    go_to_grader() {
      window.open(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/submissions/${this.grader_submission_id}/grader?${this.grader_link}`
      )
    },
    go_to_viewer() {
      window.open(
        `/courses/${this.$route.params.course_id}/viewer?${this.viewer_link}`
      )
    },
    go_to_current_submission() {
      window.open(
        `/courses/${this.$route.params.course_id}/viewer?${this.viewer_link}`
      )
    },
    addFiles() {
      this.$refs.files.click()
    },
    removeFile(key) {
      this.files.splice(key, 1)
    },
    handleFileUpload() {
      const uploadedFiles = this.$refs.files.files

      for (let i = 0; i < uploadedFiles.length; i++) {
        this.files.push(uploadedFiles[i])
      }
    },
    async delete_assignment() {
      await axios.delete(
        `https://localhost:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.$route.params.assignment_id}`,
        {
          headers: {
            Authorization: this.$auth.user.sub
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      this.$router.push(`/courses/${this.$route.params.course_id}/`)
    },
    async submitAssignment() {
      const formData = new FormData()
      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i]
        formData.append('files[' + i + ']', file)
      }

      await axios.post(
        `https://localhost:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.$route.params.assignment_id}/document_submissions`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: this.$auth.user.sub
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )

      this.$router.push(`/courses/${this.$route.params.course_id}`)
    }
  }
}
</script>

<style scoped>
input[type='file'] {
  position: absolute;
  top: -500px;
}
span.remove-file {
  color: red;
  cursor: pointer;
  float: right;
}
</style>
