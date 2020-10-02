<template>
    <div>
        <div
                class="row justify-content-md-center"
                :style="{ opacity: loading ? '0.5' : '1' }"
        >
            <b-col md="3">
                <b-card>
                    <h2 class="col-12 text-center">Вход</h2>
                    <b-form @submit.prevent="login">
                        <b-form-group>
                            <label for="login" class="control-label">
                                Логин
                            </label>
                            <b-form-input
                                    id="login"
                                    v-model="auth.login"
                                    type="text"
                                    required
                            />
                        </b-form-group>

                        <b-form-group
                                class="position-relative"
                                label="Пароль"
                                label-for="password"
                                :description="response.infoText"
                        >
                            <b-form-input
                                    id="password"
                                    type="password"
                                    v-model="auth.password"
                                    required
                            />
                        </b-form-group>
                        <b-button
                                v-if="!loading"
                                type="submit"
                                variant="primary"
                        >
                            Войти
                        </b-button>
                        <span v-else
                              class="loading-text">Выполняется вход...</span>
                    </b-form>
                    <div
                            v-if="loading"
                            class="spinner-border loading"
                            role="status"
                    />
                </b-card>
            </b-col>
        </div>
    </div>
</template>

<script>
    export default {
        name: "Login",
        head: {
            title: {
                inner: 'Авторизация'
            }
        },
        created() {
            if (this.$store.getters.isLoggedIn) {
                this.$router.push('/');
            }
        },
        data() {
            return {
                loading: false,
                auth: {
                    login: '',
                    password: ''
                },
                response: {
                    infoText: ''
                },
            }
        },
        methods: {
            loader: function (loading) {
                this.loading = loading;
                this.response.infoText = '';
            },
            login: function () {
                this.loader(true);
                let login = this.auth.login;
                let password = this.auth.password;
                if (this.$store != null) {
                    this.$store.dispatch('login', {login, password, loader: this.loader})
                        .then(() => {
                            this.loader(false);
                            this.$store.dispatch('menuClear')
                                .then(
                                    () => this.$router.push('/')
                                );
                        })
                        .catch(err => {
                            this.errorAuth(err)
                        })
                }
            },
            errorAuth: function (err) {
                this.response.infoText = err;
                this.loader(false);
            },
        }
    }
</script>

<style scoped>
    .loading {
        position: absolute;
        top: 48%;
        left: 46%;
    }

    form {
        & button {
          margin-top: 24px;
          width: 100%;
        }

        & .loading-text {
          width: 100%;
          display: block;
          margin-top: 32px;
          padding: 11px 0;
        }
    }

    .card {
        & .card-body {
          padding: 2.25rem;
        }
    }
</style>
