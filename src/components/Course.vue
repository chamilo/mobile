<template>
  <div id="course">
    <b-navbar fixed="top" toggleable="lg" type="dark" variant="info">
      <b-navbar-nav>
        <b-nav-item @click="$router.go(-1)" title="Back">
          <font-awesome-icon icon="arrow-left" fixed-width></font-awesome-icon>
          <b-img rounded="circle" :src="urlPicture" height="16px"></b-img>
        </b-nav-item>
      </b-navbar-nav>
    </b-navbar>

    <b-container>
      <div class="text-center mb-3">
        <h1>{{ title }}</h1>
        <p class="lead text-muted">{{ teachers }}</p>
      </div>

      <b-row v-if="$route.name === 'CourseHome' && tools.length">
        <b-col :key="tool" cols="6" lg="2" md="3" v-for="tool of toolsAllowed">
          <b-button :to="{ name: 'CourseDescriptionsTool', query: $route.query }" block class="mb-4"
                    v-if="tool === 'course_description'" variant="light">
            Course Description
          </b-button>
          <b-button :to="{ name: 'CourseDocumentsTool', query: $route.query }" block class="mb-4"
                    v-if="tool === 'document'" variant="light">
            Documents
          </b-button>
          <b-button :to="{ name: 'CourseLpTool', query: $route.query }" block class="mb-4"
                    v-if="tool === 'learnpath'" variant="light">
            Learning Paths
          </b-button>
          <b-button :to="{ name: 'CourseForumTool', query: $route.query }" block class="mb-4"
                    v-if="tool === 'forum'" variant="light">
            Forum
          </b-button>
          <b-button :to="{ name: 'CourseAgendaTool', query: $route.query }" block class="mb-4"
                    v-if="tool === 'calendar_event'" variant="light">
            Agenda
          </b-button>
          <b-button :to="{ name: 'CourseNotebookTool', query: $route.query }" block class="mb-4"
                    v-if="tool === 'notebook'" variant="light">
            Notebook
          </b-button>
          <b-button :to="{ name: 'CourseAnnouncementsTool', query: $route.query }" block class="mb-4"
                    v-if="tool === 'announcement'" variant="light">
            Announcements
          </b-button>
        </b-col>
      </b-row>

      <router-view></router-view>
    </b-container>
  </div>
</template>

<script>
import { DatabaseManager } from '../database'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

library.add(faArrowLeft)

export default {
  name: 'Course',
  data: function () {
    return {
      id: 0,
      title: '',
      code: '',
      directory: '',
      urlPicture: null,
      teachers: '',
      tools: []
    }
  },
  computed: {
    toolsAllowed () {
      const filters = [
        'course_description',
        'document',
        'learnpath',
        'forum',
        'calendar_event',
        'notebook',
        'announcement'
      ]

      return this.tools
        .map(tool => tool.type)
        .filter(tool => filters.indexOf(tool) >= 0)
    }
  },
  async beforeCreate () {
    const tx = DatabaseManager.db.transaction('account')
    const store = tx.objectStore('account')
    const accounts = await store.getAll()
    const account = accounts[0]

    const endPointUrl = account.url + 'main/webservices/api/v2.php'

    let formData = new FormData()
    formData.append('action', 'course_info')
    formData.append('api_key', account.apiKey)
    formData.append('course', this.$route.params.course)

    if (typeof this.$route.params.session !== 'undefined') {
      formData.append('session', this.$route.query.session)
    }

    formData.append('username', account.username)

    try {
      const request = await fetch(endPointUrl, { method: 'POST', body: formData })
      const response = await request.json()

      if (response.error) {
        throw response.message
      }

      this.id = response.data.id
      this.title = response.data.title
      this.code = response.data.code
      this.directory = response.data.directory
      this.urlPicture = response.data.urlPicture
      this.teachers = response.data.teachers
      this.tools = response.data.tools
    } catch (e) {
      alert(e)
    }
  }
}
</script>

<style scoped>

</style>
