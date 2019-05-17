<template>
  <div class="container">
    <h1>Assignment Page</h1>
    <div>{{ assignment }}</div>
    <button
      v-if="permissions === 'instructor' || permissions === 'ta'"
      @click="
        $router.push(
          `/courses/${$route.params.course_id}/assignments/${
            $route.params.assignment_id
          }/edit`
        )
      "
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
      @click="
        $router.push(
          `/courses/${$route.params.course_id}/assignments/${
            $route.params.assignment_id
          }/submissions`
        )
      "
    >
      View Submissions
    </button>
    <div v-if="permissions === 'student'">
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
  </div>
</template>

<script>
/* eslint-disable no-console */

import axios from 'axios'

export default {
  name: 'Assignment',
  asyncData(context) {
    return axios
      .get(
        `http://localhost:3000/courses/${
          context.params.course_id
        }/assignments/${context.params.assignment_id}`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          }
        }
      )
      .then(res => {
        console.log(res.data)
        return {
          permissions: res.data.permissions,
          assignment: res.data.assignment,
          files: []
        }
      })
      .catch(e => {
        console.log(e)
        return { assignment: {}, permissions: undefined, files: [] }
      })
  },
  methods: {
    delete_assignment() {
      axios
        .delete(
          `http://localhost:3000/courses/${
            this.$route.params.course_id
          }/assignments/${this.$route.params.assignment_id}`,
          {
            headers: {
              Authorization: this.$auth.user.sub
            }
          }
        )
        .then(res => {
          this.$router.push(`/courses/${this.$route.params.course_id}/`)
        })
        .catch(e => {
          console.log(e)
          this.$router.push(`/courses/${this.$route.params.course_id}/`)
        })
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
    submitAssignment() {
      const formData = new FormData()
      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i]
        formData.append('files[' + i + ']', file)
      }

      axios
        .post(
          `http://localhost:3000/courses/${
            this.$route.params.course_id
          }/assignments/${this.$route.params.assignment_id}/submissions`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: this.$auth.user.sub
            }
          }
        )
        .then(function() {
          this.$router.push(
            `/courses/${this.$route.params.course_id}/assignments/${
              this.$route.params.assignment_id
            }`
          )
        })
        .catch(function() {
          console.warn('Error submitting assignment')
        })
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
