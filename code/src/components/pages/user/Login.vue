<template lang="pug">
div.container
  h1 Вход

  el-form(
    v-loading="isLoading"
    :model="auth"
    ref="formRef"
    :rules="validationRules"
    label-position="top"
    class="mt-3"
    @submit.prevent="login"
    size="large"
  )
    el-form-item(label="Логин" prop="login")
      el-input( v-model="auth.login" name="email" autocomplete="on")

    el-form-item(label="Пароль" prop="password")
      el-input( v-model="auth.password" type="password")

    el-form-item
      el-button( type="primary" native-type="submit" :disabled="disabled") Войти

</template>

<script>
import { ElNotification } from 'element-plus';
export default {
    name: "Login",
    created() {
        if (this.$store.getters['auth/isAuthenticated']) {
            this.$router.push("/");
        }
    },
    data() {
        return {
            // isLoading: false,
            auth: {
                login: "",
                password: "",
            },
            validationRules: {
                login: [{
                    required: true,
                    message: "Введите логин",
                    trigger: "blur",
                }, {
                    validator: (rule, value, callback) => {
                        if (this.errors.text.login) {
                            callback(new Error(this.errors.text.login));
                            this.errors.text.login = "";
                        } else {
                            callback();
                        }
                    },
                }],
                password: [
                    {
                        required: true,
                        message: "Введите пароль",
                        trigger: "blur",
                    }, {
                        validator: (rule, value, callback) => {
                            if (this.errors.text.password) {
                                callback(new Error(this.errors.text.password));
                                this.errors.text.password = "";
                            } else {
                                callback();
                            }
                        },
                    }
                ]
            },
            errors: {
                text: {
                    login: "",
                    password: "",
                },
            }
        };
    },
    computed: {
        disabled() {
            return !(this.auth.login && this.auth.password);
        },
        isLoading() {
            return this.$store.getters['auth/authStatus'] === "loading"
        }
    },
    methods: {
        login: function () {

            let login = this.auth.login;
            let password = this.auth.password;

            this.$store
                .dispatch("auth/login", {
                    login,
                    password,
                })
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
        }
    },
};
</script>

<style lang="scss" scoped>
::v-deep .el-form--label-top {
    .el-form-item__label {
        padding: 0;
    }
}
</style>
