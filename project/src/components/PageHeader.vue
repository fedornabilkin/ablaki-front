<script setup>
import { computed } from '@vue/reactivity';
import { useRoute } from 'vue-router';
import { NButton } from 'naive-ui';

const props = defineProps(['pageTitle', 'extraLinks'])

const route = useRoute();
const path = computed(() => route.path)

const isCurrentLink = (link) => {
  return link === path.value;
};

</script>

<template lang="pug">
  div.page-header
    div.container
      div.header-wrapper
        div.header-top
          div.title {{props.pageTitle}}

        div.extra
          div.extra-tabs
            div.actions
              slot(name="actions")
            router-link(:to="extraLink.link" v-for="extraLink in props.extraLinks")
              n-button(
                :class="['btn-tab', {'active': isCurrentLink(extraLink.link)}]"
                :type="extraLink.type"
              )
                template(#icon v-if="extraLink.icon")
                  font-awesome-icon(:icon='extraLink.icon')
                span.px-1(class="d-none d-sm-block") {{extraLink.title}}
</template>

<style lang="scss" scoped>
.page-header {
    position: relative;
    background: linear-gradient(109.12deg, var(--bg-surface) -.72%, var(--bg-surface-2));
    border-bottom: 0.0625rem solid var(--border);

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        box-shadow: 0 0.125rem 0.375rem -0.125rem rgba(0, 0, 0, 0.45);
        z-index: 0;
    }

    .container {
        position: relative;
        z-index: 1;

        .header-wrapper {
            padding: 1rem 0;
            
            .header-top {
                display: flex;
                justify-content: space-between;
                margin-bottom: .5rem;

                .title {
                    font-size: 1.8rem;
                    font-weight: 600;
                }

                .actions {
                    display: flex;
                    align-items: center;
                }
            }

            .extra {
                display: flex;

                .extra-tabs {
                    background-color: var(--bg-base);
                    display: flex;
                    overflow: auto;

                    .btn-tab {
                        //border-radius: 8px;
                        margin-left: unset;
                        background-color: transparent;
                        color: var(--text-muted);
                        border: none;

                        &.active {
                            background: var(--bg-surface);
                            color: var(--primary);
                            box-shadow: rgba(0, 0, 0, 0.5) 0 0.0625rem 0.1875rem;
                        }
                    }
                }
            }
        }
    }
}
</style>