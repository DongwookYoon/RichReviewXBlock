<template>

</template>

<script lang="ts">

import * as https from 'https'
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import $axios from 'axios'
import { Route } from 'vue-router'
import { ltiAuth } from '~/store' // Pre-initialized store.

@Component
export default class DocumentSubmitter extends Vue {

  @Prop({ type: Boolean, required: true }) readonly submitted !: boolean;

}

</script>

<style scoped>

</style>
