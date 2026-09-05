import MainEntity from "@/entities/mainEntity";

export default class ChatRoom extends MainEntity {
  id = 0
  name = ''
  owner_id = null
  last_message_at = 0
  members_count = 0
  is_private = false
  is_channel = false
  unread = 0

  getId() {
    return this.id
  }

  getName() {
    return this.name || `#${this.id}`
  }

  isChannel() {
    return this.is_channel === true
  }

  isPrivate() {
    return this.is_private === true
  }

  getUnread() {
    return this.unread || 0
  }
}
