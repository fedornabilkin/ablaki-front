import MainBuilder from "../mainBuilder";
import Item from "@/entities/craft/item";
import Recipe from "@/entities/craft/recipe";

export class ItemBuilder extends MainBuilder {

  createEntity() {
    return new Item()
  }

  build(data) {
    super.build(data)
    this.entity.id = data.id
    this.entity.code = data.code ?? ''
    this.entity.name = data.name ?? ''
    this.entity.description = data.description ?? ''
    this.entity.icon = data.icon ?? 'fa fa-cube'
    this.entity.category = data.category ?? 'material'
    this.entity.rarity = data.rarity ?? 'common'
    this.entity.price_credits = Number(data.price_credits ?? 0)
  }
}

export class RecipeBuilder extends MainBuilder {

  constructor(config = {}) {
    super(config)
    this.itemBuilder = config.itemBuilder || new ItemBuilder()
  }

  createEntity() {
    return new Recipe()
  }

  build(data) {
    super.build(data)
    this.entity.id = data.id
    this.entity.name = data.name ?? ''
    this.entity.description = data.description ?? ''
    this.entity.output_qty = data.output_qty ?? 1
    this.entity.cost_credits = Number(data.cost_credits ?? 0)
    this.entity.time_seconds = data.time_seconds ?? 0
    this.entity.category = data.category ?? ''
    if (data.output) {
      this.itemBuilder.build(data.output)
      this.entity.output = this.itemBuilder.getEntity()
    }
    this.entity.ingredients = (data.ingredients || []).map(ing => {
      const builder = new ItemBuilder()
      builder.build(ing.item)
      return { item: builder.getEntity(), qty: ing.qty }
    })
  }
}
