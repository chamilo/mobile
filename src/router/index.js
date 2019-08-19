import Vue from 'vue'
import Router from 'vue-router'
import Home from '../components/Home'
import Course from '../components/Course'
import UserProfile from '../components/UserProfile'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/course/:course',
      component: Course,
      children: [
        {
          path: '',
          name: 'CourseHome'
        },
        {
          path: 'description',
          name: 'CourseDescriptionsTool'
        },
        {
          path: 'announcements',
          children: [
            {
              path: '',
              name: 'CourseAnnouncementsTool'
            },
            {
              path: ':id',
              name: 'CourseAnnouncement'
            }
          ]
        },
        {
          path: 'agenda',
          name: 'CourseAgendaTool'
        },
        {
          path: 'notebook',
          name: 'CourseNotebookTool'
        },
        {
          path: 'documents',
          children: [
            {
              path: '',
              name: 'CourseDocumentsTool'
            },
            {
              path: ':id',
              name: 'CourseDocument'
            }
          ]
        },
        {
          path: 'forum',
          children: [
            {
              path: '',
              name: 'CourseForumTool'
            },
            {
              path: 'category/:category',
              name: 'CourseForumCategory'
            },
            {
              path: 'forum/:forum',
              name: 'CourseForum'
            },
            {
              path: 'thead/:thread',
              name: 'CourseForumThread'
            }
          ]
        },
        {
          path: 'lp',
          children: [
            {
              path: '',
              name: 'CourseLpTool'
            },
            {
              path: ':lp',
              name: 'CourseLp'
            }
          ]
        }
      ]
    },
    {
      path: '/messages',
      children: [
        {
          path: '',
          name: 'MessagesInbox'
        },
        {
          path: ':id',
          name: 'Message'
        }
      ]
    },
    {
      path: '/user',
      component: UserProfile,
      children: [
        {
          path: 'profile',
          name: 'UserProfile'
        }
      ]
    }
  ]
})
