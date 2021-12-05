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
        </form>
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
			auth: {
				login: "",
				password: "",
			},
			errors: {
				text: {
					login: "",
					password: "",
				},
			}
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
				.then((res) => {
                    console.log("router push");
                    this.$router.push("/")
					// this.$store
					// 	.dispatch("menuClear")
					// 	.then(() => this.$router.push("/"));
				})
				.catch((err) => {
                    if (err.errors !== undefined) {
						for (let resKey in err.errors) {
							this.errors.text[resKey] = err.errors[resKey];
						}
						return;
					}
                });
		}
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
