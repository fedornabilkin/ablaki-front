import MainBuilder from "../mainBuilder";
import ChatRoom from "@/entities/chat/room";
import ChatMessage from "@/entities/chat/message";

export class ChatRoomBuilder extends MainBuilder {

  createEntity() {
    return new ChatRoom()
  }

  build(data) {
    super.build(data)
    this.entity.id = data.id
    this.entity.name = data.name ?? data.title ?? ''
    this.entity.owner_id = data.owner_id ?? null
    this.entity.last_message_at = data.last_message_at ?? data.last_post ?? 0
    this.entity.members_count = data.members_count ?? 0
    this.entity.is_private = !!data.is_private
    this.entity.is_channel = !!data.is_channel
    this.entity.unread = data.unread ?? 0
  }
}

export class ChatMessageBuilder extends MainBuilder {

  createEntity() {
    return new ChatMessage()
  }

  build(data) {
    data.created_by = data.user ?? data.created_by ?? undefined
    super.build(data)
    this.entity.id = data.id
    this.entity.room_id = data.room_id ?? 0
    this.entity.user_id = data.user_id ?? data.created_by?.id ?? null
    this.entity.text = data.text ?? data.comment ?? ''
    this.entity.edited_at = data.edited_at ?? 0
    this.entity.deleted_at = data.deleted_at ?? 0
    this.entity.reactions = data.reactions ?? {}
    this.entity.pending = !!data.pending
    this.entity.failed = !!data.failed
  }
}
