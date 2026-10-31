// Compatibility facade for the account menu; the command has one transport implementation.
import { dailyRewardCommand } from './portal';
export const bonusApi = { every: () => dailyRewardCommand('bonus') };
