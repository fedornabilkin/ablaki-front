<script setup>
import {computed} from 'vue';
import {useChatStore} from '@/store/chat';

const chat = useChatStore();

const users = computed(() => chat.currentTyping);

const label = computed(() => {
    const names = users.value.map(u => u.username || u.name || 'Кто-то').filter(Boolean);
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} печатает`;
    if (names.length === 2) return `${names[0]} и ${names[1]} печатают`;
    return `${names[0]}, ${names[1]} и ещё ${names.length - 2} печатают`;
});
</script>

<template>
    <transition name="fade">
        <div v-if="users.length > 0" class="typing">
            <div class="dots">
                <span></span><span></span><span></span>
            </div>
            <div class="typing-label">{{ label }}</div>
        </div>
    </transition>
</template>

<style lang="scss" scoped>
.typing {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.85rem;
    color: var(--text-muted);
    font-size: 0.8rem;
    background: var(--bg-base);
}

.dots {
    display: inline-flex;
    gap: 0.2rem;

    span {
        width: 0.4rem;
        height: 0.4rem;
        background: var(--text-muted);
        border-radius: 50%;
        animation: bounce 1.2s infinite ease-in-out;
    }
    span:nth-child(2) { animation-delay: 0.15s; }
    span:nth-child(3) { animation-delay: 0.3s; }
}

@keyframes bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
