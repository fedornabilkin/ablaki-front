<template>
  <n-spin :show="isLoading"><div></div></n-spin>
</template>

<script>
import {NSpin, useNotification} from "naive-ui";

export default {
  name: "login-key",
  components: {NSpin},
  setup() {
    return {
      notification: useNotification(),
    };
  },
  data() {
    return {
      isLoading: true,
    };
  },
  created() {
    if (this.$store.getters['auth/isAuthenticated']) {
      this.$router.push("/");
      return;
    }

    const key = this.$route.params.key;

    this.$store
        .dispatch("auth/loginKey", {key})
        .then((res) => {
          this.notification.success({
            title: 'Ура',
            content: 'Вы вошли в аккаунт',
            duration: 4500,
          });
          this.$router.replace("/");
        })
        .catch((err) => {
          this.notification.error({
            title: 'Не удалось войти',
            content: 'Ссылка недействительна или сервер недоступен. Войдите с логином и паролем.',
            duration: 4500,
          });
          this.$router.replace('/users/login');
        })
        .finally(() => {
          this.isLoading = false;
        });
  },
}
</script>

<style scoped>

</style>
