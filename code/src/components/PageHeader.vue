<template lang="pug">
  div.page-header
    div.container
      div.header-wrapper
        div.header-top
          div.title {{pageTitle}}

        div.extra
          div.extra-tabs
            div.actions
              slot(name="actions")
            router-link(:to="extraLink.link" v-for="extraLink in extraLinks")
              el-button(
                  :class="['btn-tab', {'active': isCurrentLink(extraLink.link)}]"
                  type="default"
              ) {{extraLink.title}}
</template>

<script>
import { computed } from '@vue/reactivity';
import { useRoute } from 'vue-router';
export default {
    props: {
        pageTitle: {
            type: String,
            default: "",
        },
        extraLinks: {
            type: Array,
            default: () => [],
        }
    },
    setup() {
        const route = useRoute();
        const path = computed(() => route.path)
        
        const isCurrentLink = (link) => {
            return link === path.value;
        };

        return {
            isCurrentLink,
        }
    },
}
</script>

<style lang="scss" scoped>
@import "bootstrap/scss/functions";
@import "bootstrap/scss/variables";
@import "bootstrap/scss/mixins";

.page-header {
    position: relative;
    background: linear-gradient(109.12deg,#f5f6fa -.72%,#e7f0fe);

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        // background: linear-gradient(180deg, transparent 0%, transparent 90%, #f4f7f8 100%);
        box-shadow: 0 2px 6px -2px rgb(67 95 138 / 7%);
        z-index: 0;
    }

    .container {
        position: relative;
        z-index: 1;

        .header-wrapper {
            padding: 30px 0 38px;
            
            .header-top {
                display: flex;
                justify-content: space-between;
                margin-bottom: .5rem;

                .title {
                    font-size: 2rem;
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
                    padding: 0.25rem;
                    background-color: rgba(30,58,138,.2);
                    border-radius: 0.75rem;
                    display: flex;
                    overflow: auto;

                    @include media-breakpoint-down(sm) {
                        // flex-direction: column;
                    }

                    .btn-tab {
                        //border-radius: 8px;
                        margin-left: unset;
                        background-color: transparent;
                        color: rgb(108, 103, 129);
                        border: none;

                        &.active {
                            background: #fff;
                            box-shadow: #0000002b 0 1px 3px;
                        }
                    }
                }
            }
        }
    }
}
</style>