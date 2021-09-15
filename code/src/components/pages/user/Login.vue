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
                      <b-form-group
                          class="position-relative"
                          label="Логин"
                          label-for="login"
                          :description="valid.text.login">
                        <b-form-input
                            id="login"
                            v-model="auth.login"
                            type="text"
                            required/>
                      </b-form-group>

                      <b-form-group
                          class="position-relative"
                          label="Пароль"
                          label-for="password"
                          :description="valid.text.password">
                        <b-form-input
                            id="password"
                            type="password"
                            v-model="auth.password"
                            required
                        />
                      </b-form-group>
                      <b-form-group
                          class="position-relative"
                          :description="response.text">
                        <b-button
                            v-if="!loading"
                            type="submit"
                            variant="primary">
                          Войти
                        </b-button>
                      </b-form-group>
                      <span v-if="loading"
                            class="loading-text">Выполняется запрос...</span>
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
          if (this.$store.getters.isAuthenticated) {
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
              valid: {
                text: {
                  login: '',
                  password: ''
                }
              },
              response: {
                text: ''
              },
            }
        },
        methods: {
          loader: function (loading) {
            this.loading = loading;
          },
          validClear: function () {
            for (const textKey in this.valid.text) {
              this.valid.text[textKey] = '';
            }
          },
          login: function () {
            if (this.$store === null) {
              return;
            }

            this.validClear();
            this.loader(true);
            let login = this.auth.login;
            let password = this.auth.password;

            this.$store.dispatch('login', {
              login,
              password
            })
                .then((resp) => {
                  this.loader(false);

                  if (resp.data.errors !== undefined) {
                    for (let respKey in resp.data.errors) {
                      this.valid.text[respKey] = resp.data.errors[respKey];
                    }
                    return;
                  }

                  this.$store.dispatch('menuClear')
                      .then(() => this.$router.push('/'));
                })
                .catch((err) => this.errorAuth(err))

          },
            errorAuth: function (err) {
              this.response.text = err;
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
