<!-- App launch page which redirects to the appropriate page based on request params -->
<template>
  <div>
    <p>
      RichReview
    </p>
  </div>
</template>

<script lang="ts">

const DEBUG: boolean = process.env.debug_mode !== undefined &&
  process.env.debug_mode.toLowerCase().trim() === 'true'

const REDIRECT_HOST: string = DEBUG ? 'https://localhost:8001' : `${process.env.prod_url}`

export default {
  asyncData (context: any) {
    /* Support a 307 redirect to submit view for grader or student submission review,
       which preserves request body. */
    if (context.query.submit_view &&
      context.query.submit_view.toString().toLowerCase() === 'true') {
      context.redirect(307, `${REDIRECT_HOST}/lti/assignments`, context.query)
    }

    /* For any other launch request, redirect to assignment creation */
    else {
      context.redirect(307, `${REDIRECT_HOST}/lti/create_assignment`, context.query)
    }
  }
}
</script>

<style>

</style>
