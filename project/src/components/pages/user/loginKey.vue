<template>
  <div v-loading="isLoading"></div>
</template>

<script>
import {useRoute} from "vue-router";
import {ElNotification} from "element-plus";

export default {
  name: "login-key",
  created() {
    if (this.$store.getters['auth/isAuthenticated']) {
      this.$router.push("/");
    }

    const route = useRoute();

    const isLoading = true;
    const key = route.params.key;

    this.$store
        .dispatch("auth/loginKey", {key})
        .then((res) => {
          ElNotification({
            title: 'Ура',
            message: 'Вы вошли в аккаунт',
            type: 'success',
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
        });
  },
}
</script>

<style scoped>

</style>
