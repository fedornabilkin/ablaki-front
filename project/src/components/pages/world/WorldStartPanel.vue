<script setup lang="ts">
import WorldCredits from './WorldCredits.vue';
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton } from 'naive-ui';
import { startOverview, build, node as parseNode, type SimpleNode, type Build, type StarterFunding } from '@/services/api/simpleWorld';
import BuildSettingsModal from './modals/BuildSettingsModal.vue';
import { worldError } from '@/services/api/world';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import type { WorldNode } from '@/entities/world/types';
const props = defineProps<{ node: WorldNode; writable: boolean; owner: number; session: number; revision?: number }>();
const emit = defineEmits<{ changed: [] }>();
const home = ref<SimpleNode | null>(null), ready = ref(false), error = ref(''), message = ref('');
const project = ref<Build | null>(null), open = ref(false), projectName = ref('');
const funding = ref<StarterFunding | null>(null), obligation = ref<StarterFunding | null>(null);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.node.id}.onboarding`), computed(() => props.session));
let generation = 0;
watch(() => [props.node.id, props.session], () => { generation++; ready.value = false; home.value = null; open.value = false; error.value = ''; message.value = ''; funding.value = null; obligation.value = null; }, {flush: 'sync'});
watch(() => [props.node.id, props.session, props.revision], async () => {
  const current = ++generation;
  try { const result = await startOverview(props.node.id); if (current === generation) { home.value = result.node; funding.value = result.funding; obligation.value = result.starter_funding; ready.value = true; } }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
}, { immediate: true });
async function act(kind: 'start' | 'retry') {
  const current = generation;
  if (kind === 'start') { project.value = null; projectName.value = 'Стоянка'; open.value = true; }
  const result = kind === 'retry' ? await runner.retry() : await runner.submit('start', { city_id: props.node.id });
  if (!result || current !== generation) return;
  message.value = typeof result.message === 'string' ? result.message : 'Стоянка размещена. Карта обновлена.';
  emit('changed');
  if (result.node && result.build) { home.value = parseNode(result.node); project.value = build(result.build); projectName.value = home.value.name; open.value = true; }
  else if (result.node) home.value = parseNode(result.node);
}
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.world-start(v-if="error || runner.error.value || runner.pending.value || message || (ready && !home) || open || obligation?.status === 'pending'" aria-label="Начало жизни и ресурсы")
  n-alert(closable v-if="error || runner.error.value" type="error" role="alert") {{ error || runner.error.value }}
  n-alert(closable v-if="message" type="success" @close="message = ''")
    p {{ message }}
    router-link(v-if="home" :to="`/world/nodes/${home.id}#map`") Перейти к стоянке →
  n-button(:theme-overrides="worldActionButtonTheme" v-if="runner.pending.value && !runner.busy.value" @click="act('retry')") Повторить запрос
  n-alert(closable v-if="obligation?.status === 'pending'" type="warning") Стартовый бюджет стоянки ожидает финансирования из поселения. Перевод будет выполнен автоматически в порядке очереди, когда пополнят стартовый резерв поселения.
  template(v-if="ready && !home")
    h2 Начало игры
    section.start-availability(v-if="funding" aria-label="Доступность заселения")
      strong Доступно мест со стартовыми средствами: {{ funding.available_places ?? (funding.available ? 1 : 0) }}
      p(v-if="funding.amount_cr") Новому поселенцу: #[world-credits(:value="funding.amount_cr")].
      n-alert(:type="funding.available ? 'success' : 'warning'") {{ funding.message }}
      .start-cities(v-if="node.type !== 'SETTLEMENT'")
        router-link(v-for="city in funding.settlements ?? []" :key="city.node_id" :to="`/world/nodes/${city.node_id}`")
          strong {{ city.name }}
          span {{ city.available_places }} мест · #[world-credits(:value="city.amount_cr")]
    ol.start-steps
      li Выберите поселение и проверьте доступные места со стартовыми средствами.
      li Разместите стоянку и завершите её строительство.
      li Соберите ежедневное сырьё до постройки добычи — после неё соответствующий ресурс исключается из сбора.
      li Обустройте ночлег и разместите костёр. Следите за здоровьем и едой.
      li Исследуйте ячейки, изготовьте инструменты, постройте огород и шахту.
      li Выполняйте задания через кнопку со списком рядом с казной и получайте награды.
    template(v-if="node.type === 'SETTLEMENT'")
      router-link(v-if="funding?.available === false && node.parent_id" :to="`/world/nodes/${node.parent_id}`") Выбрать другое поселение →
      n-button.start-button(:theme-overrides="worldActionButtonTheme" size="small" type="primary" :disabled="!writable || !!runner.pending.value" :loading="runner.busy.value" @click="act('start')") {{ funding?.available === false ? 'Заселиться в очередь' : 'Начать здесь' }}
    p(v-else) Выберите город или деревню, в которых хотите начать.
  build-settings-modal(v-model:show="open" :project="project" :name="projectName" :owner="owner" :session="session" :creating="runner.busy.value" :creation-error="runner.error.value" @saved="emit('changed')")
</template>
<style scoped>
.world-start { display: grid; gap: .75rem; }
.start-availability { display: grid; gap: .6rem; }.start-availability p { margin: 0; }.start-cities { display: grid; gap: .5rem; }.start-cities a { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .4rem; padding: .6rem; border: 1px solid var(--border); border-radius: .5rem; }.start-button { justify-self: start; }
.start-steps { margin: 0; padding-left: 1.4rem; display: grid; gap: .35rem; color: var(--text-muted); }.world-start h2 { margin: 0; }
</style>
