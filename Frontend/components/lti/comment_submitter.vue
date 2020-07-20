<template>
  <div>
    <div id="top-bar">
      <p id="assignment-title">
        {{ title }}
      </p>
      <button id="submit-button" @click="handleSubmit">
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

import https from 'https'
import axios from 'axios'
import 'reflect-metadata' // Must import this before nuxt property decorators
import { Component, Prop, Emit, Vue } from 'nuxt-property-decorator'
import SubmitData from '~/model/submit-data'
import User from '~/model/user'

if (process.client) {
  // console.log('Loading my viewer helper')
  require('@/static/my_viewer_helper') // Only load RR viewer helper on client.
}

/* eslint-disable camelcase */

@Component
export default class CommentSubmitter extends Vue {
  @Prop({ required: true }) readonly title !: string
  @Prop({ required: true }) readonly user !: User
  @Prop({ required: true }) readonly submit_data !: SubmitData
  @Prop({ required: true }) readonly course_id !: string
  @Prop({ required: true }) readonly assignment_id !: string

  private showSubmitButton : boolean = false;

  mounted () {
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        console.log('Initialising RichReview on client side.')
        this.initRichReview()
      }
    })
  }

  public async handleSubmit () {
    if (!confirm('Are you sure you wish to submit this assignment?')) {
      return
    }
    await this.submit()
  }

  @Emit('submit-assignment')
  public submitSuccess () {
    console.log('Assignment successfully submit to RichReview!')
  }

  private async submit () {
    /* Submit to RichReview backend first */
    try {
      await this.$axios.$post(
          `https://${process.env.backend}:3000/courses/${
            this.course_id}/assignments/${
            this.assignment_id}/comment_submissions`,
          {
            access_code: this.submit_data.accessCode,
            docid: this.submit_data.docID,
            groupid: this.submit_data.groupID
          },
          {
            headers: {
              Authorization: this.user.id
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
      )
    }
    catch (rrException) {
      console.warn('Error while submitting to RichReview. Details: ' + rrException)
      alert('Error submitting assignment. If this continues, please contact the RichReview system administrator.')
      return
    }

    this.submitSuccess()
  }

  private initRichReview () {
    // Note updated changed backend so that it is possible to get the data
    // for the document based only on group id. It is simple to include the group id and
    // other data in the launch URL
    axios.get(
      `https://${process.env.backend}:3000/courses/${
        this.course_id
      }/groups/${this.submit_data.groupID}`,
      {
        headers: {
          Authorization: this.user.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    ).then((res) => {
      // eslint-disable-next-line camelcase
      const r2_ctx = res.data.r2_ctx
      r2_ctx.auth = { id: this.user.id, name: this.user.userName }
      // eslint-disable-next-line camelcase
      const cdn_endpoint = res.data.cdn_endpoint

      console.log(loadRichReview)

      loadRichReview(
        encodeURIComponent(JSON.stringify(r2_ctx)),
        res.data.env,
        cdn_endpoint,
        true
      )

      this.$forceUpdate()
    })
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
  padding: 0.1rem;
 }

#assignment-title {
  color: white;
  font-size: 1.5rem;
  margin-left: 1vw;
}

#submit-button {
  font-size: 1.4rem;
  text-align: center;
  margin: 0.1rem 2rem;
}

body {
  overflow: hidden;
}

#r2_app_page,
#r2_app_container {
  max-height: 93vh;
}
</style>
