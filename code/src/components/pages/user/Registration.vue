<template>
    <div>

        <h1>Регистрация лучшего в мире пользователя</h1>

        <div class="row">
            <div class="col-xs-12 col-sm-10 col-md-9">
                <div class="alert alert-info">
                    <span class="hidden-xs-down">
                        Получив халявные кредиты и Кг, потрать их с максимальной выгодой, а не как закалялась сталь.
                    </span>
                </div>
            </div>
            <div class="col-xs-12 col-sm-10 col-md-9">

                <b-form @submit.prevent="registration">
                    <b-form-group>
                        <label for="login" class="control-label">
                            Логин
                        </label>
                        <b-form-input
                                id="login"
                                v-model="user.login"
                                type="text"
                                required
                        />
                    </b-form-group>

                    <b-form-group>
                        <label for="email" class="control-label">
                            Email
                        </label>
                        <b-form-input
                                id="email"
                                v-model="user.email"
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
                                v-model="user.password"
                                required
                        />
                    </b-form-group>

                    <div class="form-check disabled col-xs-12 col-sm-6">
                        <label class="form-check-label">
                            <input type="checkbox" class="form-check-input" name="rules" checked="" disabled="">
                            Бесполезная галочка
                        </label>
                    </div>

                    <b-button
                            v-if="!loading"
                            type="submit"
                            variant="primary"
                    >
                        Жмак и в аккаунт
                    </b-button>
                    <span v-else
                          class="loading-text">Выполняется запрос...</span>
                </b-form>

                <form action="/users/registration" name="login" method="post">
                    <div class="row">
                        <div class="form-group col-xs-12 col-sm-6">
                            <label>Логин <span class="resp-login text-danger">Занят</span></label>
                            <div class="input-group">
                                <div class="input-group-addon">
                                    <span class="fa fa-fw fa-user" aria-hidden="true"></span>
                                </div>
                                <input class="form-control" name="login" type="text" value="" data-type="ajax" data-url="/check/unique" data-alert=".resp-login" data-regexp="[\S]{3,25}" required="">
                            </div>
                        </div>
                        <div class="form-group col-xs-12 col-sm-6 has-danger">
                            <label>Email <span class="resp-email"></span></label>
                            <div class="input-group">
                                <div class="input-group-addon">
                                    <span class="fa fa-fw fa-at" aria-hidden="true"></span>
                                </div>
                                <input class="form-control" name="mail" type="email" value="" data-type="ajax" data-url="/check/unique" data-alert=".resp-email" data-regexp=".@[\w-]{2,}\.[\w-]{2,}" required="">
                            </div>
                        </div>
                        <div class="form-group col-xs-12 col-sm-6">
                            <label>Пароль</label>
                            <div class="input-group">
                                <div class="input-group-addon">
                                    <span class="fa fa-fw fa-lock" aria-hidden="true"></span>
                                </div>
                                <input class="form-control" name="password" type="password" required="">
                            </div>
                        </div>
                        <div class="form-group col-xs-12 col-sm-6">
                            <label>Пароль еще раз</label>
                            <div class="input-group">
                                <div class="input-group-addon">
                                    <span class="fa fa-fw fa-lock" aria-hidden="true"></span>
                                </div>
                                <input class="form-control" name="repeat-password" type="password" required="">
                            </div>
                        </div>
                        <div class="form-check disabled col-xs-12 col-sm-6">
                            <label class="form-check-label">
                                <input type="checkbox" class="form-check-input" name="rules" checked="" disabled="">
                                Бесполезная галочка
                            </label>
                        </div>
                        <div class="form-group col-xs-12">
                            <button class="btn btn-primary" type="submit">Жмак и в аккаунт</button>
                        </div>
                    </div>
                </form>    </div>
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
            if (this.$store.getters.isLoggedIn) {
                this.$router.push('/');
            }
        },
        data() {
            return {
                loading: false,
                user: {
                    login: '',
                    email: '',
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
            registration: function () {
                this.loader(true);
                let login = this.user.login;
                let email = this.user.email;
                let password = this.user.password;
                if (this.$store != null) {
                    this.$store.dispatch('registration', {login, password, email, loader: this.loader})
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

</style>
