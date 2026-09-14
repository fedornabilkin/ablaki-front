import { MainBuilder } from '../MainBuilder';
import { Person } from '../entities/Person';
export class PersonBuilder extends MainBuilder<Person> {
  protected createEntity(): Person { return new Person(); }
  build(data: Record<string, unknown>): this { super.build(data); this.entity.rating = Number(data.rating) || 0; this.entity.balance = Number(data.balance) || 0; this.entity.credit = Number(data.credit) || 0; this.entity.description = String(data.description ?? ''); this.entity.forumCreditsSent = Number(data.forum_credits_sent) || 0; return this; }
}
