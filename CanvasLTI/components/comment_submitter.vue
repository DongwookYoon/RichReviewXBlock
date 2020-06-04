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
import { Route } from 'vue-router'
import { SubmitData } from '../pages/lti/assignment.vue'
import { lti_auth } from '~/store' // Pre-initialized store.

if (typeof window !== 'undefined') {
  require('../static/my_viewer_helper') // Only load RR viewer helper on client.
}

@Component
export default class CommentSubmitter extends Vue {
  @Prop({ type: Boolean, required: true }) readonly submitted !: Boolean
  @Prop({ type: String, required: true }) readonly title !: string
  @Prop({ type: String, required: true }) readonly user_id !: string
  @Prop({ type: SubmitData, required: true }) readonly submit_data !: SubmitData
  @Prop({ type: String, required: true }) readonly course_id !: string

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

  mounted () {
    // Note updated changed backend so that it is possible to get the data
    // for the document based only on group id. It is simple to include the group id and
    // other data in the launch URL
    this.$axios.$get(
      `https://${process.env.backend}:3000/courses/${
        this.course_id
      }/groups/${this.submit_data.groupID}`,
      {
        headers: {
          Authorization: this.$store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    ).then((res)=> {
      // eslint-disable-next-line camelcase
      const r2_ctx = res.data.r2_ctx
      r2_ctx.auth = lti_auth.authUser
      // eslint-disable-next-line camelcase
      const cdn_endpoint = res.data.cdn_endpoint

      loadRichReview(
        encodeURIComponent(JSON.stringify(r2_ctx)),
        res.data.env,
        cdn_endpoint,
        true
      )
    })
  }

  public async submit () {
    if (!confirm('Are you sure you wish to submit this assignment?')) { return }

    /* Submit to RichReview backend first */
    try {
      await this.$axios.$post(
          `https://${process.env.backend}:3000/assignments/${this.assignmentId}/comment_submissions`,
          {
            access_code: this.submit_data.accessCode,
            docid: this.submit_data.docID,
            groupid: this.submit_data.groupID
          },
          {
            headers: {
              Authorization: this.user_id
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
      )
    } catch (rrException) {
      console.warn('Error while submitting to RichReview. Details: ' + rrException)
      alert('Error submitting assignment. If this continues, please contact the RichReview system administrator.')
      return
    }

    this.$emit('submit-assignment') // Let parent handle submit to LTI Consumer
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
