/* eslint-disable camelcase */
<template>
  <div id="content">
    <h2>All Submissions </h2>

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
            <span v-if="anySubmitted" id="mute-panel">
              <button
                v-if="!allMuted"
                id="mute-all-button"
                title="Mute all instructor comments for this assignment. Students will not see comments in RichReview."
                @click="muteAllSubmissions"
              >
                Mute All
              </button>
              <button
                v-if="allMuted===true"
                id="unmute-all-button"
                title="Unmute all instructor comments for this assignment. Students will see comments in RichReview."
                @click="unmuteAllSubmissions"
              >
                Unmute All
              </button>
            </span>
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
              <span v-else>-</span>
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

  /**
   * Are all possible submissions muted? Since it is not possible
   * to mute if the student has not submitted the assignment,
   * unsubmitted assignments will be ignored.
   */
  get allMuted (): boolean {
    for (const sub of this.submissions) {
      const s: any = sub as any
      if (this.isSubmitted(s) && s.muted !== true) {
        return false
      }
    }
    return true
  }

  /**
   * Check if there are any assignments submitted whatsoever.
   */
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
  padding: 0.5rem 0.5rem 0.5rem 0;
}

thead {
  border-bottom: 1px solid #0c2343;
}

table {
  margin: 0.5rem 2rem 1rem 0;
}

#mute-all-button,
#unmute-all-button
{
  font-size: 1.3rem;
  background-color: #0c2343;
  border-radius: 0.5vh;
  color: white;
  padding: 0 0.5rem;
  margin: 1rem 0 1rem 5.5rem;
  border-radius: 5px;
}
#mute-all-button {
  background-color: rgb(224, 23, 0);
}
#unmute-all-button {
  background-color: rgb(50, 197, 28)
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
  font-size: 1.1rem;
  color: #0c2343;
}

#submissions-header {
  font-size: 1.45rem;
}

.submissions-body {
  font-size: 1.4rem;
}

#name-header, .submission-name {
  width: 20vw;
  min-width: 12rem;
}

#name-header, .submission-name {
  width: 14vw;
  padding-right: 2rem;
}

#status-header, .submission-status {
  width: 11rem;
  padding-right: 3rem;
}

#submission-time-header, .submission-time {
  width: 17rem;
  padding-right: 3rem;
}

#muted-header,
.mute {
  min-width: 25rem;
  width: 25vw;
  text-align: left;
}


.inactive-assignment:hover {
  background-color: rgba(252, 228, 228, 0.589);
}

.inactive-assignment {
  cursor: default;
  opacity: 0.5;
}

@media only screen and (max-width: 780px) {

  #mute-all-button,
  #unmute-all-button
  {
    margin: 1rem 0 1rem 3rem;
  }
}
</style>
