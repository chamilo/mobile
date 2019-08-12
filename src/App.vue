<template>
  <div id="app" :style="needLogin ? '' : { paddingTop: '56px' }">
    <Login v-if="needLogin"></Login>

    <router-view v-if="!needLogin" :class="needLogin ? '' : 'pt-3'"></router-view>
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
}
</style>
