<template>
	<div class="container">
        <h1>Вход</h1>

        <el-form
			v-loading="isLoading"
			:model="auth"
			ref="formRef"
			:rules="validationRules"
			label-position="top"
			class="mt-3"
			@submit.prevent="login"
		>
            <el-form-item label="Логин" prop="login">
				<el-input v-model="auth.login" name="email"></el-input>
			</el-form-item>

            <el-form-item label="Пароль" prop="password">
				<el-input v-model="auth.password" type="password"></el-input>
			</el-form-item>

            <el-form-item size="medium">
				<el-button type="primary" native-type="submit" :disabled="disabled">Войти</el-button>
			</el-form-item>
        </el-form>
	</div>
</template>

<script>
export default {
	name: "Login",
	created() {
		if (this.$store.getters.isAuthenticated) {
			this.$router.push("/");
		}
	},
	data() {
		return {
            isLoading: false,
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
        }
    },
	methods: {
		login: function () {

			let login = this.auth.login;
			let password = this.auth.password;

            this.isLoading = true;
			this.$store
				.dispatch("login", {
					login,
					password,
				})
				.then((res) => {
					ElNotification({
						title: 'Ура',
						message: 'Вы вошли в аккаунт',
						type: 'success',
					});
					this.isLoading = false;
                    this.$router.push("/");
				})
				.catch((err) => {
                    this.isLoading = false;
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

<style scoped>
</style>
