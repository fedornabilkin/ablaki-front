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

<template>
    <div class="page-header">
        <div class="container">
            <div class="header-wrapper">
                <div class="header-top">
                    <div class="title">{{pageTitle}}</div>
                    <div class="actions">
                        <slot name="actions" />
                    </div>
                </div>

                <div class="extra">

                    <div class="extra-tabs">
                        <router-link :to="extraLink.link" v-for="extraLink in extraLinks">
                            <el-button
                                :class="['btn-tab', {'active': isCurrentLink(extraLink.link)}]"
                                type="default"
                                size="large"
                                >{{extraLink.title}}</el-button
                            >
                        </router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.page-header {
    background: linear-gradient(109.12deg,#f5f6fa -.72%,#e7f0fe);

    .container {

        .header-wrapper {
            padding: 100px 0 38px;
            
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

            .extra-tabs {
                padding: 0.25rem;
                background-color: rgba(30,58,138,.2);
                border-radius: 0.75rem;
                display: flex;

                .btn-tab {
                    border-radius: 8px;
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
</style>