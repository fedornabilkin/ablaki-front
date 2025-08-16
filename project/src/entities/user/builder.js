import MainBuilder from "../mainBuilder";
import UserActivity from "@/entities/user/userActivity";
import User from "@/entities/user/user";
import {Person} from "@/entities/user/person.js";

export class UserBuilder extends MainBuilder {

  createEntity() {
    return new User()
  }

  build(data) {
    super.build(data)
    this.entity.id = data.id
    this.entity.username = data.username
  }

  createForWall(data) {
    super.build(data)
    this.entity.id = data.id
    this.entity.username = data.username

    this.entity.person = this.createPerson(data.person)
  }

  createPerson(data) {
    const builder = new PersonBuilder()
    builder.build(data)
    return builder.getEntity()
  }

  getUser() {
    return this.getEntity()
  }
}


export class PersonBuilder extends MainBuilder {
  createEntity() {
    return new Person()
  }

  build(data) {
    super.build(data)
    this.entity.id = data.id
    this.entity.rating = data.rating
    this.entity.refovod = data.refovod
    this.entity.bonus.balance.count = data.bonus_count
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

  createForWall(data) {
    this.builder.createForWall(data)
  }
}
