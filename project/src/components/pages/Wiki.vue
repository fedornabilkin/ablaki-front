<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import SectionNav from '@/components/SectionNav.vue';
import { NCard } from 'naive-ui';
</script>
<template lang="pug">
page-header(page-title="Справка")
.container.page.stack
  n-card(title="Мир и мастерская")
    p На странице объекта доступны карта, вещи и казна. Предмет можно перенести нажатием на него и затем на свободную ячейку. В мастерской выберите рецепт и количество партий: материалы и стоимость появятся перед изготовлением.
    section-nav(label="Мир и мастерская" :items="[{to:'/world',label:'Мир',icon:'globe'},{to:'/world/workspace/recipes',label:'Рецепты',icon:'scroll'},{to:'/world/character',label:'Персонаж',icon:'user'}]")
  n-card(title="Игры и общение")
    p Правила доступны в верхнем углу страницы каждой игры. На форуме можно читать обсуждения и создавать темы, а в истории — посмотреть операции своего счёта.
    section-nav(label="Игры и общение" :items="[{to:'/games',label:'Игры',icon:'dice'},{to:'/forum',label:'Форум',icon:'comments'},{to:'/balance',label:'История',icon:'clock'}]")
</template>
