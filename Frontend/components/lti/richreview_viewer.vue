<template>
  <div
    v-if="(submit_data.submitted===true) || is_template"
  >
    <div v-if="is_template" class="template-description">
      <p>
        RichReview comment submission assignment. Edit the document template here to
        change what all students will see. Student submissions can be viewed in SpeedGrader.
      </p>
    </div>

    <no-ssr>
      <body>
        <div class="content_body">
          <!--In template or student views, we want to avoid creating double scrollbars.
              Therefore, limit viewer height in those cases.-->
          <base href="/lti">
          <div id="r2_app_page" align="'center" :style="viewerStyle">
            <div id="r2_app_container" align="left" :style="viewerStyle" />
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
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import User from '~/model/user'
import SubmitData from '~/model/submit-data'

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

  get isGraderView () {
    return !(this.is_template === true || this.user.isStudent === true)
  }

  get viewerStyle () {
    const height = this.isGraderView ? '100vh' : '94vh'

    return {
      height
    }
  }

  private getViewerData () : Promise<any> {
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

body {
  overflow: hidden;
}

p {
  margin: 0;
}

.template-description p{
  font-size: 1.4rem;
  margin: 1rem 2rem;
}

</style>
