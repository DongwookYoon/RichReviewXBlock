<template>
  <div id="nav-bar-div">
    <p class="nav-bar-component" @click="go_to_course()">
      {{ course }}
    </p>
    <p
      v-if="
        assignment !== '' ||
          people === 'true' ||
          grades === 'true' ||
          new_assignment === 'true' ||
          deleted_assignments === 'true'
      "
      class="nav-bar-divider"
    >
      >
    </p>
    <p
      v-if="assignment !== ''"
      class="nav-bar-component"
      :style="{ color: assignment_color }"
      @click="go_to_assignment"
    >
      {{ assignment }}
    </p>
    <p
      v-if="new_assignment === 'true'"
      class="nav-bar-component"
      :style="{ color: new_assignment_color }"
    >
      New Assignment
    </p>
    <p
      v-if="deleted_assignments === 'true'"
      class="nav-bar-component"
      :style="{ color: deleted_assignments_color }"
    >
      Deleted Assignments
    </p>
    <p
      v-if="people === 'true'"
      class="nav-bar-component"
      :style="{ color: people_color }"
      @click="go_to_people"
    >
      People
    </p>
    <p
      v-if="grades === 'true'"
      class="nav-bar-component"
      :style="{ color: grades_color }"
      @click="go_to_grades"
    >
      Grades
    </p>
    <p
      v-if="
        (assignment !== '' &&
          (edit_assignment === 'true' || submissions === 'true')) ||
          (people === 'true' && (edit_groups === 'true' || course_group !== ''))
      "
      class="nav-bar-divider"
    >
      >
    </p>
    <p
      v-if="assignment !== '' && edit_assignment === 'true'"
      class="nav-bar-component"
      :style="{ color: edit_assignment_color }"
    >
      Edit
    </p>
    <p
      v-if="assignment !== '' && submissions === 'true'"
      :style="{ color: submissions_color }"
      class="nav-bar-component"
    >
      Submissions
    </p>
    <p
      v-if="people === 'true' && edit_groups === 'true'"
      :style="{ color: edit_groups_color }"
      class="nav-bar-component"
    >
      Edit Groups
    </p>
    <p
      v-if="people === 'true' && course_group !== ''"
      :style="{ color: course_group_color }"
      class="nav-bar-component"
    >
      {{ course_group }}
    </p>
  </div>
</template>

<script>
/* eslint-disable vue/prop-name-casing */

export default {
  name: 'NavBar',
  props: {
    course: {
      type: String,
      default: ''
    },
    assignment: {
      type: String,
      default: ''
    },
    deleted_assignments: {
      type: String,
      default: ''
    },
    new_assignment: {
      type: String,
      default: ''
    },
    people: {
      type: String,
      default: ''
    },
    grades: {
      type: String,
      default: ''
    },
    edit_assignment: {
      type: String,
      default: ''
    },
    submissions: {
      type: String,
      default: ''
    },
    edit_groups: {
      type: String,
      default: ''
    },
    course_group: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      deleted_assignments_color: '#646464',
      new_assignment_color: '#646464',
      grades_color: '#646464',
      edit_assignment_color: '#646464',
      submissions_color: '#646464',
      edit_groups_color: '#646464',
      course_group_color: '#646464'
    }
  },
  computed: {
    assignment_color() {
      if (this.edit_assignment === '' && this.submissions === '')
        return '#646464'
      return '#0c2343'
    },
    people_color() {
      if (this.edit_groups === '' && this.course_group === '') return '#646464'
      return '#0c2343'
    }
  },
  methods: {
    go_to_course() {
      this.$router.push(`/edu/courses/${this.$route.params.course_id}`)
    },
    go_to_assignment() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }`
      )
    },
    go_to_people() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/users`
      )
    },
    go_to_grades() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/grades`
      )
    }
  }
}
</script>

<style scoped>
.nav-bar-component,
.nav-bar-divider {
  margin-right: 1vw;
  margin-bottom: 0;
}

.nav-bar-component {
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 10vw;
}

#nav-bar-div {
  display: flex;
  font-size: 3vh;
  color: #0c2343;
  margin-left: -3vw;
  margin-bottom: 3vh;
  margin-top: -2vh;
}
</style>
