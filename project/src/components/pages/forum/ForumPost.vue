<script setup lang="ts">
import { computed, ref, onMounted, onScopeDispose } from 'vue';
import { useStore } from 'vuex';
import { NAlert, NButton, NTooltip } from 'naive-ui';
import UserAvatar from '@/components/user/UserAvatar.vue';
import BbCode from '@/components/BBCode.vue';
import MessageComposer from '@/components/MessageComposer.vue';
import GiftUsers from './GiftUsers.vue';
import { date, field, mutate, record, errorText, type RecordData } from '@/services/api/portal';
import { useForumDraft, forumDraftKey } from '@/hooks/useForumDraft';
const props = defineProps<{ item: RecordData; giving: boolean }>();
const emit = defineEmits<{ (event: 'give', amount: number): void; (event: 'updated', item: RecordData): void }>();
const store = useStore();
const author = computed(() => props.item.user && typeof props.item.user === 'object' ? props.item.user : null);
const own = computed(() => Number(props.item.user_id) === Number(store.getters['auth/user']?.id));
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 1000); });
let disposed = false;
onScopeDispose(() => { disposed = true; clearInterval(timer); });
const editable = computed(() => own.value && Number(props.item.created_at) * 1000 <= now.value && now.value <= Number(props.item.editable_until ?? Number(props.item.created_at) + 600) * 1000);
const canGive = computed(() => store.getters['auth/isAuthenticated'] && !own.value && props.item.gifted_by_me !== true);
const draft = useForumDraft(computed(() => forumDraftKey(store.getters['auth/user']?.id, 'edit:' + props.item.id)));
const text = draft.text;
const editing = ref(false), saving = ref(false), error = ref('');
function edit() { if (!text.value) text.value = field(props.item.comment); error.value = ''; editing.value = true; }
async function save() {
  if (!editable.value || saving.value || !text.value.trim()) return;
  const revision = store.state.auth.revision;
  const sent = draft.snapshot();
  saving.value = true; error.value = '';
  try {
    const updated = record(await mutate('forum-comment/' + props.item.id, 'patch', { comment: sent.text.trim() }));
    draft.clearSubmitted(sent);
    if (disposed || revision !== store.state.auth.revision) return;
    emit('updated', { ...props.item, ...updated }); editing.value = false;
  } catch (cause) { if (!disposed && revision === store.state.auth.revision) error.value = errorText(cause); }
  finally { saving.value = false; }
}
</script>
<template lang="pug">
.forum-post
  .post-meta
    user-avatar(v-if="author" :user="author")
    span.muted(v-else) Участник №{{ item.user_id }}
    time.muted {{ date(item.created_at) }}
  template(v-if="editing")
    message-composer(:id="'edit-' + item.id" v-model="text" :disabled="saving" :submit-disabled="!editable" submit-label="Сохранить" @submit="save")
    n-alert(v-if="draft.storageError.value" type="warning") {{ draft.storageError.value }}
    n-alert(v-if="!editable" type="warning") Срок редактирования истёк. Текст оставлен в поле, чтобы вы могли его скопировать.
    n-button(text :disabled="saving" @click="editing = false") Отмена
  bb-code(v-else :text="field(item.comment)")
  n-alert(v-if="error" type="error") {{ error }}
  .post-actions
    gift-users(:comment-id="item.id" :count="Number(item.gift_count) || 0")
    .gift-tags(v-if="canGive")
      n-button(v-for="amount in [1, 2, 3]" :key="amount" size="tiny" round secondary :disabled="giving" :aria-label="'Передать автору ' + amount + ' Cr со своего счёта'" @click="emit('give', amount)") +{{ amount }}
      n-tooltip
        template(#trigger)
          n-button(text aria-label="О передаче кредитов" title="Выбранная сумма Cr спишется с вашего счёта и поступит автору. Передать можно один раз.") ⓘ
        | Выбранная сумма Cr спишется с вашего счёта и поступит автору. Передать можно один раз.
    n-button(v-if="editable && !editing" text size="small" aria-label="Редактировать сообщение" title="Редактировать сообщение" @click="edit")
      font-awesome-icon(icon="pencil-alt" aria-hidden="true")
</template>
<style scoped>
.forum-post { display: grid; gap: .75rem; min-width: 0; }
.post-meta, .post-actions, .gift-tags { display: flex; align-items: center; gap: .5rem; }
.post-meta { align-items: flex-start; }
.post-meta time { margin-left: auto; text-align: right; font-size: .8rem; }
.post-actions { flex-wrap: wrap; justify-content: flex-end; }
.gift-tags { gap: .3rem; }
</style>
