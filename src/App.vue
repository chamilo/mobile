<template>
  <div id="app">
    <Login v-if="needLogin"></Login>

    <router-view v-if="!needLogin"></router-view>
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
  async beforeCreate () {
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
  margin-top: 71px;
}

  ul#app-navbar li.nav-item:nth-child(2){
    width: calc(100% - 52px);
  }
</style>
