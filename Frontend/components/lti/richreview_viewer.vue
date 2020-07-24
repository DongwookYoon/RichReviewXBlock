<template>
  <div
    v-if="(submit_data.submitted===true) || is_template"
  >
    <!-- Instructor viewing document submission assignment NOT in grading view -->
    <div
      v-if="assignment_type === 'document_submission' && is_template === true "
      class="template-description"
    >
      <p>RichReview document submission assignment. Student submissions can be viewed in SpeedGrader.</p>
    </div>

    <!-- Show buttons to mute all instructor comments in grader and template views -->
    <div v-if="isGraderView || is_template" id="muted-div">

      <p v-if="muted === true" id="muted">
        Instructor comments for this assignment are muted.
      </p>
    </div>

    <div v-else-if="is_template===true" class="template-description">
      <p>
        RichReview annotation submission assignment. Edit the document template here to
        change what all students will see.
      </p>
    </div>

    <no-ssr>
      <body>
        <div class="content_body">
          <!--In template or student views, we want to avoid creating double scrollbars.
              Therefore, limit viewer height in those cases.-->
          <base href="/lti">
          <div id="r2_app_page" align="center" :style="viewerStyle">
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
import 'reflect-metadata' // Must import this before nuxt property decorators
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import User from '~/model/user'
import SubmitData from '~/model/submit-data'
import ApiHelper from '~/utils/api-helper'

// eslint-disable-next-line camelcase

if (process.client) {
  require('@/static/my_viewer_helper') // Only load RR viewer helper on client.
}
/* eslint-disable camelcase */
@Component
export default class RichReviewViewer extends Vue {
  @Prop({ required: true }) readonly submit_data !: SubmitData;
  @Prop({ required: true }) readonly user_data !: User;
  @Prop({ required: true }) readonly course_id !: string;
  @Prop({ required: true }) readonly assignment_type !: string;
  @Prop({ required: true }) readonly assignment_id !: string;
  @Prop({ required: true }) readonly is_template !: boolean;

  private user !: User
  private rrInitialised : boolean = false
  private muted: boolean = false

  created () {
    this.user = User.parse(this.user_data)
  }

  updated () {
    if (this.rrInitialised === false) {
      this.initRichReview()
    }
  }

  get isGraderView () {
    return (this.is_template === false && (this.user.isInstructor || this.user.isTa))
  }

  get viewerStyle () {
    const height = this.isGraderView ? '100vh' : '92.5vh'

    return {
      'max-height': height
    }
  }

  private initRichReview () {
    if (!loadRichReview) {
      console.warn('loadRichReview() is not loaded')
      return
    }

    ApiHelper.getViewerData(
      this.course_id,
      this.submit_data.groupID as string,
      this.user_data.id,
      this.$axios
    ).then(async (res) => {
      const instructorOrTa = this.user.isTa || this.user.isInstructor

      if (this.isGraderView || this.is_template) {
        this.muted = await ApiHelper.isMuted(
          this.course_id,
          this.assignment_id,
          this.user.id,
          this.submit_data.submissionID as string,
          this.$axios
        )
      }

      console.log('Is muted? ' + this.muted)
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

        this.rrInitialised = true

        this.$forceUpdate()
      }
    }).catch((reason) => {
      console.warn('Loading RichReview failed. Reason: ' + reason)
    })
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
