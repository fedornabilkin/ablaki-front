<template>
	<div>
        <h2 class="col-12 text-center">Вход</h2>
            <form @submit.prevent="login">

                <input
                    id="login"
                    v-model="auth.login"
                    type="text"
                    required
                />
                <input
                    id="password"
                    type="password"
                    v-model="auth.password"
                    required
                />

                <button
                    type="submit"
                    variant="primary"
                >
                    Войти
                </button>

                <div>{{response.text}}</div>
	
            </form>
	</div>
</template>

<script>
export default {
	name: "Login",
	created() {
		if (this.$store.getters.isAuthenticated) {
			// this.$router.push("/");
		}
	},
	data() {
		return {
			auth: {
				login: "",
				password: "",
			},
			errors: {
				text: {
					login: "",
					password: "",
				},
			},
			response: {
				text: "",
			},
		};
	},
	methods: {
		login: function () {

			let login = this.auth.login;
			let password = this.auth.password;

			this.$store
				.dispatch("login", {
					login,
					password,
				})
				.then((resp) => {

					if (resp.data.errors !== undefined) {
						for (let respKey in resp.data.errors) {
							this.errors.text[respKey] =
								resp.data.errors[respKey];
						}
						return;
					}

					// this.$store
					// 	.dispatch("menuClear")
					// 	.then(() => this.$router.push("/"));
				})
				.catch((err) => this.errorAuth(err));
		},
		errorAuth: function (err) {
			this.response.text = err;
		},
	},
};
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
