<template>
  <div v-if="isCreated===true">
    <!--TODO determine what data needs to be passed to components, and load it in
      this page, instead of in the component, if possible -->
    <p>assignment.vue test </p>
    <p>component is {{ checkDisplayComponent }} </p>

    <!--if user role is instructor or TA then show grading view  -->
    <GraderContainer v-if="userRole==='instructor' || userRole === 'ta'" :submitted="submitted" />

    <!--else if user role is learner and NOT submitted then  -->
    <div v-if="userRole==='learner'" class="submit-area">
      <DocumentSubmitter v-if="assignmentType==='document_submission'" :submitted="submitted" />

      <!--else if assignment_type is comment_submission then -->
      <CommentSubmitter
        v-else-if="assignmentType==='comment_submission'"
        :submitted="submitted"
        :title="assignmentTitle"
        :userid="userID"
      />
    </div>
  </div>
</template>

<script lang="ts">
import * as https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import $axios from 'axios'
import { Route } from 'vue-router'
import DocumentSubmitter from '../../components/document_submitter.vue'
import CommentSubmitter from '../../components/comment_submitter.vue'
import GraderContainer from '../../components/grader_container.vue'
import { ltiAuth } from '~/store' // Pre-initialized store.

const testData = {
  submitted: true,
  assignmentType: 'comment_submission',
  userRole: 'instructor',
  assignmentTitle: 'Test Assignment',
  userID: 'aeaf282'
}

@Component({
  components: {
    DocumentSubmitter,
    CommentSubmitter,
    GraderContainer
  }
})
export default class Assignment extends Vue {
  private submitted: boolean = false
  private isCreated: boolean = false
  private assignmentType: string = ''
  private assignmentTitle: string = ''
  private userRole: string = ''
  private userID: string = ''

  // TODO Get assignment data and user data from Canvas (part of req) and from RichReview here, if possible
  asyncData (context: any) {
    if (process.server) {
      const req = context.req
      // Use req.body and req.query to get the required data from ltideeplinkingrequest
    }
  }

  created () : void {
    this.isCreated = true

    this.injectTest() // Inject dummy data
  }

  /**
   *  Only for testing purposes.
   *  Returns the name of component that will be used to display assignment.
   */
  public get checkDisplayComponent () {
    if (this.userRole === 'instructor' || this.userRole === 'ta') {
      return 'GraderContainer'
    } else if (this.assignmentType === 'document_submission') {
      return 'DocumentSubmitter'
    } else if (this.assignmentType === 'comment_submission') {
      return 'CommentSubmitter'
    }

    return 'Error. No assignment component.'
  }

  private injectTest () {
    this.submitted = testData.submitted
    this.assignmentType = testData.assignmentType
    this.userRole = testData.userRole
    this.userID = testData.userID
    this.assignmentTitle = testData.assignmentTitle
  }
}
</script>

<style scoped>
  @import url('@/static/nuxt_static_viewer/stylesheets/lti_style.css');

  .submit-area {
    margin: 1.5rem 2%;
  }

</style>
