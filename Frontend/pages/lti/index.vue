<template>
  <div>
    <p>
      Redirecting
    </p>
  </div>
</template>
<script>

export default {
  asyncData ({ redirect }) {
    /* Redirect to RichReview landing page. Note this is outside of this Nuxt app, so $router.push is not used */
    if (process.browser) {
      redirect('/')
    }
  }
}
</script>
