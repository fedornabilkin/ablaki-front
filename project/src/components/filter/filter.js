import moment from "moment/moment";

class Filter {

  name = ''
  label = ''
  type = ''
  value = ''
  minLengthValue = 3

  // autocomplete
  query = ''
  remoteSearch = undefined
  debounce = 500

  // staff
  active = true
  data = {}
  typeCharField = 'charField'
  typeAutocomplete = 'autocomplete'
  typeDropdown = 'dropdown'
  typeDateRange = 'dateRange'

  // router
  _router = null
  _route = null

  constructor(config = {}) {
    Object.assign(this, config)
  }

  setRouter(router, route) {
    this._router = router
    this._route = route

    this.setValueFromRoute()
    this.updateRoute()
  }

  setValueFromRoute() {
    this.setValue(this._route?.query[this.name])
    this.restoreQuery()
  }

  restoreQuery() {}

  updateRoute() {
    let options = {query: {}}

    this.updateOptionsRoute(options, this._router.currentRoute.query)

    const data = this.prepareData()
    if (!data.length) {
      this.clearOptionsRoute(options)
    }

    this.updateOptionsRoute(options, data)

    this._router.push(options)
  }

  updateOptionsRoute(options, data) {
    for (let key in data) {
      options.query[key] = data[key]
    }
  }

  clearOptionsRoute(options) {
    delete options.query[this.name]
  }

  setValue(value) {
    this.value = value
  }

  isAutocomplete() {
    return this.type === this.typeAutocomplete
  }

  isDropdown() {
    return this.type === this.typeDropdown
  }

  isCharField() {
    return this.type === this.typeCharField
  }

  isDateRange() {
    return this.type === this.typeDateRange
  }

  isActive() {
    if (!this.isEmptyInput() && this.value?.length < this.minLengthValue) return false
    return this.active
  }

  debouncer() {
    return this.debounce
  }

  isEmptyInput() {
    return this.value === ''
  }

  isEmptyValue() {
    return !this.value
  }

  clear() {
    this.value = ''
    this.query = ''
  }

  prepareData() {
    this.data[this.name] = this.value
    return this.isActive() && !this.isEmptyValue() ? this.data : {}
  }

  apiParams(filters) {
    let data = {}
    filters.forEach(function (item, i, arr) {
      Object.assign(data, item.prepareData())
    });
    return data
  }

  createDebounce() {
    let timeout = null
    return function (callback, delay) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        callback()
      }, delay || 500)
    }
  }
}

export class AutocompleteFilter extends Filter {

  type = 'autocomplete'
  searchFieldName = 'name'
  minLengthValue = 1

  constructor(config = {}) {
    super(config);
    Object.assign(this, config)
  }

  restoreQuery() {
    if (!this.isEmptyValue()) {
      const query = this.remoteSearch({id: this.value})
        .then((res) => {
          this.query = res[0].name
        })
    }
  }

  isEmptyInput() {
    return this.query === ''
  }

  autocompleteParams(value) {
    const params = {}
    params[this.searchFieldName] = value
    return params
  }
}

export class DropdownFilter extends Filter {

  type = 'dropdown'
  minLengthValue = 1
  dropdownItems = [] // [{value:'123', label:'Moscow'}]

  constructor(config = {}) {
    super(config);
    Object.assign(this, config)
  }

  setValue(value) {
    super.setValue(value)
    this.query = value
  }

  isEmptyInput() {
    return this.query === ''
  }

  setDropdownItem(value, label) {
    this.dropdownItems.push({value: value, label: label})
  }

  setDropdownItems (map) {
    for (let i of map) {
      this.setDropdownItem(i[0], i[1])
    }
  }

  getDropdownItems() {
    return this.dropdownItems
  }
}

export class DateRangeFilter extends Filter {

  name = 'created_range'
  labelStart = 'Дата'
  labelEnd = 'создания'
  value = []
  type = 'dateRange'
  minLengthValue = 1
  postfix_before = "_before"
  postfix_after = "_after"

  constructor(config = {}) {
    super(config);
    Object.assign(this, config)
  }

  setValueFromRoute() {
    this.value[0] = this._route?.query[this.name + this.postfix_after]
    this.value[1] = this._route?.query[this.name + this.postfix_before]
  }

  clearOptionsRoute(options) {
    delete options.query[this.name + this.postfix_after]
    delete options.query[this.name + this.postfix_before]
  }

  clear() {
    this.value = []
  }

  prepareData() {
    this.data = {}
    if (this.value && this.value[0] && this.value[1]) {
      this.data[this.name + this.postfix_after] = moment(this.value[0]).format('YYYY-MM-DD')
      this.data[this.name + this.postfix_before] = moment(this.value[1]).format('YYYY-MM-DD')
    }
    return this.isActive() && !this.isEmptyValue() ? this.data : {}
  }
}

export class SimpleFilter extends Filter {

  minLengthValue = 1

  constructor(config = {}) {
    super(config);
    Object.assign(this, config)
  }
}

export class OrderingFilter extends Filter {

  minLengthValue = 1
  name = 'ordering'

  constructor(config = {}) {
    super(config);
    Object.assign(this, config)
  }

  setValueOrdering(data) {
    if (data === undefined || !data.prop) return
    let value = data.prop

    if (data.order === 'descending') {
      value = '-' + value
    }
    this.setValue(value)
    this.updateRoute()
  }
}

export class NameFilter extends Filter {

  name = 'name'
  label = 'Название'
  type = 'charField'

  constructor(config = {}) {
    super(config);
    Object.assign(this, config)
  }
}

export class AuthorFilter extends AutocompleteFilter {

  name = 'created_by'
  label = 'Автор'

  constructor(config = {}) {
    super(config);
    Object.assign(this, config)
  }
}
