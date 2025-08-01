<script setup>
import {ref} from "@vue/reactivity";

const props = defineProps(['filters'])
const emit = defineEmits(['changeFilter'])
const filters = props.filters

const focusedFilter = ref(null)
const setFocusedFilter = (filter) => focusedFilter.value = filter

const queryAutocomplete = async (query, cb) => {
  if (
      !focusedFilter.value
      || !focusedFilter.value.isAutocomplete()
      || focusedFilter.value.remoteSearch === undefined
  ) return

  if (query.length > 2) {
    let params = focusedFilter.value.autocompleteParams(query)
    cb(await focusedFilter.value.remoteSearch(params))
  }
  else if (query.length === 0) {
    cb([])
    focusedFilter.value.clear()
  }
}

const selectAutocomplete = (item, filter) => {
  filter.setValue(item.id)
  changeFilter(filter)
}

const clearValue = (filter) => {
  filter.clear()
  setFocusedFilter(filter)
  changeFilter(filter)
}

const changeValue = (value, filter, fake=false) => {
  if (!fake) {
    filter.setValue(value)
  }
  setFocusedFilter(filter)
  changeFilter(filter)
}

const changeFilter = (filter) => {
  if (!filter.isActive()) return

  const debounce = filter.createDebounce()
  debounce(() => {
    emit('changeFilter')
    filter.updateRoute()
  })
}
</script>

<template lang="pug">
  div
    el-button-group
      .filter(v-for="(item, name) in filters")
        el-input.meta-button.icon-large(
          v-if="item.isCharField()"
          size="large"
          v-model="item.value"
          :placeholder="item.label"
          @focus="setFocusedFilter(item)"
          @input="changeValue($event, item)"
          @clear="clearValue(item)"
          clearable
        )

        el-autocomplete(
          v-else-if="item.isAutocomplete()"
          size="large"
          v-model="item.query"
          :placeholder="item.label"
          value-key="name"
          :debounce="item.debouncer()"
          :fetch-suggestions="queryAutocomplete"
          @focus="setFocusedFilter(item)"
          @select="selectAutocomplete($event, item)"
          @clear="clearValue(item)"
          clearable
        )

        el-select(
          v-else-if="item.isDropdown()"
          size="large"
          v-model='item.query'
          :placeholder="item.label"
          @focus="setFocusedFilter(item)"
          @change="changeValue($event, item)"
          @clear="clearValue(item)"
          clearable
        )
          el-option(
            v-for='opt in item.getDropdownItems()'
            :key='opt.value'
            :label='opt.label'
            :value='opt.value'
          )

        el-date-picker.date-range(
          v-else-if="item.isDateRange()"
          size="large"
          v-model="item.value"
          type="daterange"
          :start-placeholder="item.labelStart"
          :end-placeholder="item.labelEnd"
          range-separator=""
          @focus="setFocusedFilter(item)"
          @change="changeValue($event, item, true)"
          clearable
        )

</template>

<style scoped lang="scss">

</style>