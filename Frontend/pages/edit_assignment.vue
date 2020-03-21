<template>
  <div id="edit-assignment">
    <dashboard-sidebar :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
    <course-sidebar :name="name" />
    <div id="content">
      <nav-bar
        :course="course"
        :assignment="edits.title"
        edit_assignment="true"
      />
      <div id="assignment-grid">
        <div id="title-div">
          <input
            id="title"
            v-model="edits.title"
            placeholder="Assignment Name"
            @change="changed"
          />
        </div>
        <div id="description-div">
          <textarea
            id="description"
            v-model="edits.description"
            placeholder="Description"
            @change="changed"
          ></textarea>
        </div>
        <div id="points-div">
          <label id="points-label">Points</label>
          <input
            id="points"
            v-model="edits.points"
            placeholder="0"
            @change="changed"
          />
        </div>
        <div id="weight-div">
          <label id="weight-label">Weight</label>
          <input
            id="weight"
            v-model="edits.weight"
            placeholder="0"
            @change="changed"
          />
          <label id="weight-label2">% of final grade</label>
        </div>
        <div id="count-towards-final-div">
          <input
            id="count-towards-final"
            v-model="edits.count_toward_final_grade"
            type="checkbox"
            @change="changed"
          />
          <label id="count-towards-final-label"
            >Count this assignment towards the final grade</label
          >
        </div>
        <div id="multiple-submissions-div">
          <input
            id="multiple-submissions"
            v-model="edits.allow_multiple_submissions"
            type="checkbox"
            @change="changed"
          />
          <label id="multiple-submissions-label"
            >Allow multiple submissions</label
          >
        </div>
        <div id="late-submissions-div">
          <input
            id="late-submissions"
            v-model="edits.allow_late_submissions"
            type="checkbox"
          />
          <label id="late-submissions-label">Allow late submissions</label>
        </div>
        <div id="group-assignment-div">
          <input
            id="group-assignment"
            v-model="edits.group_assignment"
            type="checkbox"
            @change="changed"
          />
          <label id="group-assignment-label">Group assignment</label>
        </div>
        <div id="hidden-div">
          <input
            id="hidden"
            v-model="edits.hidden"
            type="checkbox"
            @change="changed"
          />
          <label id="hidden-label">Hidden</label>
        </div>
        <div id="due-date-div">
          <label id="due-date-label">Due date</label>
          <datetime
            id="due-date"
            v-model="edits.due_date"
            type="datetime"
            use12-hour
            title="Due Date"
          ></datetime>
          <p
            v-if="edits.due_date !== ''"
            id="clear-due-date"
            @click="clear_due_date"
          >
            X
          </p>
        </div>
        <div id="available-date-div">
          <label id="available-date-label">Available from</label>
          <datetime
            id="available-date"
            v-model="edits.available_date"
            type="datetime"
            use12-hour
          ></datetime>
          <p
            v-if="edits.available_date !== ''"
            id="clear-available-date"
            @click="clear_available_date"
          >
            X
          </p>
        </div>
        <div id="until-date-div">
          <label id="until-date-label">Until</label>
          <datetime
            id="until-date"
            v-model="edits.until_date"
            type="datetime"
            use12-hour
          ></datetime>
          <p
            v-if="edits.until_date !== ''"
            id="clear-until-date"
            @click="clear_until_date"
          >
            X
          </p>
        </div>
        <hr id="button-hr" />
        <div id="button-div">
          <p id="cancel-button" @click="go_to_assignment">
            Cancel
          </p>
          <p id="save-button" @click="edit">Save</p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,nuxt/no-globals-in-created */
import https from 'https'
import { Datetime } from 'vue-datetime'
import 'vue-datetime/dist/vue-datetime.css'
import axios from 'axios'
import CourseSidebar from '../components/course_sidebar'
import Footer from '../components/footer'
import NavBar from '../components/nav_bar'
import DashboardSidebar from '../components/dashboard_sidebar'

