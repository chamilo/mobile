<template>
  <div id="user-profile">
    <b-nav class="bg-info fixed-top" id="app-navbar">
      <b-nav-item @click="$router.go(-1)" active link-classes="text-light py-3">
        <font-awesome-icon fixed-width icon="arrow-left"></font-awesome-icon>
        <span class="sr-only">Back</span>
      </b-nav-item>
      <b-nav-item disabled link-classes="text-light py-3 text-truncate">
        Profile
      </b-nav-item>
    </b-nav>

    <b-container>
      <div v-if="!isLoading">
        <h1 class="text-center mb-4">
          {{ fullName }}
          <small class="text-muted d-block" v-if="officialCode">{{ officialCode }}</small>
        </h1>

        <b-img :src="pictureUri" center class="mb-4" rounded="circle"></b-img>

        <b-row class="justify-content-md-center">
          <b-col lg="6" md="8" sm="10">
            <b-row tag="dl">
              <b-col md="5" sm="4" tag="dt">Username</b-col>
              <b-col md="7" sm="8" tag="dd">{{ username }}</b-col>
              <b-col md="5" sm="4" tag="dt" v-if="phone">Phone</b-col>
              <b-col md="7" sm="8" tag="dd" v-if="phone">{{ phone }}</b-col>
            </b-row>

            <b-row v-if="extra.length > 0">
              <template v-for="(e, i) in extra">
                <b-col :key="i + '_dt'" md="5" sm="4" tag="dt" v-if="e.value.trim().length">{{ e.title }}</b-col>
                <b-col :key="i + '_dd'" md="7" sm="8" tag="dd" v-if="e.value.trim().length">{{ e.value }}</b-col>
              </template>
            </b-row>
          </b-col>
        </b-row>
      </div>
    </b-container>
  </div>
</template>

<script>
import { DatabaseManager } from '../database'

export default {
  name: 'UserProfile',
  data () {
    return {
      isLoading: true,
      fullName: '',
      username: '',
      officialCode: '',
      phone: '',
      pictureUri: '',
      extra: []
    }
  },
  async beforeCreate () {
    try {
      const tx = DatabaseManager.db.transaction('account')
      const store = tx.objectStore('account')
      const accounts = await store.getAll()
      const account = accounts[0]

      const endPointUrl = account.url + 'main/webservices/api/v2.php'

      let formData = new FormData()
      formData.append('action', 'user_profile')
      formData.append('api_key', account.apiKey)
      formData.append('username', account.username)

      const request = await fetch(endPointUrl, { method: 'POST', body: formData })
      const response = await request.json()

      this.isLoading = false

      if (response.error) {
        throw response.message
      }

      this.fullName = response.data.fullName
      this.username = response.data.username
      this.officialCode = response.data.officialCode
      this.phone = response.data.phone
      this.pictureUri = response.data.pictureUri
      this.extra = response.data.extra
    } catch (e) {
      alert(e)
    }
  }
}
</script>

<style scoped>
</style>
