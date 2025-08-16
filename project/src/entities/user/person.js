import MainEntity from "@/entities/mainEntity.js";

export class Person extends MainEntity {
  id = 0
  rating = 0
  refovod = 0
  bonus = {
    rating: {count:0, updated_at: 0},
    balance: {count:0, updated_at: 0},
  }

  getRating() {
    return this.rating
  }

  getBonusRatingCount() {
    return this.bonus.rating.count
  }

  isRefovod() {
    return this.refovod > 0
  }

  getDescription() {
    return this.description ?? 'Пользователь не добавил дополнительной информации'
  }
}