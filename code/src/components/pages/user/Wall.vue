<script>
import { computed, ref } from "@vue/reactivity";
import { useStore } from "vuex";
import { getWall } from "../../../services/api";
export default {
	async setup() {
		const store = useStore();
		const userData = computed(() => store.getters.user);

		const userWall = ref(await getWall(userData.value.username));

		return {
			userData,
			userWall,
		};
	},
};
</script>

<template>
    <div>Пользователь: {{ userData.username }}</div>
    <div>Rating: {{ userData.person.rating }}</div>
    <div>Refovod: {{ userData.person.refovod }}</div>
</template>