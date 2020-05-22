<template>
<div v-if="isCreated===true">
  <!--
    if user role is instructor or TA then
      <GraderContainer :submitted = "submitted" />

    else if user role is student and NOT submitted then
      if assignment_type is document submission then
        <DocumentSubmission :submitted = "submitted" />

      else if assignment_type is comment_submission then
        <CommentSubmission :submitted = "submitted" />
  -->
</div>
</template>

<script lang="ts">
import * as https from 'https';
import { Component, Prop, Vue } from 'nuxt-property-decorator';
import $axios from 'axios';
import { Route } from 'vue-router';
import {ltiAuth} from '~/store';        //Pre-initialized store.

@Component
export default class Assignment extends Vue {


  private submitted: boolean = false;
  private isCreated: boolean = false;

  //middleware: TODO Authentication middleware


  created() : void {
    this.isCreated = true;
  }


}
</script>


<style>

</style>
