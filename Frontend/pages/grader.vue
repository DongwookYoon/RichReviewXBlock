<template>
  <div>
    <div id="top-bar">
      <div id="assignment-title-div">
        <p id="assignment-title" @click="go_to_assignment">
          {{ assignment_title }}
        </p>
      </div>
      <div id="muted-div">
        <p id="muted" v-if="this.muted === true">Submission is Muted</p>
      </div>
      <div id="points-div">
        <input
          id="mark-input"
          :placeholder="[[mark !== '' ? mark : '']]"
          type="text"
          @change="updateGrade($event)"
        />
        <p id="slash">/</p>
        <p id="points">{{ points }}</p>
      </div>
      <div v-if="new Date(due_date) < new Date(submission_data.submission_time)" class="due-div">
        <p>
          This assignment is past due. 
          <br>
          It is {{daysSince}} day(s) late.
        </p>
      </div>
      <div id="student-div">
        <!--<div id="hidden-div">-->
          <input id="hidden" v-model="hidden" type="checkbox" @change="change_hide_names" />
          <p id="hidden-label">Hide student names</p>
        <!--</div>-->
        <p v-if="prev_id !== ''" id="prev-arrow" @click="prev_student">
          Previous
        </p>
        <select id="student-select" v-model="selected" @change="change_student">
          <option v-for="(s, i) of submissions_list" :key="s.key" :value="s.key">
            ({{ s.mark === '' ? 'Unmarked' : `Marked: ${s.mark}`}}) {{ hidden ? `Student ${i + 1}` : s.name }}
          </option>
        </select>
        <p v-if="next_id !== ''" id="next-arrow" @click="next_student">Next</p>
      </div>
    </div>
    <no-ssr>
      <body>
        <div class="content_body">
          <base href="/" />
          <div id="r2_app_page" align="'center">
            <div id="r2_app_container" align="left">
              <p v-if="no_submission" id="no-submission-text">
                This student has not submitted the assignment
              </p>
            </div>
          </div>
        </div>
      </body>
    </no-ssr>
  </div>
</template>

<script>
/* eslint-disable camelcase,no-undef,no-console,no-unused-vars */
import https from 'https'
import axios from 'axios'
if (process.client) {
  require('../static/my_viewer_helper')
}

