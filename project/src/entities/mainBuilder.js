import moment from "moment/moment";
import MainEntity from "@/entities/mainEntity";

export default class MainBuilder {
  entity
  collection = []
  userBuilder = null

  constructor(config = {}) {
    Object.assign(this, config)
    this.reset()
  }

  createEntity() {
    return new MainEntity()
  }

  reset() {
    this.entity = this.createEntity()
  }

  getEntity() {
    const result = this.entity
    this.reset()
    return result
  }

  build(data) {
    if (data.created_at) {
      this.createDate(data.created_at, 'created_at')
    }
    if (data.updated_at) {
      this.createDate(data.updated_at, 'updated_at')
    }

    if (data.created_by && this.userBuilder) {
      this.entity.created_by = this.createUser(data.created_by)
    }
    if (data.updated_by && this.userBuilder) {
      this.entity.updated_by = this.createUser(data.updated_by)
    }
  }

  baseBuild(builder, data) {
    builder.build(data)
    return builder.getEntity()
  }

  createCollection(data) {
    this.collection = []
    for (let item in data) {
      this.build(data[item])
      this.collection.push(this.getEntity())
    }
  }

  getCollection() {
    const collection = this.collection
    this.collection = []
    return collection
  }

  createDate(data, field, format = 'DD.MM.YYYY HH:mm:ss') {
    this.entity[field] = data
    this.entity[field + "_format"] = moment.unix(data).format(format)
  }

  createUser(data) {
    this.userBuilder.build(data)
    return this.userBuilder.getUser()
  }
}