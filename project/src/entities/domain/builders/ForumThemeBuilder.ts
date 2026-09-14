import { MainBuilder } from '../MainBuilder';
import { ForumTheme } from '../entities/ForumTheme';
import { UserBuilder } from './UserBuilder';
export class ForumThemeBuilder extends MainBuilder<ForumTheme> {
  protected createEntity(): ForumTheme { return new ForumTheme(); }
  build(data: Record<string, unknown>): this { super.build(data); this.entity.title = String(data.title ?? ''); this.entity.commentCount = Number(data.comment_count) || 0; this.entity.lastCommentUsername = String(data.last_comment_username ?? ''); this.entity.view = Number(data.view) || 0; if (data.user && typeof data.user === 'object') this.entity.user = new UserBuilder().build(data.user as Record<string, unknown>).getEntity(); return this; }
}
