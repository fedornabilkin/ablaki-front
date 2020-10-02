<template>
    <div>
        <b-navbar toggleable="lg" type="dark" variant="info">
            <b-navbar-brand href="/">Ablaki</b-navbar-brand>

            <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

            <b-collapse id="nav-collapse" is-nav>
                <b-navbar-nav>
                    <b-nav-item href="/forum" title="Форум">
                        <font-awesome-icon icon="comments"/>
                        <span class="hidden-sm-down">Форум</span>
                    </b-nav-item>
                    <b-nav-item href="/wiki" title="Помощь">
                        <font-awesome-icon icon="question-circle"/>
                        <span class="hidden-sm-down">Wiki</span>
                    </b-nav-item>
                    <b-nav-item v-if="!user.username" href="/users/registration" title="Регистрация">
                        <font-awesome-icon icon="plus"/>
                        <span class="hidden-sm-down">Регистрация</span>
                    </b-nav-item>
                </b-navbar-nav>

                <!-- Right aligned nav items -->
                <b-navbar-nav class="ml-auto">

                    <b-nav-item-dropdown text="Stat" right>
                        <b-dropdown-item href="/statistic" title="Статистика">
                            <span class="fa fa-fw fa-bar-chart" aria-hidden="true"></span>
                            <span>Статистика</span>
                        </b-dropdown-item>
                    </b-nav-item-dropdown>

                    <b-nav-item v-if="!user.username" href="/users/login" title="login">
                        Войти
                    </b-nav-item>

                    <b-nav-item-dropdown right>
                        <!-- Using 'button-content' slot -->
                        <template v-slot:button-content>
                            <em>{{ user.username ? user.username : '/-/-/' }}</em>
                        </template>

                        <b-dropdown-item v-for="item in menuList" :key="item.url" :href="item.url">
                            <font-awesome-icon :icon="item.icon"/>
                            {{ item.anchor }}
                        </b-dropdown-item>

                        <b-dropdown-item href="/exchange" title="Биржа кредитов">
                            <span class="fa fa-fw fa-refresh" aria-hidden="true"></span>
                            <span>Биржа кредитов</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/transfer" title="Перевод кредитов">
                            <span class="fa fa-fw fa-exchange" aria-hidden="true"></span>
                            <span>Перевод кредитов</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/balance" title="История баланса">
                            <span class="fa fa-fw fa-line-chart" aria-hidden="true"></span>
                            <span>История баланса</span>
                        </b-dropdown-item>
                        <b-dropdown-divider></b-dropdown-divider>
                        <b-dropdown-item href="/users/referals" title="Рефералы">
                            <span class="fa fa-fw fa-users" aria-hidden="true"></span>
                            <span>Рефералы <span class="referals-nav tag tag-pill tag-success"></span></span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/users/logout" title="Выход">
                            <span class="fa fa-fw fa-sign-out" aria-hidden="true"></span>
                            <span>Выход</span>
                        </b-dropdown-item>

                        <b-dropdown-divider></b-dropdown-divider>
                        <b-dropdown-item href="/forum/lastcomments" title="Последние комментарии">
                            <span class="fa fa-fw fa-comments-o" aria-hidden="true"></span>
                            <span>Комментарии</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/payments/zakaz" title="Выплаты">
                            <span class="fa fa-fw fa-usd text-danger" aria-hidden="true"></span>
                            <span>Выплаты</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/payments" title="Настройки">
                            <span class="fa fa-fw fa-usd text-success" aria-hidden="true"></span>
                            <span>Платежи</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/users" title="Пользователи">
                            <span class="fa fa-fw fa-users" aria-hidden="true"></span>
                            <span>Пользователи</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/slider" title="Слайды">
                            <span class="fa fa-fw fa-sliders" aria-hidden="true"></span>
                            <span>Слайды</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/todo" title="Задачи">
                            <span class="fa fa-fw fa-tasks" aria-hidden="true"></span>
                            <span>Задачи</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/link" title="Битые ссылки">
                            <span class="fa fa-fw fa-external-link" aria-hidden="true"></span>
                            <span>Битые ссылки</span>
                        </b-dropdown-item>
                        <b-dropdown-item href="/fact" title="Факты о сайте">
                            <span class="fa fa-fw fa-exclamation-circle" aria-hidden="true"></span>
                            <span>Факты о сайте</span>
                        </b-dropdown-item>
                    </b-nav-item-dropdown>
                </b-navbar-nav>
            </b-collapse>
        </b-navbar>
    </div>
</template>

<script>
    export default {
        name: "NavBar",
        props: {
            user: {type: Object},
            menuList: {type: Array},
        },
        data: function () {
            return {

            }
        },
        computed: {
            foobar: function () {
                return true;
            },
        },
        mounted() {

        },
        methods: {
        },
    }
</script>

<style scoped>

</style>
