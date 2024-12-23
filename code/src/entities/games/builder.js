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
    super.build(data)

    this.entity.id = data.id
    this.entity.kon = data.kon

    this.entity.created_by = this.createUser({id: data.user_id})
    this.entity.updated_by = this.createUser({id: data.user_gamer})
  }

}