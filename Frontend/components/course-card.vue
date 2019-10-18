<template>
  <div class="course-card" @click="go_to_course(link)">
    <!--<p class="course-title">{{ title }}</p>-->
    <v-clamp class="course-title" autoresize :max-lines="1">
      {{ title }}</v-clamp
    >
    <v-clamp class="course-description" autoresize :max-lines="3">
      {{ description }}</v-clamp
    >
    <div>
      <p v-if="assignment_count !== 1" class="course-assignment-count">
        {{ assignment_count }} Assignments
      </p>
      <p v-if="assignment_count === 1" class="course-assignment-count">
        {{ assignment_count }} Assignment
      </p>
      <!--<p class="course-role">{{ role }}</p>-->
    </div>
  </div>
</template>

<script>
/* eslint-disable vue/prop-name-casing */
import VClamp from 'vue-clamp'

export default {
  name: 'CourseCard',
  components: {
    VClamp
  },
  props: {
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: ''
    },
    assignment_count: {
      type: Number,
      default: 0
    },
    link: {
      type: String,
      default: ''
    }
  },
  mounted() {
    this.$emit('done')
  },
  methods: {
    go_to_course(link) {
      this.$router.push(`${link}`)
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

.course-title,
.course-description,
.course-role,
.course-assignment-count {
  margin: 0;
  padding-left: 4%;
  padding-right: 4%;
}

.course-title,
.course-description,
.course-role {
  color: #0c2343;
}

.course-title {
  font-size: 1.2em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-description {
  font-size: 1em;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 1rem;
}

.course-role {
  font-style: italic;
  font-size: 12px;
  position: relative;
  color: black;
  bottom: 0;
  right: 0;
  padding-right: 5%;
  text-align: right;
}

.course-assignment-count {
  font-size: 12px;
  position: relative;
  bottom: 0;
  width: 100%;
  color: white;
  background-color: #0c2343;
}

.course-card {
  margin-top: 0;
  /*margin-bottom: 5vh;*/
  /*margin-left: 2vw;*/
  background-color: #e8e8e8;
  min-height: 50px;
  max-height: 80px;
  /*width: 17vw;*/
  width: 262px;
  position: relative;
  break-inside: avoid-column;
  border-radius: 0.5px;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  cursor: pointer;
}
</style>
