import MainBuilder from "../mainBuilder";
import UserActivity from "@/entities/user/userActivity";
import User from "@/entities/user/user";

export class UserBuilder extends MainBuilder {

  createEntity() {
    return new User()
  }

  build(data) {
    super.build(data)
    this.entity.id = data.id
    this.entity.username = data.username
  }

  createForName(data) {
    this.entity.id = data.id
    this.entity.name = data.username
    this.entity.fullName = data.full_name
  }

  getUser() {
    return this.getEntity()
  }
}


export class UserActivityBuilder extends MainBuilder {

  createEntity() {
    return new UserActivity()
  }

  getUserActivity() {
    return this.getEntity()
  }

  build(data) {
    super.build(data)

    this.entity.id = data.id
    this.entity.action = data.action
    this.entity.entityId = data.entity_id
    this.entity.entityType = data.entity_type
    this.entity.newData = data.new_data
    this.entity.oldData = data.old_data

    if (data.description !== undefined && data.description !== '') {
      this.entity.description.text = data.description
    }

    this.entity.applyFormatter()
  }
}


export class Director {
  builder

  setBuilder(builder) {
    this.builder = builder
  }

  buildFromCurrent(data) {
    this.builder.build(data)
  }

  buildGroupBuilder(data) {
    this.builder.createForName(data)
  }
}
