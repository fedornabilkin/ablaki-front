import MainBuilder from "../mainBuilder";
import Saper from "@/entities/games/saper";

export class SaperBuilder extends MainBuilder {
  createEntity() {
    return new Saper()
  }

  getSaper() {
    return this.getEntity()
  }

  build(data) {
    data.created_by = {id: data.user_id, username: data.username}
    data.updated_by = {id: data.user_gamer, username: data.username_gamer}

    super.build(data)

    this.entity.id = data.id
    this.entity.kon = data.kon

  }

}