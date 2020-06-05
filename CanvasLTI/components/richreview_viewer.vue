<template>
  <div>
    <no-ssr>
      <body>
        <div class="content_body">
          <!--TODO Check that base is correct -->
          <base href="/lti">
          <div id="r2_app_page" align="'center">
            <div id="r2_app_container" align="left">
              <p v-if="submit_data.submitted===false" id="no-submission-text">
                This student has not submitted the assignment
              </p>
              <p v-else>
                Show the RichReview UI here for grading
              </p>
            </div>
          </div>
        </div>
      </body>
    </no-ssr>
  </div>
</template>

<script lang="ts">
import https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import { SubmitData } from '../pages/lti/assignment.vue'
// eslint-disable-next-line camelcase
import { lti_auth } from '~/store'

if (typeof window !== 'undefined') {
  require('../static/my_viewer_helper') // Only load RR viewer helper on client.
}

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
  @Prop({ type: Boolean, required: true }) readonly submitted !: boolean;
  @Prop({ type: SubmitData, required: true }) readonly submit_data !: SubmitData;
  @Prop({ type: String, required: true }) readonly userId !: string;
  @Prop({ type: String, required: true }) readonly course_id !: string


  mounted () {
    /* Only show RichReview UI if the assignment has been submitted */
    if (this.submitted === true) {
      /* Get data for assignment as an instructor or student*/
      this.$axios.$get(
        `https://${process.env.backend}:3000/courses/${
          this.course_id
        }/groups/${this.submit_data.groupID}`,
        {
          headers: {
            Authorization: lti_auth.authUser.userId
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      ).then(res => {
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