export default {
  name: 'Grader',
  head: {
    script: [
      {
        src:
          'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/js/bootstrap.min.js'
      },
      { src: '/my_viewer_helper.js', mode: 'client', body: true }
    ]
  },
  computed: {
    daysSince(){
      const date1 = new Date(this.due_date) 
      const date2 = new Date(this.submission_data.submission_time)
      const Difference_In_Time = date2.getTime() - date1.getTime() 
      return Math.floor(Difference_In_Time / (1000 * 3600 * 24))
    }
  },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const permissions_res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
        }/users/permissions`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const permissions = permissions_res.data.permissions

    if (permissions !== 'instructor' && permissions !== 'ta') {
      if (Object.keys(context.query).length === 0)
        return context.res.redirect(`/edu/courses/${context.params.course_id}/assignments/${
          context.params.assignment_id}`)
      else
        return context.res.redirect(`/edu/courses/${context.params.course_id}/assignments/${
          context.params.assignment_id}/viewer?access_code=${context.query.access_code}&
          docid=${context.query.docid}&groupid=${context.query.groupid}`)
    }

    const assignment_res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/assignments/${context.params.assignment_id}`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const submissions_res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/assignments/${context.params.assignment_id}/grader`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const grader_res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/assignments/${context.params.assignment_id}/grader/${
        context.params.submission_id
      }`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const assignment_data = assignment_res.data.assignment
    const submissions_list = submissions_res.data.submission_links_and_id
    const selected = grader_res.data.student_key

    return {
      assignment_title: assignment_data.title,
      points: assignment_data.points,
      prev_link: grader_res.data.previous_submission_link_and_id.link,
      prev_id: grader_res.data.previous_submission_link_and_id.id,
      name: grader_res.data.name,
      student_key: grader_res.data.student_key,
      next_link: grader_res.data.next_submission_link_and_id.link,
      next_id: grader_res.data.next_submission_link_and_id.id,
      mark: grader_res.data.submission_data.mark,
      submissions_list: submissions_list,
      selected: selected,
      no_submission: false,
      muted: grader_res.muted,
      due_date: assignment_data.due_date,
      submission_data: grader_res.data.submission_data
    }
  },
  data() {
    return {
      hidden: this.$route.query.hidden !== undefined
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  mounted: async function() {
    if (
      !this.$route.query.access_code &&
      !this.$route.query.docid &&
      !this.$route.query.groupid
    ) {
      this.no_submission = true
    } else {
      const res = await axios.get(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/groups/${this.$route.query.groupid}`,
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      const r2_ctx = res.data.r2_ctx
      r2_ctx.auth = this.$store.state.authUser
      const cdn_endpoint = res.data.cdn_endpoint

      loadRichReview(
        encodeURIComponent(JSON.stringify(r2_ctx)),
        res.data.env,
        cdn_endpoint,
        true
      )
    }
  },
  methods: {
    go_to_assignment() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }`
      )
    },
    prev_student() {
      window.open(`/edu/courses/${this.$route.params.course_id}/assignments/${
        this.$route.params.assignment_id
        }/submissions/${this.prev_id}/grader?${this.prev_link}&${this.hidden ? 'hidden=' : ''}`,
        '_self')
    },
    next_student() {
      window.open(`/edu/courses/${this.$route.params.course_id}/assignments/${
        this.$route.params.assignment_id
        }/submissions/${this.next_id}/grader?${this.next_link}&${this.hidden ? 'hidden=' : ''}`,
        '_self')
    },
    change_student() {
      for (const submission of this.submissions_list) {
        if (submission.key === this.selected)
          window.open(`/edu/courses/${this.$route.params.course_id}/assignments/${
            this.$route.params.assignment_id
            }/submissions/${submission.id}/grader?${submission.link}&${this.hidden ? 'hidden=' : ''}`
            , '_self')
      }
    },
    change_hide_names() {
      let new_path = this.$route.fullPath
      if (this.hidden) {
        if (!this.$route.fullPath.includes('grader?'))
          new_path += '?'
        new_path += '&hidden='
      } else {
        new_path = new_path.replace('hidden=', '')
      }
      window.open(new_path, '_self')
    },
    async updateGrade(event) {
      const mark = event.target.value
      if (mark > this.points * 1.2) {
        alert(`Mark is ${100 * (mark / this.points)}% of the max mark!`)
      }
      for (let submission of this.submissions_list) {
        if (submission.key === this.student_key) {
          submission.mark = mark
          break
        }
      }

      await axios.put(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/grades/${this.$route.params.assignment_id}`,
        {
          student_key: this.student_key,
          mark: mark
        },
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
    }
  }
}
</script>

<style scoped>
@import 'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/css/bootstrap.min.css';
/*@import 'https://richreview2ca.azureedge.net/lib/font-awesome-4.6.3/css/font-awesome.min.css';*/
/*@import 'https://richreview2ca.azureedge.net/lib/font-awesome-animation.min.css';*/
/*@import 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.0/themes/smoothness/jquery-ui.css';*/
/*@import 'https://richreview2ca.azureedge.net/richreview/stylesheets/style.css';*/
/*@import '../static/nuxt_static_viewer/stylesheets/style.css';*/

.due-div {
    display: flex;
    position: absolute;
    color: white;
    height: 4em;
    font-size: 2vh;
    width: 20%;
    left: 12%;
    line-height: 1em;
    margin-top: 0.2%;
}

p {
  margin: 0;
}

#top-bar {
  display: flex;
  background-color: #0c2343;
  width: 100%;
  height: 5vh;
}

#assignment-title,
#prev-arrow,
#next-arrow,
#mark-input,
#slash,
#points {
  color: white;
  font-size: 2.5vh;
}

#assignment-title-div,
#points-div,
#student-div {
  display: flex;
}

#assignment-title-div {
  min-width: 100px;
  width: 20%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

#points-div {
  margin-left: 15%;
}

#hidden {
  width: 1.2vw;
  height: 1.2vw;
  margin-top: 1.5vh;
  margin-right: 0.5vw;
}

#hidden-label {
  font-size: 2vh;
  margin-top: 1vh;
  color: white;
  margin-right: 4vw;
}

#student-div {
  position: absolute;
  left: 99%;
  margin-right: -99%;
  transform: translate(-99%, 0);
}

#mark-input {
  height: 68%;
  width: 5vw;
  margin-top: 0.6vh;
  text-align: right;
  margin-right: 1vw;
  color: #0c2343;
}

#slash {
  margin-right: 1vw;
}

#prev-arrow,
#student-select {
  margin-right: 2vw;
}

#prev-arrow,
#next-arrow {
  cursor: pointer;
}

#student-select {
  color: #0c2343;
  font-size: 2vh;
  height: 95%;
  margin-top: 0.75vh;
  cursor: pointer;
}

body {
  overflow: hidden;
}

#r2_app_page,
#r2_app_container {
  max-height: 95vh;
}

#no-submission-text {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-right: -50%;
  transform: translate(-50%, -50%);
  font-size: 2vh;
}
</style>
