import MainEntity from "@/entities/mainEntity";

export default class Comment extends MainEntity{
  id = 0
  comment = ''
  created_at = 0

  getId() {
    return this.id
  }

  getComment() {
    return this.comment
  }
}