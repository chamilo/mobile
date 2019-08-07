<template>
  <div id="app">
    <b-container>
      <Login v-if="needLogin"></Login>

      <router-view v-if="!needLogin"></router-view>
    </b-container>
  </div>
</template>

<script>
import { DatabaseManager } from './database'
import Login from './components/Login'

export default {
  name: 'App',
  components: { Login },
  data () {
    return {
      needLogin: true
    }
  },
  async created () {
    await DatabaseManager.init()

    const tx = DatabaseManager.db.transaction('account')
    let store = tx.objectStore('account')
    let value = await store.getAll()

    this.needLogin = value.length === 0
  }
}
</script>

<style>
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
