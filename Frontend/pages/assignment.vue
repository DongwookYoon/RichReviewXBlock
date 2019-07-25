<template>
  <div id="assignment">
    <course-sidebar />
    <b-alert v-model="showDismissibleAlert" variant="danger" dismissible>
      One or more files is required for a submission.
    </b-alert>
    <div id="content">
      <nav-bar :course="course" :assignment="assignment.title" />
      <div id="assignment-header">
        <p id="assignment-title">{{ assignment.title }}</p>
        <div
          v-if="permissions === 'instructor' || permissions === 'ta'"
          class="assignment-controls"
        >
          <button id="edit-button" @click="go_to_edit_assignment">Edit</button>
          <button id="submissions-button" @click="got_to_submissions">
            Submissions
          </button>
          <button
            v-if="grader_link !== ''"
            id="grader-button"
            @click="go_to_grader"
          >
            Grader
          </button>
          <button id="delete-button" @click="delete_assignment">Delete</button>
        </div>
        <div v-if="permissions === 'student'" class="assignment-controls">
          <button
            v-if="submission_status !== 'Not Submitted'"
            id="view-submission-button"
            @click="go_to_current_submission"
          >
            View Submission
          </button>
          <button
            v-if="show_start_assignment"
            id="start-assignment-button"
            @click="go_to_submitter"
          >
            Start Assignment
          </button>
        </div>
      </div>
      <hr />
      <div id="assignment-details">
        <div class="assignment-details-row">
          <div id="due-date-div">
            <p id="due-header">Due</p>
            <p id="due-date">
              {{
                assignment.due_date === ' '
                  ? ''
                  : format_date(assignment.due_date)
              }}
            </p>
          </div>
          <div id="points-div">
            <p id="points-header">Points</p>
            <p id="points">{{ assignment.points }}</p>
          </div>
        </div>
        <div class="assignment-details-row">
          <div id="available-div">
            <p id="available-header">Available</p>
            <p id="available-date">
              {{
                assignment.available_date === ''
                  ? ' '
                  : format_date(assignment.available_date)
              }}
            </p>
            <p
              v-if="
                assignment.available_date !== '' || assignment.until_date !== ''
              "
              id="available-divider"
            >
              -
            </p>
            <p id="until-date">
              {{
                assignment.until_date === ''
                  ? ' '
                  : format_date(assignment.until_date)
              }}
            </p>
          </div>
        </div>
        <div class="assignment-details-row">
          <div id="group-assignment-div">
            <p id="group-assignment-header">Group Assignment</p>
            <p id="group-assignment">
              {{ assignment.group_assignment === true ? 'Yes' : 'No' }}
            </p>
          </div>
          <div id="multiple-submissions-div">
            <p id="multiple-submissions-header">Multiple Submissions Allowed</p>
            <p id="multiple-submissions">
              {{
                assignment.allow_multiple_submissions === true ? 'Yes' : 'No'
              }}
            </p>
          </div>
        </div>
      </div>
      <hr />
      <p id="assignment-description">{{ assignment.description }}</p>
      <div
        v-if="
          viewer_link !== '' &&
            assignment.type === 'comment_submission' &&
            permissions === 'student'
        "
      ></div>
      <div
        v-if="
          viewer_link !== '' &&
            assignment.type === 'document_submission' &&
            permissions === 'student'
        "
      ></div>
      <div v-if="show_files">
        <div id="files-div">
          <div class="large-12 medium-12 small-12 cell">
            <label id="files-label">Files </label>
            <input
              id="files"
              ref="files"
              type="file"
              multiple
              @change="handleFileUpload()"
            />
          </div>
          <div class="large-12 medium-12 small-12 cell">
            <div v-for="(file, key) in files" :key="key" class="file-listing">
              <p class="file">{{ file.name }}</p>
              <p class="remove-file" @click="removeFile(key)">Remove</p>
            </div>
          </div>
          <br />
          <div class="large-12 medium-12 small-12 cell">
            <p id="add-files-button" @click="addFiles()">Add Files</p>
          </div>
          <br />
        </div>
        <div class="large-12 medium-12 small-12 cell">
          <p
            v-if="files.length > 0"
            id="submit-button"
            @click="submitAssignment()"
          >
            Submit
          </p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase */

import https from 'https'
import axios from 'axios'
import Footer from '../components/footer'
import CourseSidebar from '../components/course_sidebar'
import NavBar from '../components/nav_bar'

