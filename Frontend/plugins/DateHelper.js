/* eslint-disable camelcase,no-console */
/* camelcase */
import Vue from 'vue'

Vue.mixin({
  methods: {
    format_date: date_string => {
      try {
        new Date(date_string).toISOString()
      } catch (e) {
        return ''
      }

      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ]

      const date = new Date(date_string)
      const month = months[date.getMonth()]
      const day = date.getDate()
      const hour = date.getHours() > 12 ? date.getHours() - 12 : date.getHours()
      const minutes = ('0' + date.getMinutes()).slice(-2)
      const am_pm = date.getHours() >= 12 ? 'pm' : 'am'

      return `${month} ${day} at ${hour}:${minutes}${am_pm}`
    }
  }
})

export default ({ app }, inject) => {
  app.is_date = date_string => {
    try {
      new Date(date_string).toISOString()
      return true
    } catch (e) {
      return false
    }
  }
}
