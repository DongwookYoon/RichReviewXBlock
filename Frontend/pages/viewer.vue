<template>
  <body>
    <div class="content_body">
      <base href="/" />
      <div id="r2_app_page" align="'center">
        <div id="r2_app_container" align="left"></div>
      </div>
    </div>
  </body>
</template>

<script>
/* eslint-disable camelcase,no-undef,no-console */

import axios from 'axios'

export default {
  name: 'Viewer',
  head: {
    script: [
      {
        src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js'
      },
      {
        src:
          'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js'
      },
      {
        src: '/viewer_helper.js'
      }
    ]
  },
  mounted: function() {
    console.log(this.$route)
    axios
      .get(
        `http://localhost:3000/courses/${this.$route.params.course_id}/groups/${
          this.$route.query.groupid
        }`,
        {
          headers: {
            Authorization: this.$auth.user.sub
          }
        }
      )
      .then(async res => {
        const r2_ctx = res.data.r2_ctx
        r2_ctx.auth = this.$auth.user
        const cdn_endpoint = res.data.cdn_endpoint

        // const viewer_script = await document.createElement('script')
        // await viewer_script.setAttribute('src', '/viewer_helper.js')
        //
        // document.getElementById('r2_app_page').appendChild(viewer_script)

        const viewer_script_call = await document.createElement('script')

        viewer_script_call.text = `loadRichReview("${encodeURIComponent(
          JSON.stringify(r2_ctx)
        )}", "development", "${cdn_endpoint}")`

        await document
          .getElementById('r2_app_page')
          .appendChild(viewer_script_call)
      })
      .catch(e => {
        console.log(e)
        return { viewer_data: undefined }
      })
  }
}
</script>

<style scoped></style>
