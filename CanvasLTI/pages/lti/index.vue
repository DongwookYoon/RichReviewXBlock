<template>

</template>

<script>
export default {
  beforeCreate() {
    /*Redirect to RichReview landing page. Note this is outside of this Nuxt app, so $router.push is not used */
    if (process.browser) {
      window.location.replace('/about');
    }
  }
}
</script>
