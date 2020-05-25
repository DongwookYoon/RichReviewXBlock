<template>
  <div>
    <div id="top-bar">
      <p id="assignment-title">
        {{ title }}
      </p>
      <button id="submit-button" @click="submit">
        Submit
      </button>
    </div>
    <no-ssr>
      <body>
        <div class="content_body">
          <base href="/lti">          <!-- TODO Check that base is correct -->
          <div id="r2_app_page" align="'center">
            <div id="r2_app_container" align="left" />
          </div>
        </div>
      </body>
    </no-ssr>
  </div>
</template>

<script lang="ts">

import * as https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import $axios from 'axios'
import { Route } from 'vue-router'
import { ltiAuth } from '~/store' // Pre-initialized store.

if (typeof window !== 'undefined') {
  require('../static/my_viewer_helper') // Only load RR viewer helper on client.
}

@Component
export default class CommentSubmitter extends Vue {
  @Prop({ type: Boolean, required: true }) readonly submitted !: Boolean;
  @Prop({ type: String, required: true }) readonly title !: string;
  @Prop({ type: String, required: true }) readonly userid !: string;

  private showSubmitButton : boolean = false;
  private assignmentId: string = '';

  head = {
    script: [
      {
        src:
          'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/js/bootstrap.min.js'
      },
      { src: '/my_viewer_helper.js', mode: 'client', body: true }
    ]
  }

  // TODO May need to change this to get assignment data from LTI instead.
  async asyncData (context: any) {
    if (!ltiAuth.authorized) {
      return
    }

    const res = await $axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
        }/assignments/${
        context.params.assignment_id
        }/comment_submissions/${context.query.groupid}`,
      {
        headers: {
          Authorization: this.userid
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    const assignment_data = res.data.assignment
    const submission_data = res.data.submission
    console.log(res.data)

    // this.assignmentId = assignment_data.id

  }

  async mounted () {
  // TODO update this to get get the required data based on lti launch request from Canvas
  // To simplify this, consider changing backend so that it is possible to get the data
  // for the document based only on group id. It is simple to include the group id and
  // other data in the launch URL
  /*
    const res = await $axios.get(
      `https://${process.env.backend}:3000/courses/${
        this.$route.params.course_id
      }/groups/${this.$route.query.groupid}`,
      {
        headers: {
          Authorization: this.userID
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
    */
  }

  public async submit () {
    if (!confirm('Are you sure you wish to submit?')) { return }

    /* TODO Update this to submit based on data in the lti launch request and url
    await $axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.assignmentId}/comment_submissions`,
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
    */
    alert('Assignment successfully submitted!')
  }
}

</script>

<style scoped>
@import 'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/css/bootstrap.min.css';

p {
  margin: 0;
}

#top-bar {
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-content: center;
  background-color: #0c2343;
 }

#assignment-title {
  color: white;
  font-size: 1.5rem;
  margin-left: 1vw;
}

#submit-button {
  font-size: 1rem;
  text-align: center;
  margin: 0.25rem 1rem;
}

body {
  overflow: hidden;
}

#r2_app_page,
#r2_app_container {
  max-height: 95vh;
}
</style>
