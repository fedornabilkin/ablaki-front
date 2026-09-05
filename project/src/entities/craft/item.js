import MainEntity from "@/entities/mainEntity";

export default class Item extends MainEntity {
  id = 0
  code = ''
  name = ''
  description = ''
  icon = 'fa fa-cube'
  category = 'material'
  rarity = 'common'
  price_credits = 0

  getId() {
    return this.id
  }

  getName() {
    return this.name || this.code || `#${this.id}`
  }

  getIcon() {
    return this.icon || 'fa fa-cube'
  }

  isMaterial() {
    return this.category === 'material'
  }

  isProduct() {
    return this.category === 'product'
  }

  isConsumable() {
    return this.category === 'consumable'
  }
}
