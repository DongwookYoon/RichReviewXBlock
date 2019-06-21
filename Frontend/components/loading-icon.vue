<template lang="html">
  <div v-if="loading" class="loading-page">
    <svg
      id="loading-icon"
      viewBox="0 0 261 204"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M96 96V15.5H45.5C33.3333 15.5 8.6 23 7 53C5.4 83 32 94.1667 45.5 96H96Z"
        fill="url(#paint0_linear)"
      />
      <path
        d="M102 113V0H172.872C189.947 0 224.658 10.528 226.903 52.6398C229.149 94.7515 191.818 110.426 172.872 113H102Z"
        fill="url(#paint1_linear)"
      />
      <path d="M0 204L96 97V204H0Z" fill="url(#paint2_linear)" />
      <path d="M261 204L102 66V204H261Z" fill="url(#paint3_linear)" />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1="130.5"
          y1="0"
          x2="131"
          y2="321.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#0C2343" />
          <stop offset="1" stop-color="#0C2343" stop-opacity="0" />
        </linearGradient>
        <linearGradient
          id="paint1_linear"
          x1="130.5"
          y1="0"
          x2="131"
          y2="321.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#0C2343" />
          <stop offset="1" stop-color="#0C2343" stop-opacity="0" />
        </linearGradient>
        <linearGradient
          id="paint2_linear"
          x1="130.5"
          y1="0"
          x2="131"
          y2="321.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#0C2343" />
          <stop offset="1" stop-color="#0C2343" stop-opacity="0" />
        </linearGradient>
        <linearGradient
          id="paint3_linear"
          x1="130.5"
          y1="0"
          x2="131"
          y2="321.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#0C2343" />
          <stop offset="1" stop-color="#0C2343" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>
    <!--<img id="loading-icon" src="/loading-icon.png" />-->
  </div>
</template>

<script>
export default {
  data: () => ({
    loading: false
  }),
  methods: {
    start() {
      this.loading = true
    },
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },
    async finish() {
      await this.sleep(500)
      this.loading = false
    }
  }
}
</script>

<style scoped>
.loading-page {
  position: absolute;
  left: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.97);
  z-index: 99999;
}

#loading-icon {
  width: 20vw;
  position: absolute;
  top: 33%;
  left: 40%;

  -webkit-animation: rotate-left 3s ease-in-out infinite both;
}

@-webkit-keyframes rotate-left {
  0% {
    -webkit-transform: rotateY(0);
  }
  50% {
    -webkit-transform: rotateY(180deg);
  }
}
@keyframes rotate-left {
  0% {
    -webkit-transform: rotateY(0);
  }
  50% {
    -webkit-transform: rotateY(180deg);
  }
}
</style>
