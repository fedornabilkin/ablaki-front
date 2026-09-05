// Универсальные модальные окна на базе Naive UI (замена нативных alert/confirm).
// Глобальные API проброшены в window компонентом NaiveApiRegistrar.vue,
// который смонтирован внутри провайдеров Naive UI в App.vue.

const DEFAULT_ERROR = 'Что-то сломалось';

/**
 * Информационная/ошибочная модалка с одной кнопкой (вместо alert).
 * @param {string} content текст сообщения
 * @param {object} [opts] { title, type: 'error'|'warning'|'info'|'success' }
 */
export function showAlert(content = DEFAULT_ERROR, opts = {}) {
  const { title = 'Сообщение', type = 'error' } = opts;
  if (window.$dialog && typeof window.$dialog[type] === 'function') {
    window.$dialog[type]({ title, content, positiveText: 'ОК' });
  } else if (window.$message) {
    window.$message[type] ? window.$message[type](content) : window.$message.error(content);
  } else {
    // провайдеры ещё не смонтированы — мягкий фолбэк без alert()
    console.error(`[${title}] ${content}`);
  }
}

/**
 * Модалка-подтверждение с двумя кнопками (вместо confirm).
 * @returns {Promise<boolean>} true — подтверждено, false — отменено
 */
export function showConfirm(content, opts = {}) {
  const {
    title = 'Подтверждение',
    positiveText = 'ОК',
    negativeText = 'Отмена',
    type = 'warning',
  } = opts;
  return new Promise((resolve) => {
    if (window.$dialog && typeof window.$dialog[type] === 'function') {
      window.$dialog[type]({
        title,
        content,
        positiveText,
        negativeText,
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false),
      });
    } else {
      console.error(`[${title}] ${content}`);
      resolve(false);
    }
  });
}
