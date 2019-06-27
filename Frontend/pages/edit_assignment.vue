<template>
  <div id="edit-assignment">
    <course-sidebar />
    <div id="content">
      <h1 v-if="permissions !== 'instructor' && permissions !== 'ta'">401</h1>
      <div
        v-if="permissions === 'ta' || permissions === 'instructor'"
        id="assignment-grid"
      >
        <div id="title-div">
          <input
            id="title"
            v-model="edits.title"
            placeholder="Assignment Name"
          />
        </div>
        <div id="description-div">
          <textarea
            id="description"
            v-model="edits.description"
            placeholder="Description"
          ></textarea>
        </div>
        <div id="points-div">
          <label id="points-label">Points</label>
          <input id="points" v-model="edits.points" placeholder="0" />
        </div>
        <!--<div>-->
        <!--<label>Display Grade as</label>-->
        <!--<select v-model="edits.display_grade_as">-->
        <!--<option disabled value="">Please select one</option>-->
        <!--<option>Points</option>-->
        <!--<option>Percentage</option>-->
        <!--<option>Complete/Incomplete</option>-->
        <!--<option>Letter Grade</option>-->
        <!--<option>Not Graded</option>-->
        <!--</select>-->
        <!--</div>-->
        <div id="count-towards-final-div">
          <input
            id="count-towards-final"
            v-model="edits.count_toward_final_grade"
            type="checkbox"
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
          />
          <label id="multiple-submissions-label"
            >Allow multiple submissions</label
          >
        </div>
        <div id="group-assignment-div">
          <input
            id="group-assignment"
            v-model="edits.group_assignment"
            type="checkbox"
          />
          <label id="group-assignment-label">Group assignment</label>
        </div>
        <div id="hidden-div">
          <input id="hidden" v-model="edits.hidden" type="checkbox" />
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
/* eslint-disable no-console */
import https from 'https'
import { Datetime } from 'vue-datetime'
import 'vue-datetime/dist/vue-datetime.css'
import axios from 'axios'
import CourseSidebar from '../components/course_sidebar'
import Footer from '../components/footer'

export default {
  name: 'EditAssignment',
  components: {
    Footer,
    CourseSidebar,
    datetime: Datetime
  },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/${context.params.course_id}/assignments/${
        context.params.assignment_id
      }/edit`,
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
      edits: {
        title: res.data.title,
        description: res.data.description,
        points: res.data.points,
        display_grade_as: res.data.display_grade_as,
        count_toward_final_grade: res.data.count_toward_final_grade,
        allow_multiple_submissions: res.data.allow_multiple_submissions,
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
      permissions: res.data.permissions
    }
  },
  methods: {
    go_to_assignment() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }`
      )
    },
    async edit() {
      await axios.put(
        `https://localhost:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.$route.params.assignment_id}`,
        { edits: this.edits },
        {
          headers: {
            Authorization: this.$auth.user.sub
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }`
      )
    }
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
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 7vh;
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
  height: 25vh;
  border: 1px solid lightgrey;
}

#points-div {
  margin-left: 10vw;
  margin-bottom: 1vh;
  margin-top: 1vh;
}

#count-towards-final,
#multiple-submissions,
#group-assignment,
#hidden {
  margin-left: 13.4vw;
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
