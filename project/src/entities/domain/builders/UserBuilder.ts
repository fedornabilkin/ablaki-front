import { MainBuilder } from '../MainBuilder';
import { User } from '../entities/User';
import { PersonBuilder } from './PersonBuilder';
export class UserBuilder extends MainBuilder<User> {
  protected createEntity(): User { return new User(); }
  build(data: Record<string, unknown>): this { super.build(data); this.entity.username = String(data.username ?? ''); this.entity.isOnline = data.is_online === true; if (data.person && typeof data.person === 'object') this.entity.person = new PersonBuilder().build(data.person as Record<string, unknown>).getEntity(); return this; }
}
