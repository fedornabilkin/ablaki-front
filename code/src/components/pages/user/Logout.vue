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
                this.$store.dispatch('logout')
                    .then(() => {
                        this.$router.push('/users/login')
                    })
            },
        },
    }
</script>

<style scoped>

</style>
