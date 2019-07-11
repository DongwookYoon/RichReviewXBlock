<template>
  <div>
    <div id="top-bar">
      <p id="assignment-title" @click="go_to_assignment">
        {{ assignment_title }}
      </p>
      <input
        id="mark-input"
        :placeholder="[[mark !== '' ? mark : '']]"
        type="text"
        @change="updateGrade($event)"
      />
      <p id="slash">/</p>
      <p id="points">{{ points }}</p>
      <p v-if="prev_link !== ''" id="prev-arrow" @click="prev_student">
        Previous
      </p>
      <select id="student-select" v-model="selected" @change="change_student">
        <option v-for="s of submissions_list" :key="s.key" :value="s.key">
          {{ s.name }}
        </option>
      </select>
      <p v-if="next_link !== ''" id="next-arrow" @click="next_student">Next</p>
    </div>
    <no-ssr>
      <body>
        <div class="content_body">
          <base href="/" />
          <div id="r2_app_page" align="'center">
            <div id="r2_app_container" align="left"></div>
          </div>
        </div>
      </body>
    </no-ssr>
  </div>
</template>

<script>
/* eslint-disable camelcase,no-undef,no-console */
import https from 'https'
import axios from 'axios'
if (process.client) {
  require('../static/viewer_helper')
}

export default {
  name: 'Grader',
  head: {
    link: [{ rel: 'stylesheet', src: '/static_viewer/stylesheets/style.css' }],
    script: [
      {
        src:
          'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/js/bootstrap.min.js'
      },
      // {
      //   src:
      //     'https://richreview2ca.azureedge.net/richreview/stylesheets/style.css'
      // },
      { src: '/viewer_helper.js', mode: 'client', body: true }
    ]
  },
  async asyncData(context) {
    const assignment_res = await axios.get(
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

    const submissions_res = await axios.get(
      `https://localhost:3000/courses/${context.params.course_id}/assignments/${
        context.params.assignment_id
      }/grader`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const grader_res = await axios.get(
      `https://localhost:3000/courses/${context.params.course_id}/assignments/${
        context.params.assignment_id
      }/grader/${context.params.submission_id}`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    console.log(grader_res.data)
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
      selected: selected
    }
  },
  mounted: async function() {
    const res = await axios.get(
      `https://localhost:3000/courses/${this.$route.params.course_id}/groups/${
        this.$route.query.groupid
      }`,
      {
        headers: {
          Authorization: this.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    const r2_ctx = res.data.r2_ctx
    r2_ctx.auth = this.$auth.user
    const cdn_endpoint = res.data.cdn_endpoint

    loadRichReview(
      encodeURIComponent(JSON.stringify(r2_ctx)),
      'development',
      cdn_endpoint
    )
  },
  methods: {
    go_to_assignment() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }`
      )
    },
    prev_student() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/submissions/${this.prev_id}/grader?${this.prev_link}`
      )
    },
    next_student() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/submissions/${this.next_id}/grader?${this.next_link}`
      )
    },
    change_student() {
      for (const submission of this.submissions_list) {
        if (submission.key === this.selected)
          this.$router.push(
            `/courses/${this.$route.params.course_id}/assignments/${
              this.$route.params.assignment_id
            }/submissions/${submission.id}/grader?${submission.link}`
          )
      }
    },
    async updateGrade(event) {
      const mark = event.target.value

      await axios.put(
        `https://localhost:3000/courses/${
          this.$route.params.course_id
        }/grades/${this.$route.params.assignment_id}`,
        {
          student_key: this.student_key,
          mark: mark
        },
        {
          headers: {
            Authorization: this.$auth.user.sub
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
/*@import '../static/static_viewer/stylesheets/style.css';*/

p {
  margin: 0;
}

#top-bar {
  display: flex;
  background-color: #0c2343;
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

#assignment-title {
  margin-left: 1vw;
  width: 40vw;
}

#mark-input {
  height: 90%;
  width: 5vw;
  margin-top: 0.75vh;
  text-align: right;
  margin-right: 1vw;
  color: #0c2343;
}

#slash {
  margin-right: 1vw;
}

#points {
  width: 33vw;
}

#prev-arrow,
#student-select {
  margin-right: 2vw;
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
</style>
<!--app page-->
<!--app container-->
<!--view-->
