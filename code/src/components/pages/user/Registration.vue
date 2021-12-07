<template>
	<div class="container">
		<h1>Регистрация</h1>
		<el-alert
			title="Получив халявные кредиты и Кг, потрать их с максимальной выгодой, а не как закалялась сталь."
			type="info"
			:closable="false"
		/>

		<el-form
			v-loading="isLoading"
			:model="form"
			ref="formRef"
			:rules="rules"
			label-position="top"
			class="mt-3"
			@submit.prevent="submit"
		>
			<el-form-item label="Логин" prop="username">
				<el-input v-model="form.username"></el-input>
			</el-form-item>
			<el-form-item label="Email" prop="email">
				<el-input v-model="form.email"></el-input>
			</el-form-item>
			<el-form-item label="Пароль" prop="password">
				<el-input type="password" v-model="form.password"></el-input>
			</el-form-item>
			<el-form-item label="Пароль еще раз" prop="passwordRepeat">
				<el-input type="password" v-model="form.passwordRepeat"></el-input>
			</el-form-item>
			<el-form-item label="" prop="rules">
				<el-checkbox v-model="form.rules">Согласен со всем, что вы там понаписали</el-checkbox>
			</el-form-item>

			<el-form-item size="medium">
				<el-button type="primary" native-type="submit" :disabled="!btnEnabled">Регистрация</el-button>
			</el-form-item>
		</el-form>
	</div>
</template>

<script>
import { computed, ref } from "vue";
import { ElNotification } from 'element-plus'
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
	setup() {
		const store = useStore();
		const router = useRouter();

		const formRef = ref();
		const form = ref({
			username: "",
			email: "",
			password: "",
			passwordRepeat: "",
			rules: false,
		});

		const errors = {};

		const isLoading = computed(() => store.getters.authStatus === "loading");

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
					validator: (rule, value, callback) => {
						if (errors.username) {
							callback(new Error(errors?.username));
							errors.username = "";
						} else {
							callback();
						}
					}
				}
			],
			email: [
				{
					required: true,
					type: "email",
					message: "Введите корректный Email",
					trigger: "blur",
				}, {
					message: "Введите Email",
					trigger: "blur",
				}, {
					validator: (rule, value, callback) => {
						if (errors.email) {
							callback(new Error(errors?.email));
							errors.email = "";
						} else {
							callback();
						}
					}
				}
			],
			password: [
				{
					required: true,
					message: "Введите пароль",
					trigger: "blur",
				}, {
					validator: (rule, value, callback) => {
						if (errors.password) {
							callback(new Error(errors?.password));
							errors.password = "";
						} else {
							callback();
						}
					}
				}
			],
			passwordRepeat: [
				{
					required: true,
					message: "Введите пароль повторно",
					trigger: "blur",
				}, {
					validator: (rule, value, callback) => {
						if (value !== form.value.password) {
							callback(new Error('Пароли должны совпадать'));
						} else {
							callback();
						}
					}, 
				}
			],
			rules: [
				{
					required: true
				}, {
					validator: (rule, value, callback) => {
						if (value === false) {
							callback(new Error('С этим придеться согласиться'));
						} else {
							callback();
						}
					}
				}
			]
		};

		const isAuthenticated = computed(() => store.getters.isAuthenticated);
		if (isAuthenticated.value) {
			router.push('/');
		}

		const submit = () => {
			formRef.value.validate(async (valid) => {
				if (valid === true) {
					let username = form.value.username;
					let email = form.value.email;
					let password = form.value.password;

					store.dispatch('registration', {
						username,
						email,
						password,
					}).then((res) => {
						ElNotification({
							title: 'Успешно',
							message: 'Письмо с подтверждением отправлено на Email',
							type: 'success',
						});

						this.$router.push("/");
					}).catch(e => {
						for (const errorKey in e.errors) {
							errors[errorKey] = e.errors[errorKey]
						}

						console.log("errors", errors);
						formRef.value.validate();
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

<style>

</style>