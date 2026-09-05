<template>
  <div class="container login-page">
    <h1>Вход</h1>

    <n-alert
      v-if="serverError"
      type="error"
      :show-icon="true"
      :closable="true"
      class="mt-3"
      @close="serverError = ''"
    >
      {{ serverError }}
    </n-alert>

    <n-spin :show="isLoading">
      <n-form
        :model="auth"
        ref="formRef"
        :rules="validationRules"
        label-placement="top"
        class="mt-3"
        size="large"
        @submit.prevent="onSubmit"
      >
        <n-form-item label="Логин" path="login">
          <n-input
            v-model:value="auth.login"
            name="email"
            autocomplete="username"
            placeholder="Логин"
            @keydown.enter.prevent="onSubmit"
          />
        </n-form-item>

        <n-form-item label="Пароль" path="password">
          <n-input
            v-model:value="auth.password"
            type="password"
            show-password-on="click"
            autocomplete="current-password"
            placeholder="Пароль"
            @keydown.enter.prevent="onSubmit"
          />
        </n-form-item>

        <n-form-item>
          <n-button
            type="primary"
            attr-type="submit"
            :loading="isLoading"
            :disabled="disabled"
            block
          >
            Войти
          </n-button>
        </n-form-item>
      </n-form>
    </n-spin>
  </div>
</template>

<script>
import {
  NSpin,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NAlert,
  useNotification,
} from 'naive-ui';

export default {
  name: 'Login',
  components: {NSpin, NForm, NFormItem, NInput, NButton, NAlert},
  setup() {
    return {notification: useNotification()};
  },
  created() {
    if (this.$store.getters['auth/isAuthenticated']) {
      this.$router.push('/');
    }
  },
  data() {
    return {
      auth: {login: '', password: ''},
      serverError: '',
      submitting: false,
      validationRules: {
        login: [{required: true, message: 'Введите логин', trigger: ['blur']}],
        password: [{required: true, message: 'Введите пароль', trigger: ['blur']}],
      },
    };
  },
  computed: {
    disabled() {
      return !this.auth.login || !this.auth.password || this.isLoading || this.submitting;
    },
    isLoading() {
      return this.$store.getters['auth/authStatus'] === 'loading';
    },
  },
  methods: {
    onSubmit() {
      if (this.submitting) return;
      this.submitting = true;
      this.serverError = '';
      this.$refs.formRef
        .validate()
        .then(() => this.doLogin())
        .catch(() => {})
        .finally(() => { this.submitting = false; });
    },
    doLogin() {
      const {login, password} = this.auth;
      return this.$store
        .dispatch('auth/login', {login, password})
        .then(() => {
          this.notification.success({
            title: 'Ура',
            content: 'Вы вошли в аккаунт',
            duration: 4500,
          });
          const redirect = this.$route.query.redirect;
          this.$router.replace(typeof redirect === 'string' && /^\/(?![\/\\])/.test(redirect) ? redirect : '/');
        })
        .catch((err) => {
          this.serverError = this.extractError(err);
        });
    },
    extractError(err) {
      if (!err) return 'Не удалось войти. Попробуйте ещё раз.';
      if (typeof err === 'string') return err;
      if (err.errors && typeof err.errors === 'object') {
        const messages = Object.values(err.errors).filter(Boolean);
        if (messages.length) return messages.join(' ');
      }
      if (err.message) return err.message;
      return 'Не удалось войти. Проверьте логин и пароль.';
    },
  },
};
</script>

<style lang="scss" scoped>
.login-page {
  max-width: 26rem;
  margin: 0 auto;
  padding-top: 1.5rem;
}
</style>
