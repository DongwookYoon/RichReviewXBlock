<template>
  <div v-if="isCreated===true">
  <!--TODO determine what data needs to be passed to components, and load it in
      this page, instead of in the component, if possible -->

  <!--if user role is instructor or TA then   -->
      <GraderContainer v-if="userRole==='instructor' || userRole === 'ta'" :submitted="submitted" />

    <!--else if user role is student and NOT submitted then  -->
    <div v-if="userRole==='student'">

        <DocumentSubmission v-if="assignmentType==='document_submission'" :submitted="submitted" />

      <!--else if assignment_type is comment_submission then -->
        <CommentSubmission v-else-if="assignmentType==='comment_submission'" :submitted="submitted" />
    </div>
  -->
  </div>
</template>

<script lang="ts">
import * as https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import $axios from 'axios'
import { Route } from 'vue-router'
import { ltiAuth } from '~/store' // Pre-initialized store.


@Component
export default class Assignment extends Vue {
  private submitted: boolean = false;
  private isCreated: boolean = false;

  middleware = 'auth';

  // TODO Get assignment data and user data from Canvas (part of req) and from RichReview here, if possible
  asyncData (context: any) {
    if (process.server) {
      const req = context.req
      // Use req.body and req.query to get the required data
    }
  }

  created () : void {
    this.isCreated = true
  }

  /* Returns the user role in a friendly string, based on lti data */
  get userRole () : string {
    return 'instructor'      // TODO get role from LTI data
  }

  get assignmentType () : string {
    return 'document_submission'  // TODO get assignment type (document or comment submission) from RR
  }

}
</script>

<style>

</style>
