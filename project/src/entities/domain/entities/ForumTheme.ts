import { MainEntity } from '../MainEntity';
import type { User } from './User';
export class ForumTheme extends MainEntity { title = ''; user: User | null = null; firstCommentUser: User | null = null; lastCommentUsername = ''; commentCount = 0; view = 0; }
