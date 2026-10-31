// Compatibility facade for the account menu; the command has one transport implementation.
import { dailyRewardCommand } from './portal';
export const ratingApi = { every: () => dailyRewardCommand('rating') };
