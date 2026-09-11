import { MainEntity } from '../MainEntity';
import type { User } from './User';
export class ForumComment extends MainEntity { themeId = 0; comment = ''; user: User | null = null; giftCount = 0; }
