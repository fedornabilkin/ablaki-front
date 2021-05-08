<template>
  <div>
    <b-alert show variant="danger">
      <h1 class="col-12 text-center">{{ getStatus() }}</h1>
      <h2 class="col-12 text-center">{{ getMessage() }}</h2>
    </b-alert>
  </div>
</template>

<script>
export default {
  name: "PageNotFound",
  props: {
    exception: {
      type: Object,
    },
  },
  data: function () {
    return {
      name: 'Not Found',
      message: 'Страница не найдена',
      code: 0,
      status: 404
    }
  },
  methods: {
    getName: function () {
      return this.exception.name || this.name;
    },
    getStatus: function () {
      return this.exception.status || this.status;
    },
    getMessage: function () {
      return this.exception.message || this.message;
    }
  }
}
</script>
