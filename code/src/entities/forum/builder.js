import MainBuilder from "../mainBuilder";
import Theme from "@/entities/forum/theme";
import Comment from "@/entities/forum/comment";

export class ForumThemeBuilder extends MainBuilder {

  createEntity() {
    return new Theme()
  }

  build(data) {
    super.build(data)
    this.entity.id = data.id
    this.entity.name = data.title
  }
}

export class ForumCommentBuilder extends MainBuilder {

  createEntity() {
    return new Comment()
  }

  build(data) {
    data.created_by = data.user
    super.build(data)
    this.entity.id = data.id
    this.entity.comment = data.comment
  }
}
