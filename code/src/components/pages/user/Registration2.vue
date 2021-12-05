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
		>
			<el-form-item label="Логин" prop="name">
				<el-input v-model="form.name"></el-input>
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
				<el-button type="primary" @click="submit">Регистрация</el-button>
			</el-form-item>
		</el-form>
	</div>
</template>

<script>
import { ref } from "vue";
import { ElNotification } from 'element-plus'

export default {
	setup() {
		const formRef = ref();
		const form = ref({
			name: "",
			email: "",
			password: "",
			passwordRepeat: "",
			rules: false,
		});
		const rules = ref({
			name: [
				{
					required: true,
					message: "Введите логин",
					trigger: "blur",
				},{
					min: 3,
					max: 100,
					message: "Логин должен быть не менее 3х символов",
					trigger: "blur",
				},
			],
			email: [
				{
					required: true,
					type: "email",
					message: "Введите корректный Email",
					trigger: "blur",
				},{
					message: "Введите Email",
					trigger: "blur",
				},
			],
			password: [
				{
					required: true,
					message: "Введите пароль",
					trigger: "blur",
				},
			],
			passwordRepeat: [
				{
					required: true,
					message: "Введите пароль повторно",
					trigger: "blur",
				},{
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
		});

		const isLoading = ref(false);

		const submit = () => {
			formRef.value.validate(async (valid) => {
				if (valid === true) {
					isLoading.value = true;

					setTimeout(() => {
						isLoading.value = false;

						ElNotification({
							title: 'Успешно',
							message: 'Письмо с подтверждением отправлено на Email',
							type: 'success',
						});
					}, 1500)
				}
			});
		};
		return {
			formRef,
			form,
			rules,
			isLoading,
			submit,
		};
	},
};
</script>

<style>

</style>