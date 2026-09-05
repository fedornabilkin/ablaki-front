<script setup>
import {ref} from "@vue/reactivity";
import {
  NButtonGroup,
  NInput,
  NAutoComplete,
  NSelect,
  NDatePicker,
} from 'naive-ui';

const props = defineProps(['filters'])
const emit = defineEmits(['changeFilter'])
const filters = props.filters

const focusedFilter = ref(null)
const setFocusedFilter = (filter) => focusedFilter.value = filter

const autoOptions = ref([])

const queryAutocomplete = async (query) => {
  if (
      !focusedFilter.value
      || !focusedFilter.value.isAutocomplete()
      || focusedFilter.value.remoteSearch === undefined
  ) return

  if (query.length > 2) {
    let params = focusedFilter.value.autocompleteParams(query)
    const items = await focusedFilter.value.remoteSearch(params)
    autoOptions.value = (items || []).map(it => ({
      label: it.name,
      value: it.id,
      raw: it,
    }))
  }
  else if (query.length === 0) {
    autoOptions.value = []
    focusedFilter.value.clear()
  }
}

const selectAutocomplete = (value, filter) => {
  filter.setValue(value)
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
    n-button-group
      .filter(v-for="(item, name) in filters")
        n-input.meta-button.icon-large(
          v-if="item.isCharField()"
          size="large"
          v-model:value="item.value"
          :placeholder="item.label"
          @focus="setFocusedFilter(item)"
          @update:value="(v) => changeValue(v, item)"
          @clear="clearValue(item)"
          clearable
        )

        n-auto-complete(
          v-else-if="item.isAutocomplete()"
          size="large"
          v-model:value="item.query"
          :placeholder="item.label"
          :options="autoOptions"
          @focus="setFocusedFilter(item)"
          @update:value="queryAutocomplete"
          @select="(v) => selectAutocomplete(v, item)"
          clearable
        )

        n-select(
          v-else-if="item.isDropdown()"
          size="large"
          v-model:value='item.query'
          :placeholder="item.label"
          :options="item.getDropdownItems()"
          @focus="setFocusedFilter(item)"
          @update:value="(v) => changeValue(v, item)"
          @clear="clearValue(item)"
          clearable
        )

        n-date-picker.date-range(
          v-else-if="item.isDateRange()"
          size="large"
          v-model:value="item.value"
          type="daterange"
          :start-placeholder="item.labelStart"
          :end-placeholder="item.labelEnd"
          @focus="setFocusedFilter(item)"
          @update:value="(v) => changeValue(v, item, true)"
          clearable
        )

</template>

<style scoped lang="scss">

</style>
