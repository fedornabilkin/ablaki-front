<template>
  <n-spin :show="isLoading"><div></div></n-spin>
</template>

<script>
import {useRoute} from "vue-router";
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
    }

    const route = useRoute();

    const key = route.params.key;

    this.$store
        .dispatch("auth/loginKey", {key})
        .then((res) => {
          this.notification.success({
            title: 'Ура',
            content: 'Вы вошли в аккаунт',
            duration: 4500,
          });
          this.$router.push("/");
        })
        .catch((err) => {
          if (err.errors !== undefined) {
            for (let resKey in err.errors) {
              this.errors.text[resKey] = err.errors[resKey];
            }

            this.$refs.formRef.validate();
          }
        })
        .finally(() => {
          this.isLoading = false;
        });
  },
}
</script>

<style scoped>

</style>