export default {
  name: 'EditAssignment',
  components: {
    NavBar,
    Footer,
    CourseSidebar,
    datetime: Datetime,
    'dashboard-sidebar': DashboardSidebar
  },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/assignments/${context.params.assignment_id}/edit`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    const course_res = await axios
      .get(`https://${process.env.backend}:3000/courses`, {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
    return {
      course: res.data.course_title,
      edits: {
        title: res.data.title,
        description: res.data.description,
        points: res.data.points,
        weight: res.data.weight,
        display_grade_as: res.data.display_grade_as,
        count_toward_final_grade: res.data.count_toward_final_grade,
        allow_multiple_submissions: res.data.allow_multiple_submissions,
        allow_late_submissions: res.data.allow_late_submissions,
        group_assignment: res.data.group_assignment,
        hidden: res.data.hidden,
        due_date: context.app.is_date(res.data.due_date)
          ? new Date(res.data.due_date).toISOString()
          : '',
        available_date: context.app.is_date(res.data.available_date)
          ? new Date(res.data.available_date).toISOString()
          : '',
        until_date: context.app.is_date(res.data.until_date)
          ? new Date(res.data.until_date).toISOString()
          : ''
      },
      original_due_date: context.app.is_date(res.data.due_date)
        ? new Date(res.data.due_date).toISOString()
        : '',
      original_available_date: context.app.is_date(res.data.available_date)
        ? new Date(res.data.available_date).toISOString()
        : '',
      original_until_date: context.app.is_date(res.data.until_date)
        ? new Date(res.data.until_date).toISOString()
        : '',
      permissions: res.data.permissions,
      changesSaved: false,
      assignment_changed: false,
      name: res.data.user_name || '',
      enrolments: course_res.data.enrolments,
      taing: course_res.data.taing,
      instructing: course_res.data.teaching

    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  methods: {
    changed() {
      this.assignment_changed = true
    },
    clear_due_date() {
      this.edits.due_date = ''
    },
    clear_available_date() {
      this.edits.available_date = ''
    },
    clear_until_date() {
      this.edits.until_date = ''
    },
    go_to_assignment() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }`
      )
    },
    async edit() {
      this.changesSaved = true
      await axios.put(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.$route.params.assignment_id}`,
        { edits: this.edits },
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }`
      )
    }
  },
  beforeRouteLeave(to, from, next) {
    if (
      this.edits.due_date !== this.original_due_date ||
      this.edits.available_date !== this.original_available_date ||
      this.edits.until_date !== this.original_until_date
    )
      this.assignment_changed = true

    if (this.assignment_changed && !this.changesSaved) {
      if (confirm('Leave Page? Changes you made may not be saved.')) {
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
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

hr {
  margin: 0 0 1vh;
  color: lightgrey;
  border-color: lightgrey;
  background-color: lightgrey;
}

#edit-assignment {
  display: flex;
  min-height: 100vh;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
  width: 50vw;
}

#assignment-grid {
  display: block;
  font-size: 2vh;
  color: #0c2343;
}

#title {
  margin-bottom: 1vh;
  height: 3.75vh;
}

#title,
#description {
  width: 40vw;
  font-size: 1.75vh;
}

#description {
  height: 20vh;
  border: 1px solid lightgrey;
}

#points-div {
  margin-left: 10vw;
  margin-bottom: 1vh;
  margin-top: 1vh;
}

#count-towards-final,
#multiple-submissions,
#late-submissions,
#group-assignment,
#hidden {
  margin-left: 13.4vw;
}

#hidden {
  display: none;
}

#due-date-div,
#available-date-div,
#until-date-div {
  display: flex;
}

#due-date-div {
  margin-left: 8.7vw;
  margin-top: 1vh;
}

#available-date-div {
  margin-left: 6.2vw;
}

#until-date-div {
  margin-left: 10.7vw;
}

#due-date-div,
#available-date-div,
#until-date-div {
  margin-bottom: 1vh;
}

#due-date-label,
#available-date-label,
#until-date-label {
  margin-right: 0.5vw;
}

#clear-due-date,
#clear-available-date,
#clear-until-date {
  margin-left: 0.5vw;
  color: red;
  cursor: pointer;
}

#button-hr {
  margin-top: 2vh;
  margin-bottom: 2vh;
  width: 40vw;
}

#button-div {
  display: flex;
  margin-left: 30vw;
  margin-bottom: 50px;
}

#save-button,
#cancel-button {
  border-radius: 0.5vh;
  padding-left: 1vw;
  padding-right: 1vw;
  cursor: pointer;
}

#save-button {
  color: white;
  background-color: #0c2343;
}

#cancel-button {
  color: black;
  background-color: lightgrey;
}

#cancel-button {
  margin-right: 0.5vw;
}
</style>
