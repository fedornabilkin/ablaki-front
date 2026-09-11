import { MainBuilder } from '../MainBuilder';
import { ForumComment } from '../entities/ForumComment';
import { UserBuilder } from './UserBuilder';
export class ForumCommentBuilder extends MainBuilder<ForumComment> {
  protected createEntity(): ForumComment { return new ForumComment(); }
  build(data: Record<string, unknown>): this { super.build(data); this.entity.themeId = Number(data.theme_id) || 0; this.entity.comment = String(data.comment ?? ''); this.entity.giftCount = Number(data.gift_count) || 0; if (data.user && typeof data.user === 'object') this.entity.user = new UserBuilder().build(data.user as Record<string, unknown>).getEntity(); return this; }
}
