<template>
    <div>
        Logout
    </div>
</template>

<script>
    export default {
        name: "Logout",
        mounted(){
            this.logout();
        },
        methods: {
            logout: function () {
                this.$store.dispatch('auth/logout')
                    .then(() => this.$router.push('/'))
                    .catch(() => this.$router.push('/'))
            },
        },
    }
</script>

<style scoped></style>
