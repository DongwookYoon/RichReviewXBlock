<template>
  <div>
    <div id="top-bar">
      <p id="assignment-title" @click="go_to_assignment">
        {{ assignment_title }}
      </p>
      <button v-if="show_submit_button" id="submit-button" @click="submit">
        Submit
      </button>
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
  require('../static/my_viewer_helper')
}

export default {
  name: 'Submitter',
  head: {
    script: [
      {
        src:
          'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/js/bootstrap.min.js'
      },
      { src: '/my_viewer_helper.js', mode: 'client', body: true }
    ]
  },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
        }/assignments/${
        context.params.assignment_id
        }/comment_submissions/${context.query.groupid}`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    const assignment_data = res.data.assignment
    const submission_data = res.data.submission
    console.log(res.data)
    const show_submit_button =
      assignment_data.type === 'document_submission'
        ? false
        : assignment_data.allow_multiple_submissions
        ? true
        : submission_data.submission_time === ''

    return {
      show_submit_button: show_submit_button,
      assignment_id: assignment_data.id,
      assignment_title: assignment_data.title
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  mounted: async function() {
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
  },
  methods: {
    go_to_assignment() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${
          this.assignment_id
        }`
      )
    },
    async submit() {
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.assignment_id}/comment_submissions`,
        {
          access_code: this.$route.query.access_code,
          docid: this.$route.query.docid,
          groupid: this.$route.query.groupid
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
      this.$router.push(`/edu/courses/${this.$route.params.course_id}`)
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

p {
  margin: 0;
}

#top-bar {
  display: flex;
  background-color: #0c2343;
}

#assignment-title {
  color: white;
  font-size: 2.5vh;
  margin-left: 1vw;
}

#submit-button {
  position: fixed;
  right: 0;
  margin-right: 0.25vw;
  margin-top: 0.4vh;
}

body {
  overflow: hidden;
}

#r2_app_page,
#r2_app_container {
  max-height: 95vh;
}
</style>
