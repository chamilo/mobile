import { openDB } from 'idb'

const DB_NAME = 'chamilo-messaging'
const DB_VERSION = 3

export let DatabaseManager = {
  async init () {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade (idbDatabase) {
        const accountStore = idbDatabase.createObjectStore('account', {
          autoIncrement: true
        })
        accountStore.createIndex('url', 'url')
        accountStore.createIndex('username', 'username')
        accountStore.createIndex('apiKey', 'apiKey', { unique: true })
        accountStore.createIndex('lastMessage', 'lastMessage')
        accountStore.createIndex('lastCheckDate', 'lastCheckDate')
        accountStore.createIndex('gcmSenderId', 'gcmSenderId', { unique: true })

        const messageStore = idbDatabase.createObjectStore('message', {
          autoIncrement: true
        })
        messageStore.createIndex('messageId', 'messageId', { unique: true })
        messageStore.createIndex('title', 'title')
        messageStore.createIndex('sender', 'sender')
        messageStore.createIndex('hasAttachment', 'hasAttachment')
        messageStore.createIndex('sendDate', 'sendDate')
        messageStore.createIndex('content', 'content')
        messageStore.createIndex('url', 'url')
      }
    })
  }
}
