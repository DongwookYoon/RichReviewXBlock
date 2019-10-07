<template>
    <div id="content">
      <p id="login-title">UBC Pilot</p>
      <div id="username-div">
        <p id="username-label">User:</p>
        <input id="username-input" v-model="user" type="text"/>
      </div>
      <div id="password-div">
        <p id="password-label">Password:</p>
        <input id="password-input" v-model="password" type="password"/>
      </div>
      <button id="login-button" @click="login">Login</button>
    </div>
</template>

<script>
import axios from 'axios'
import https from 'https'

export default {
    name: 'ubc_pilot',
    data() {
      return {
        user: '',
        password: ''
      }
    },
    fetch({store, redirect}){
      if (store.state.authUser) {
        return redirect('/edu/dashboard')
      }
    },
    methods: {
      async login() {
        try {
          const user = await axios.post(
            `/login_pilot`,
            {
              'id_str': 'pilot_' + this.user,
              'password': this.password,
              'auth_type': 'ubc_pilot'
            },
            {
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
          )
          console.log(user.data)
          if (user.data) {
            this.$store.state.authUser = user.data
            this.$router.push('/edu/dashboard')
          }
        } catch (err) {
          alert('Invalid Credentials')
        }
      }
    }
  }
</script>

<style scoped>
#content {
  position: absolute;
  margin: auto;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 300px;
  height: 150px;
  color: #0c2343;
}

#login-title {
  text-align: center;
  font-size: 2rem;
  margin: 0;
}

#username-div,
#password-div {
  display: flex;
}

#username-label {
  margin-left: 50px;
}

#username-label,
#password-label {
  margin-right: 1vw;
  font-size: 1.25rem;
}

#username-input,
#password-input {
  height: 1.5rem;
  margin-top: 5px;
  border: 1px solid #f4f4f4;
}

#login-button {
  background-color: #0c2343;
  color: white;
  border-radius: 4px;
}
</style>
