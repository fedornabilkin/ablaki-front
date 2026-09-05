import MainEntity from "@/entities/mainEntity";

export default class Recipe extends MainEntity {
  id = 0
  name = ''
  description = ''
  output = null
  output_qty = 1
  ingredients = []
  cost_credits = 0
  time_seconds = 0
  category = ''

  getId() {
    return this.id
  }

  getName() {
    return this.name || `#${this.id}`
  }

  /**
   * @param {Map<number, number>} inventoryMap — item.id → qty
   * @param {number} balance — баланс кредитов
   * @returns {{ok: boolean, reason: string|null}}
   */
  canCraft(inventoryMap, balance = 0) {
    for (const ing of this.ingredients) {
      const have = inventoryMap.get(ing.item?.id) ?? 0
      if (have < ing.qty) {
        return { ok: false, reason: `не хватает ${ing.item?.name || 'материала'}` }
      }
    }
    if (this.cost_credits > 0 && balance < this.cost_credits) {
      return { ok: false, reason: 'не хватает кредитов' }
    }
    return { ok: true, reason: null }
  }
}
