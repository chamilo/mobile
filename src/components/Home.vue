<template>
  <div class="home">
    <b-navbar fixed="top" toggleable="lg" type="dark" variant="info">
      <b-container>
        <b-navbar-brand>My courses</b-navbar-brand>

        <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav>
            <b-nav-item :to="{ name: 'MessagesInbox' }">Messages</b-nav-item>
            <b-nav-item :to="{ name: 'UserProfile' }">Profile</b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-container>
    </b-navbar>

    <b-container>
      <section class="mb-4" id="home-sessions" v-if="sessionCategories.length">
        <b-card :border-variant="sessionCategory.id ? '' : '0'" :header="sessionCategory.id ? sessionCategory.name : ''"
                :key="sessionCategory.id" :no-body="!sessionCategory.id" class="mb-4"
                header-tag="header" v-for="sessionCategory of sessionCategories">
          <b-card :header="session.name" :key="session.id" class="mb-4" header-tag="header"
                  v-for="session of sessionCategory.sessions">
            <b-card-text>{{ session.duration ? session.duration : session.date }}</b-card-text>
            <b-row v-if="session.courses.length">
              <b-col :key="course.id" cols="12" lg="3" md="4" sm="6" v-for="course of session.courses">
                <b-card :img-alt="course.title"
                        :img-src="course.pictureUrl ? course.pictureUrl : 'https://picsum.photos/600/300'"
                        :sub-title="course.code" :title="course.title" class="mb-4" img-top tag="article">
                  <b-card-text v-if="courses.teachers">{{ course.teachers }}</b-card-text>
                  <b-button :to="{ name: 'CourseHome', params: { course: course.id }, query: {  session: session.id } }"
                            block variant="warning">
                    Go to course
                  </b-button>
                </b-card>
              </b-col>
            </b-row>
          </b-card>
        </b-card>
      </section>

      <b-row id="home-courses" tag="section" v-if="courses.length">
        <b-col :key="course.id" cols="12" lg="3" md="4" sm="6" v-for="course of courses">
          <b-card :img-alt="course.title"
                  :img-src="course.urlPicture ? course.urlPicture : 'https://picsum.photos/600/300'"
                  :sub-title="course.code" :title="course.title" class="mb-4" img-top tag="article">
            <b-card-text>{{ course.teachers }}</b-card-text>
            <b-button :to="{ name: 'CourseHome', params: { course: course.id } }" block variant="warning">
              Go to course
            </b-button>
          </b-card>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
import { DatabaseManager } from '../database'

export default {
  name: 'Home',
  data () {
    return {
      courses: [],
      sessionCategories: []
    }
  },
  async beforeCreate () {
    let requestActions = ['user_courses', 'user_sessions']

    const tx = DatabaseManager.db.transaction('account')
    const store = tx.objectStore('account')
    const accounts = await store.getAll()
    const account = accounts[0]

    const endPointUrl = account.url + 'main/webservices/api/v2.php'

    try {
      const [coursesResponse, sessionCategoriesResponse] = await Promise.all(
        requestActions.map(async (requestAction) => {
          let formData = new FormData()
          formData.append('action', requestAction)
          formData.append('api_key', account.apiKey)
          formData.append('username', account.username)

          const request = await fetch(endPointUrl, { method: 'POST', body: formData })
          const response = await request.json()

          if (response.error) {
            throw response.message
          }

          return response.data
        })
      )

      if (coursesResponse) {
        this.courses = coursesResponse
      }

      if (sessionCategoriesResponse) {
        this.sessionCategories = sessionCategoriesResponse
      }
    } catch (e) {
      alert(e)
    }
  }
}
</script>

<style scoped>

</style>
