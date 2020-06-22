<template>
  <div
    v-if="(submit_data.submitted===true) || is_template"
  >
    <div v-if="is_template">
      <p>
        RichReview comment submission assignment. Edit the document template here to
        change what all students will see. Student submissions can be viewed in SpeedGrader.
      </p>
    </div>

    <no-ssr>
      <body>
        <div class="content_body">
          <!--TODO Check that base is correct -->
          <base href="/lti">
          <div id="r2_app_page" align="'center">
            <div id="r2_app_container" align="left" />
          </div>
        </div>
      </body>
    </no-ssr>
  </div>
  <div v-else>
    <p>This assignment has not yet been submitted.</p>
  </div>
</template>

<script lang="ts">
import https from 'https'
import 'reflect-metadata' // Must import this before nuxt property decorators
import { SubmitData } from '~/pages/lti/AssignmentLti.vue'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import User from '~/model/user'

// eslint-disable-next-line camelcase

if (typeof window !== 'undefined') {
  require('@/static/my_viewer_helper') // Only load RR viewer helper on client.
}
/* eslint-disable camelcase */
@Component({
  head: {
    script: [
      {
        src:
          'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/js/bootstrap.min.js'
      },
      { src: '/my_viewer_helper.js', mode: 'client', body: true }
    ]
  }
})
export default class RichReviewViewer extends Vue {
  @Prop({ required: true }) readonly submit_data !: SubmitData;
  @Prop({ required: true }) readonly user_data !: User;
  @Prop({ required: true }) readonly course_id !: string;
  @Prop({ required: true }) readonly assignment_type !: string;
  @Prop({ required: true }) readonly is_template !: boolean;

  private user !: User

  created () {
    this.user = User.parse(this.user_data)
  }

  mounted () {
    this.getViewerData().then((res) => {
      console.log('Getting assignment data for instructor or student.')
      console.log('Course id: ' + this.course_id)
      console.log('Group ID: ' + this.submit_data.groupID)
      console.log('User id: ' + this.user.id)
      console.log(`Assignment response: ${res}`)
      for (const prop in res) {
        console.log(`${prop}: ${res[prop]}`)
      }

      const instructorOrTa = this.user.isTa || this.user.isInstructor

      /* Only show RichReview UI if the assignment has been submitted OR
         if the user is an instructor and the assignment is a comment submission assignment.
         In the latter case, the instructor or TA will see the document template which they
         can modify, if desired. */
      if ((this.submit_data.submitted === true) ||
            (this.is_template && instructorOrTa)) {
        // eslint-disable-next-line camelcase
        const r2_ctx = res.r2_ctx
        r2_ctx.auth = { id: this.user.id, name: this.user.userName }
        // eslint-disable-next-line camelcase
        const cdn_endpoint = res.cdn_endpoint

        loadRichReview(
          encodeURIComponent(JSON.stringify(r2_ctx)),
          res.env,
          cdn_endpoint,
          true
        )
      }
    }).catch((reason) => {
      console.warn('Loading RichReview failed. Reason: ' + reason)
    })
  }

  private getViewerData () : Promise<any> {
    console.log('hii')
    return this.$axios.$get(
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
    )
  }
}

</script>

<style scoped>
@import 'https://richreview2ca.azureedge.net/lib/bootstrap-3.2.0-dist/css/bootstrap.min.css';

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
  flex-flow: row wrap;

  justify-content: space-between;
  align-items: center;
  background-color: #0c2343;
  width: 100%;
  max-width: 100%;
  min-height: 5vh;
}

#assignment-title,
#prev-arrow,
#next-arrow,
#mark-input,
#slash,
#points {
  color: white;
  font-size: 1rem;
}

#assignment-title-div,
#points-div,
#student-div {
  display: flex;
}

#assignment-title-div {
  flex: 0.5 1 25%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

#points-div {
   flex: 1 1 15%;
   justify-content: center;
}

#hidden {
  min-height: 2vh;
  margin-right: 0.5vw;
}

#hidden-label {
  min-height: 2vh;
  font-size: 0.8rem;
  color: white;
  margin: 0.25rem 3vw auto 0;
  line-height: 0.75rem;

}

#student-div {
    flex: 1 1.25 25%;
    justify-content: flex-end;
    min-height: 3vh;
    margin: 0 1vw 0 10vw;
}

#mark-input {
  height: 1.2rem;
  width: 2rem;
  text-align: right;
  margin: auto 1vw auto 0;
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
  font-size: 0.9rem;
  cursor: pointer;
  max-height: 1.5rem;
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
