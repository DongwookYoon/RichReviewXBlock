<template>
  <div id="richreview_viewer">
    <div v-if="mutedStudentView" class="template-description">
      <p>The instructor has not yet made feedback available for this assignment.</p>
    </div>

    <div v-else>
      <div
        v-if="(submit_data.submitted===true) || is_template"
      >
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

      <div v-else class="template-description">
        <p>This assignment has not yet been submitted.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import 'reflect-metadata' // Must import this before nuxt property decorators
import ApiHelper from '../../utils/api-helper'
import GradeData from '~/model/grade-data'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import User from '~/model/user'
import SubmitData from '~/model/submit-data'

// eslint-disable-next-line camelcase

if (process.client) {
  require('@/static/my_viewer_helper') // Only load RR viewer helper on client.
}
/* eslint-disable camelcase */
@Component
export default class RichReviewViewer extends Vue {
  @Prop({ required: true }) readonly submit_data !: SubmitData;
  @Prop({ required: true }) readonly grade_data !: GradeData;
  @Prop({ required: true }) readonly user_data !: User;
  @Prop({ required: true }) readonly course_id !: string;
  @Prop({ required: true }) readonly assignment_type !: string;
  @Prop({ required: true }) readonly assignment_id !: string;
  @Prop({ required: true }) readonly is_template !: boolean;
  @Prop({ required: false }) readonly is_muted !: boolean;

  private user !: User
  private rrInitialised : boolean = false

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
    const height = this.isGraderView ? '100vh' : '93vh'
    return {
      'max-height': height
    }
  }

  get mutedStudentView () {
    if ((this.user.isInstructor || this.user.isTa)) {
      return false
    }

    if (this.submit_data.submitted === true && this.is_muted === true) {
      return true
    }

    return false
  }

  get showGrade () : boolean {
    return (!(this.user.isInstructor || this.user.isTa) &&
              this.grade_data.isGraded &&
                this.grade_data.grade &&
                  !this.is_muted) as boolean
  }

  private initRichReview () {
    if (!loadRichReview) {
      console.warn('loadRichReview() is not loaded')
      return
    }
    console.log('Is muted? ' + this.is_muted)

    const instructorOrTa = this.user.isTa || this.user.isInstructor
    /* Do not show viewer for muted assignment for students */
    if (this.is_muted === true && !instructorOrTa) {
      return
    }

    ApiHelper.getViewerData(
      this.course_id,
      this.submit_data.groupID as string,
      this.user_data.id,
      this.$axios
    ).then((res) => {
      /* Only show RichReview UI if the assignment has been submitted OR
         if the user is an instructor and the assignment is a comment submission assignment.
         In the latter case, the instructor or TA will see the document template which they
         can modify, if desired. */
      if ((this.submit_data.submitted === true) ||
            (this.is_template && instructorOrTa)) {
        // eslint-disable-next-line camelcase
        const r2_ctx = res.r2_ctx
        r2_ctx.auth = { id: this.user.id, name: this.user.userName }
        r2_ctx.grade_data = this.grade_data
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
  font-size: 1.65rem;
  margin: 1rem 2rem;
}

</style>
