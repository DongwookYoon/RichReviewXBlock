/* eslint-disable camelcase */
<template>
  <div id="content">
    <div id="mute-panel" v-if="anySubmitted">
      <button
        v-if="!allMuted"
        id="mute-all-button"
        title="Mute all instructor comments for this assignment. Students will not see comments in RichReview."
        @click="muteAllSubmissions"
      >
        Mute Comments
      </button>
      <button
        v-if="allMuted===true"
        id="unmute-all-button"
        title="Unmute all instructor comments for this assignment. Students will see comments in RichReview."
        @click="unmuteAllSubmissions"
      >
        Unmute Comments
      </button>
    </div>

    <table id="submissions-table">
      <thead id="submissions-header">
        <tr>
          <th id="name-header">
            Name
          </th>
          <th id="status-header">
            Status
          </th>
          <!--
          <th id="mark-header">
            Mark
          </th>
          -->
          <th id="submission-time-header">
            Submission Time
          </th>
          <th id="muted-header">
            Muted
          </th>
        </tr>
      </thead>
      <tbody class="submissions-body">
        <tr
          v-for="(s, index) in submissions"
          :key="s.key"
          class="submission-row"
        >
          <td class="submission-name">
            {{ s.submitter_name }}
          </td>
          <td class="submission-status">
            {{ s.submission_status }}
          </td>
          <!--
          <td class="submission-mark">
            {{ s.mark === '' ? '-' : s.mark }}/{{ s.points }}
          </td>
          -->
          <td class="submission-time">
            {{
              s.submission_time !== '' ? format_date(s.submission_time) : '-'
            }}
          </td>
          <td class="mute">
            <no-ssr placeholder="Loading...">
              <ToggleButton
                v-if="isSubmitted(s)"
                :value="isMuted(s)"
                :sync="true"
                :labels="{checked: 'Muted', unchecked: 'Unmuted'}"
                :width="90"
                :height="27"
                :font-size="13"
                :color="{checked: '#e01700', unchecked: '#32c51c'}"
                @change="s.muted === true ? unmuteSubmission(s.submission_id, index) : muteSubmission(s.submission_id, index)"
              />
            </no-ssr>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import User from '~/model/user'
import ApiHelper from '~/utils/api-helper'

/* eslint-disable camelcase */
@Component
export default class SubmissionsDashboard extends Vue {
  @Prop({ required: true }) readonly user_data !: User;
  @Prop({ required: true }) readonly assignment_id !: string;
  @Prop({ required: true }) readonly course_id !: string;
  @Prop({ required: true }) readonly group_id !: string;

  private user !: User
  private submissions: [] = []

  created () {
    this.user = User.parse(this.user_data)

    this.loadSubmissions().then((submissions) => {
      this.submissions = submissions as any

      console.log(submissions)
    })
  }

  // TODO Update this to get the correct path to a submission for lti assignments. ****
  goToSubmission (submissionId: string, link: string) {
    if (link !== '') {
      window.open(
          `/lti/assignments?${link
            }&assignment_id=${
              encodeURIComponent(this.assignment_id)
          }&submission_id=${
            encodeURIComponent(submissionId)
          }`
      )
    }
  }

  async loadSubmissions () {
    return await ApiHelper.getAllSubmissions(this.course_id,
      this.assignment_id,
      this.user.id,
      this.$axios)
  }

  async muteAllSubmissions () {
    await ApiHelper.muteAllSubmissions(this.course_id,
      this.assignment_id,
      this.user.id,
      this.$axios)

    for (const submission of this.submissions) {
      const sub = submission as any
      if (sub.muted !== '') {
        sub.muted = true
      }
    }

    alert('All instructor comments are muted.')
  }

  async unmuteAllSubmissions () {
    await ApiHelper.unmuteAllSubmissions(this.course_id,
      this.assignment_id,
      this.user.id,
      this.$axios)

    for (const submission of this.submissions) {
      const sub = submission as any
      if (sub.muted !== '') {
        sub.muted = false
      }
    }

    alert('All instructor comments are now visible to students.')
  }

  async muteSubmission (submissionId: string, index: number) {
    await ApiHelper.muteSubmission(this.course_id,
      this.assignment_id,
      submissionId,
      this.user.id,
      this.$axios)

    const target = this.submissions[index] as any
    target.muted = true
  }

  async unmuteSubmission (submissionId: string, index: number) {
    await ApiHelper.unmuteSubmission(this.course_id,
      this.assignment_id,
      submissionId,
      this.user.id,
      this.$axios)

    const target = this.submissions[index] as any
    target.muted = false
  }

  isMuted (s: any): boolean {
    if (s.muted === true) {
      return true
    }
    return false
  }

  isSubmitted (s: any): boolean {
    const status: string = (s.submission_status as string).toUpperCase()

    if (status === 'NOT SUBMITTED') {
      return false
    }

    return true
  }

  get allMuted (): boolean {
    for (const sub of this.submissions) {
      if ((sub as any).muted !== true) {
        return false
      }
    }
    return true
  }

  get anySubmitted (): boolean {
    for (const sub of this.submissions) {
      if (this.isSubmitted(sub)) {
        return true
      }
    }
    return false
  }

}

</script>

<style scoped>
@import '~/node_modules/bootstrap/dist/css/bootstrap.css';

p {
  margin: 0;
}

td {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

thead {
  border-bottom: 1px solid #0c2343;
}

table {
  margin: 0.5rem 2rem 1rem 0;
}

#mute-all-button,
#unmute-all-button,
.mute-button,
.unmute-button,
.grader-button {
  font-size: 1rem;
  background-color: #0c2343;
  border-radius: 0.5vh;
  color: white;
  padding-right: 0.5rem;
  padding-left: 0.5rem;
  margin-bottom: 1rem;
}
#mute-all-button {
  background-color: rgb(224, 23, 0);
}
#unmute-all-button {
  background-color: rgb(50, 197, 28)
}
#mute-all-button,
#unmute-all-button {
  border-radius: 10px;
}
.mute-button {
  background-color: #e01700;
  color: white;
}

.unmute-button {
  background-color: #32c51c;
  color: white;
}

.submission-row:hover {
  background-color: #f5f5f5;
}

#submissions {
  display: flex;
  min-height: 100vh;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
}

#submissions-table {
  font-size: 1rem;
  color: #0c2343;
}

#submissions-header {
  font-size: 1.25rem;
}

.submissions-body {
  font-size: 1.2rem;
}

#name-header,
.submission-name {
  width: 20vw;
  padding-right: 1rem;
}

#status-header,
.submission-status {
  width: 10vw;
  padding-right: 2rem;
}

#mark-header,
.submission-mark {
  width: 6vw;
  text-align: center;
  padding-right: 2rem;
}

#submission-time-header,
.submission-time {
  width: 15vw;
  text-align: center;
  padding-right: 2rem;
}

#muted-header,
.mute {
  width: 12vw;
  text-align: center;
  padding-right: 1rem;
}

#grader-header,
.grader {
  width: 7vw;
  text-align: center;
  padding-right: 1rem;
}

.inactive-assignment:hover {
  background-color: rgba(252, 228, 228, 0.589);
}

.inactive-assignment {
  cursor: default;
  opacity: 0.5;
}
</style>
