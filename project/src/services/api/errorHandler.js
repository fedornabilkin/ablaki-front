import { showAlert } from "../dialog.js";

export const errorHandler = (error, handlers = {}) => {
    const response = error?.response;
    if (!response) {
        showAlert('Не удалось связаться с сервером. Проверьте соединение и повторите попытку.');
        return;
    }
    const message = String(response.data?.message ?? '');
    if (typeof handlers === 'function') {
        handlers(response.status >= 500 ? 'Ошибка сервера. Повторите попытку позже.' : message);
        return;
    }
    const handler = handlers?.[message] ?? handlers?.[String(response.status)];
    if (typeof handler === 'function') handler(message);
    else showAlert(response.status === 401 ? 'Войдите в аккаунт заново.' : 'Не удалось выполнить действие. Повторите попытку.');
};
