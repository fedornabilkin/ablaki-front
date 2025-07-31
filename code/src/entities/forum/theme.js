import MainEntity from "@/entities/mainEntity";

export default class Theme extends MainEntity{
  id = 0
  name = ''
  created_at = 0

  getId() {
    return this.id
  }

  getName() {
    return this.name || this.id
  }
}