import MainEntity from "@/entities/mainEntity";

export default class ChatMessage extends MainEntity {
  id = 0
  room_id = 0
  user_id = null
  text = ''
  created_at = 0
  edited_at = 0
  deleted_at = 0
  reactions = {}
  pending = false
  failed = false

  getId() {
    return this.id
  }

  getText() {
    return this.deleted_at ? '' : this.text
  }

  getAuthor() {
    return this.created_by || null
  }

  isEdited() {
    return !!this.edited_at
  }

  isDeleted() {
    return !!this.deleted_at
  }

  getReactions() {
    return this.reactions || {}
  }
}
