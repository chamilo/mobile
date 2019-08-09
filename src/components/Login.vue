<template>
  <div class="login">
    <b-form @submit="onSubmit">
      <b-form-group label="Portal URL" label-cols-md="2" label-cols-sm="4" label-for="url">
        <b-form-input id="url" placeholder="https://" required type="url" v-model.trim="form.portalUrl"></b-form-input>
      </b-form-group>

      <b-form-group label="Username" label-cols-md="2" label-cols-sm="4" label-for="username">
        <b-form-input id="username" required type="text" v-model.trim="form.username"></b-form-input>
      </b-form-group>

      <b-form-group label="Password" label-cols-md="2" label-cols-sm="4" label-for="password">
        <b-input-group>
          <b-form-input :type="form.showPassword ? 'text' : 'password'" id="password" required
                        v-model="form.password"></b-form-input>
          <b-input-group-append>
            <b-button :pressed.sync="form.showPassword" variant="info">
              <font-awesome-icon :icon="form.showPassword ? 'eye-slash' : 'eye'" fixed-width></font-awesome-icon>
            </b-button>
          </b-input-group-append>
        </b-input-group>
      </b-form-group>

      <b-button block type="submit" variant="primary">
        <font-awesome-icon icon="sign-in-alt"></font-awesome-icon> Sign in
      </b-button>
    </b-form>
  </div>
</template>

<script>
import { library } from '@fortawesome/fontawesome-svg-core'
import { faSignInAlt, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import router from '../router'
import { DatabaseManager } from '../database'

library.add(faSignInAlt, faEye, faEyeSlash)

export default {
  name: 'Login',
  data () {
    return {
      form: {
        portalUrl: '',
        username: '',
        password: '',
        showPassword: false
      }
    }
  },
  methods: {
    trimUrl () {
      if (this.form.portalUrl.substr(-1) === '/') {
        this.form.portalUrl = this.form.portalUrl.substring(0, this.form.portalUrl.length - 1)
      }

      this.form.portalUrl += '/'

      return this.form.portalUrl
    },
    async onSubmit (event) {
      event.preventDefault()

      this.trimUrl()

      const endPointUrl = this.form.portalUrl + 'main/webservices/api/v2.php'
      let formData = new FormData()

      formData.append('action', 'authenticate')
      formData.append('username', this.form.username)
      formData.append('password', this.form.password)

      try {
        const request = await fetch(endPointUrl, { method: 'POST', body: formData })
        const response = await request.json()

        if (response.error) {
          throw response.message
        }

        const tx = DatabaseManager.db.transaction('account', 'readwrite')
        const store = tx.objectStore('account')

        await store.add({
          url: response.data.url,
          username: this.form.username,
          apiKey: response.data.apiKey,
          lastMessage: 0,
          lastCheckDate: new Date(),
          gcmSenderId: response.data.gcmSenderId
        })

        router.go(0)
      } catch (e) {
        alert(e)
      }
    }
  }
}
</script>

<style scoped>

</style>
