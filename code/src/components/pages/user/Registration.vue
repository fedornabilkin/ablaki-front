<template>
    <div>

        <h1>Регистрация лучшего в мире пользователя</h1>

        <div class="row" :style="{ opacity: loading ? '0.5' : '1' }">
          <div class="col-xs-12 col-sm-10 col-md-9">
            <div class="alert alert-info">
                    <span class="hidden-xs-down">
                        Получив халявные кредиты и Кг, потрать их с максимальной выгодой, а не как закалялась сталь.
                    </span>
            </div>
          </div>
          <div class="col-xs-12 col-sm-10 col-md-9">

            <b-form @submit.prevent="registration">
              <b-form-group
                  class="position-relative"
                  label="Логин"
                  label-for="username"
                  :description="valid.text.username">
                <b-form-input
                    id="username"
                    v-model="user.username"
                    type="text"
                    required
                />
              </b-form-group>

              <b-form-group
                  class="position-relative"
                  label="Email"
                  label-for="email"
                  :description="valid.text.email">
                <b-form-input
                    id="email"
                    v-model="user.email"
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
                    v-model="user.password"
                    required
                />
              </b-form-group>

              <b-form-group
                  class="position-relative"
                  v-bind:class="{ 'text-danger': !validate()}"
                  label="Пароль еще раз"
                  label-for="password-repeat"
                  :description="valid.text.password_repeat">
                <b-form-input
                    id="password-repeat"
                    type="password"
                    v-model="user.password_repeat"
                    required
                />
              </b-form-group>

              <div class="form-check disabled col-xs-12 col-sm-6">
                <label class="form-check-label">
                  <input type="checkbox" class="form-check-input" name="rules" checked="" disabled="">
                  Бесполезная галочка
                </label>
              </div>
              <b-form-group
                  class="position-relative"
                  :description="response.text">
                <b-button
                    type="submit"
                    variant="primary" v-bind:disabled="!submitEnable">
                  Жмак и в аккаунт
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

          </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: "Registration",
        head: {
            title: {
                inner: 'Регистрация'
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
              submitEnable: true,
              user: {
                username: '',
                email: '',
                password: '',
                password_repeat: ''
              },
              valid: {
                text: {
                  username: '',
                  email: '',
                  password: '',
                  password_repeat: ''
                }
              },
              response: {
                text: '',
                temp: {}
              },
            }
        },
        methods: {
          loader: function (loading) {
            this.loading = loading;
            this.submitEnable = !loading;
          },
          validClear: function () {
            for (const textKey in this.valid.text) {
              this.valid.text[textKey] = '';
            }
          },
          setResponse: function (text) {
            this.response.text = text;
          },
          validate: function () {
            let flag = this.user.password === this.user.password_repeat;
            if (!flag) {
              this.submitEnable = false;
              this.valid.text.password_repeat = 'Пароли не совпадают';
            } else {
              this.submitEnable = true;
              this.valid.text.password_repeat = '';
            }
            return flag;
          },
          registration: function () {
            if (this.$store === null) {
              return;
            }

            this.validClear();
            this.loader(true);
            this.setResponse('');

            let username = this.user.username;
            let email = this.user.email;
            let password = this.user.password;
            this.$store.dispatch('registration', {
              username,
              password,
              email,
              submit: {loader: this.loader, response: this.response}
            })
                .then(resp => {
                  if (resp.data.errors !== undefined) {
                    for (let respKey in resp.data.errors) {
                      this.valid.text[respKey] = resp.data.errors[respKey];
                    }
                    return;
                  }

                  this.$store.dispatch('menuClear')
                      .then(() => this.$router.push('/'));
                })
                .catch(err => this.errorAuth(err))

          },
            errorAuth: function (err) {
              console.log(err);
              // this.response.text = err;
              // this.loader(false);
            },
        }
    }
</script>

<style scoped>
</style>
