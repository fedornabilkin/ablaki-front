<template>
    <div class="container">
        <h1>Регистрация</h1>
        <n-alert
            title="Получив халявные кредиты и Кг, потрать их с максимальной выгодой, а не как закалялась сталь."
            type="info"
            :closable="false"
        />

        <n-spin :show="isLoading">
            <n-form
                :model="form"
                ref="formRef"
                :rules="rules"
                label-placement="top"
                class="mt-3"
                @submit.prevent="submit"
                size="large"
            >
                <n-form-item label="Логин" path="username">
                    <n-input v-model:value="form.username"></n-input>
                </n-form-item>
                <n-form-item label="Email" path="email">
                    <n-input v-model:value="form.email"></n-input>
                </n-form-item>
                <n-form-item label="Пароль" path="password">
                    <n-input type="password" v-model:value="form.password"></n-input>
                </n-form-item>
                <n-form-item label="Пароль еще раз" path="passwordRepeat">
                    <n-input type="password" v-model:value="form.passwordRepeat"></n-input>
                </n-form-item>
                <n-form-item label="" path="rules">
                    <n-checkbox v-model:checked="form.rules" class="rules-checkbox">Согласен со всем, что вы там понаписали</n-checkbox>
                </n-form-item>

                <n-form-item>
                    <n-button type="primary" attr-type="submit" :disabled="!btnEnabled" class="submit-button">Регистрация</n-button>
                </n-form-item>
            </n-form>
        </n-spin>
    </div>
</template>

<script>
import { computed, ref } from "vue";
import {
  NAlert,
  NSpin,
  NForm,
  NFormItem,
  NInput,
  NCheckbox,
  NButton,
  useNotification,
} from 'naive-ui';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
    components: {
        NAlert,
        NSpin,
        NForm,
        NFormItem,
        NInput,
        NCheckbox,
        NButton,
    },
    setup() {
        const store = useStore();
        const router = useRouter();
        const notification = useNotification();

        const formRef = ref();
        const form = ref({
            username: "",
            email: "",
            password: "",
            passwordRepeat: "",
            rules: false,
        });

        const errors = {};

        const isLoading = computed(() => store.getters['auth/authStatus'] === "loading");

        const makeServerErrorValidator = (key) => (rule, value) => {
            if (errors[key]) {
                const msg = errors[key];
                errors[key] = "";
                return new Error(msg);
            }
            return true;
        };

        const rules = {
            username: [
                {
                    required: true,
                    message: "Введите логин",
                    trigger: "blur",
                }, {
                    min: 3,
                    max: 100,
                    message: "Логин должен быть не менее 3х символов",
                    trigger: "blur",
                }, {
                    validator: makeServerErrorValidator('username'),
                    trigger: ["blur", "input"],
                }
            ],
            email: [
                {
                    required: true,
                    type: "email",
                    message: "Введите корректный Email",
                    trigger: "blur",
                }, {
                    validator: makeServerErrorValidator('email'),
                    trigger: ["blur", "input"],
                }
            ],
            password: [
                {
                    required: true,
                    message: "Введите пароль",
                    trigger: "blur",
                }, {
                    validator: makeServerErrorValidator('password'),
                    trigger: ["blur", "input"],
                }
            ],
            passwordRepeat: [
                {
                    required: true,
                    message: "Введите пароль повторно",
                    trigger: "blur",
                }, {
                    validator: (rule, value) => {
                        if (value !== form.value.password) {
                            return new Error('Пароли должны совпадать');
                        }
                        return true;
                    },
                    trigger: ["blur", "input"],
                }
            ],
            rules: [
                {
                    validator: (rule, value) => {
                        if (value === false) {
                            return new Error('С этим придеться согласиться');
                        }
                        return true;
                    },
                    trigger: ["blur", "change"],
                }
            ]
        };

        const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);
        if (isAuthenticated.value) {
            router.push('/');
        }

        const submit = () => {
            formRef.value.validate((errs) => {
                if (!errs) {
                    let username = form.value.username;
                    let email = form.value.email;
                    let password = form.value.password;

                    store.dispatch('auth/registration', {
                        username,
                        email,
                        password,
                    }).then((res) => {
                        notification.success({
                            title: 'Успешно',
                            content: 'Письмо с подтверждением отправлено на Email',
                            duration: 4500,
                        });

                        router.push("/");
                    }).catch(e => {
                        for (const errorKey in e.errors) {
                            errors[errorKey] = e.errors[errorKey]
                        }

                        console.log("errors", errors);
                        formRef.value.validate(() => {});
                    })
                }
            });
        };

        const btnEnabled = computed(() => form.value.username && form.value.email && form.value.password && form.value.passwordRepeat && form.value.rules);

        return {
            formRef,
            form,
            rules,
            isLoading,
            btnEnabled,
            submit,
        };
    },
};
</script>

<style lang="scss" scoped>
.rules-checkbox {
    height: auto;
    margin: 0.5rem 0 0;
}

.submit-button {
    margin-top: .5rem;
}
</style>
