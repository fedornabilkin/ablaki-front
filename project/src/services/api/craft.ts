// Backend master 63855e2 declares URL rules, but has no v1 craft controllers.
// Keep account operations unavailable until an actual JSON contract exists.
// The local workshop uses services/craft/workshop and never this adapter.
export const craftUnavailableMessage = 'Крафт аккаунта пока недоступен. Можно попробовать локальную мастерскую — её предметы и кредиты сохраняются отдельно в этом браузере.';
export const shopUnavailableMessage = 'Покупка материалов для аккаунта пока недоступна. Магазин локальной мастерской работает с отдельными игровыми кредитами.';

export class CraftUnavailableError extends Error {
    readonly code = 'CRAFT_UNAVAILABLE';
    constructor() {
        super(craftUnavailableMessage);
        this.name = 'CraftUnavailableError';
    }
}

async function unavailable(..._args: unknown[]): Promise<never> {
    throw new CraftUnavailableError();
}

export const itemApi = {index: unavailable};
export const recipeApi = {index: unavailable, view: unavailable};
export const inventoryApi = {my: unavailable};
export const craftApi = {execute: unavailable};
export const shopApi = {list: unavailable, buy: unavailable};