export default {
  name: 'Assignment',
  components: { NavBar, CourseSidebar, Footer },
  data: function() {
    return {
      showDismissibleAlert: false
    }
  },
  computed: {
    show_files: function() {
      return (
        this.assignment.type === 'document_submission' &&
        this.permissions === 'student' &&
        (this.submission_status === 'Not Submitted' ||
          this.assignment.allow_multiple_submissions) &&
        (Date.now() < new Date(this.assignment.due_date) ||
          this.assignment.allow_late_submissions)
      )
    },
    show_start_assignment: function() {
      return (
        this.assignment.type === 'comment_submission' &&
        this.permissions === 'student' &&
        (this.submission_status === 'Not Submitted' ||
          this.assignment.allow_multiple_submissions) &&
        (Date.now() < new Date(this.assignment.due_date) ||
          this.assignment.allow_late_submissions)
      )
    }
  },
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

    console.log(res.data)

    return {
      permissions: res.data.permissions,
      assignment: res.data.assignment,
      viewer_link: res.data.link,
      files: [],
      grader_link: res.data.grader_link,
      grader_submission_id: res.data.grader_submission_id,
      course: res.data.course_title,
      submission_status: res.data.submission_status
    }
  },
  methods: {
    go_to_edit_assignment() {
      this.$router.push(
        `/education/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/edit`
      )
    },
    got_to_submissions() {
      this.$router.push(
        `/education/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/submissions`
      )
    },
    go_to_grader() {
      window.open(
        `/education/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/submissions/${this.grader_submission_id}/grader?${this.grader_link}`
      )
    },
    go_to_submitter() {
      window.open(
        `/education/courses/${this.$route.params.course_id}/submitter?${
          this.viewer_link
        }`
      )
    },
    go_to_current_submission() {
      window.open(
        `/education/courses/${this.$route.params.course_id}/viewer?${
          this.viewer_link
        }`
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
      this.$router.push(`/education/courses/${this.$route.params.course_id}/`)
    },
    async submitAssignment() {
      if (this.files.length === 0) {
        this.showDismissibleAlert = true
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

      this.$router.push(`/education/courses/${this.$route.params.course_id}`)
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

input[type='file'] {
  position: absolute;
  top: -500px;
}

hr {
  width: 60vw;
}

#assignment {
  display: flex;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
}

#assignment-header,
.assignment-controls {
  display: flex;
}

.assignment-controls {
  margin-top: 0.65vh;
  right: 0;
  position: absolute;
  margin-right: 22vw;
}

#edit-button,
#submissions-button,
#grader-button,
#delete-button,
#view-submission-button,
#start-assignment-button {
  font-size: 2vh;
  background-color: #0c2343;
  border-radius: 0.5vh;
  color: white;
  padding-right: 0.5vw;
  padding-left: 0.5vw;
  margin-bottom: 0;
  height: 4.25vh;
}

#submissions-button,
#grader-button,
#delete-button,
#view-submission-button,
#start-assignment-button {
  margin-left: 0.5vw;
}

#assignment-title {
  font-size: 3vh;
  color: #0c2343;
  margin-bottom: 0;
}

.assignment-details-row {
  display: flex;
}

#due-date-div,
#points-div,
#available-div,
#group-assignment-div,
#multiple-submissions-div {
  display: flex;
  color: #0c2343;
}

#due-header,
#points-header,
#available-header,
#group-assignment-header,
#multiple-submissions-header {
  font-weight: bold;
  margin-right: 0.5vw;
  font-size: 2vh;
}

#due-date,
#group-assignment {
  margin-right: 2vw;
}

#due-date,
#points,
#available-date,
#available-divider,
#group-assignment,
#multiple-submissions {
  font-size: 2vh;
}

#available-divider {
  margin-left: 0.5vw;
  margin-right: 0.5vw;
}

#group-assignment-header,
#group-assignment,
#multiple-submissions-header,
#multiple-submissions {
  margin-bottom: 0;
}

#assignment-description {
  color: #0c2343;
}

#files-div {
  margin-top: 7vh;
}

#files-label {
  font-size: 2vh;
}

.file-listing {
  display: flex;
}

.file {
  width: 10vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 1vw 0 0;
}

.remove-file {
  color: red;
  cursor: pointer;
}

#add-files-button {
  color: white;
  background-color: #0c2343;
  border-radius: 0.5vh;
  width: 5vw;
  text-align: center;
  cursor: pointer;
}

#submit-button {
  border-radius: 0.5vh;
  cursor: pointer;
  color: white;
  background-color: #0c2343;
  width: 5vw;
  font-size: 2.5vh;
  text-align: center;
}
</style>
