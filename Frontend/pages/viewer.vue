<template>
  <div>
    <button v-if="show_submit_button" @click="submit">Submit</button>
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
  name: 'Viewer',
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/${
        context.params.course_id
      }/assignments/comment_submissions/${context.query.groupid}`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    const assignment_data = res.data.assignment
    const submission_data = res.data.submission

    const show_submit_button = assignment_data.allow_multiple_submissions
      ? true
      : submission_data.submission_time === ''

    return {
      show_submit_button: show_submit_button,
      assignment_id: assignment_data.id
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
    async submit() {
      await axios.post(
        `https://localhost:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.assignment_id}/comment_submissions`,
        {
          access_code: this.$route.query.access_code,
          docid: this.$route.query.docid,
          groupid: this.$route.query.groupid
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
      this.$router.push(`/courses/${this.$route.params.course_id}`)
    }
  }
}
</script>

<style scoped>
@import 'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/css/bootstrap.min.css';
@import 'https://richreview2ca.azureedge.net/lib/font-awesome-4.6.3/css/font-awesome.min.css';
@import 'https://richreview2ca.azureedge.net/lib/font-awesome-animation.min.css';
@import 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.0/themes/smoothness/jquery-ui.css';
@import 'https://richreview2ca.azureedge.net/richreview/stylesheets/style.css';
body {
  overflow: hidden;
}
.r2_app_page {
  align-self: center;
}
.r2_app_container {
  align-self: left;
}
</style>
