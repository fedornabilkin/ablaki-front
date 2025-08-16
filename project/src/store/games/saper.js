import {defineStore} from 'pinia'
import {SaperBuilder} from "@/entities/games/builder";
import {UserBuilder} from "@/entities/user/builder";
import {saper} from "@/services/api/games/saper";

const defaultState = {
  items: [],
  item: null,
  requestParam: () => ({})
}

export const gameSaperStore = defineStore('gameSaperStore', {
  state: () => ({...defaultState}),

  actions: {
    reset: () => {
      Object.assign(this, defaultState)
    },

    clear() {
      this.items = []
      this.item = null
    },

    createBuilder() {
      return new SaperBuilder({userBuilder: new UserBuilder()})
    },

    // async getItems() {
    //   if (this.items.length < 1) {
    //     await this.getItemsRemote()
    //   }
    //
    //   return this.items
    // },
    //
    // getItemById(id) {
    //   if (!this.items[id]) {
    //     const item = this.getItemRemote(id)
    //     const builder = this.createBuilder()
    //     builder.build(item)
    //     this.selectItem(builder.getEntity())
    //   }
    //
    //   return this.item
    // },

    fetchItems(items) {
      let mappedItems = [];
      items.map((item) => {
        mappedItems[item.id] = item;
      });
      this.items = mappedItems;
    },

    selectItem(item) {
      this.item = item
    },

    async getItemRemote(id) {
      try {
        const item = await this.getItemsRemote().find(item => item.id === id)
        this.selectItem(item)
        return this.item
      } catch (error) {
        console.error('Error fetching item:', error)
        return null
      }
    },

    async getItemsRemote() {
      await saper.get()
        .then(response => {

          const builder = this.createBuilder()
          builder.createCollection(response)
          this.fetchItems(builder.getCollection())
        })

    },

    getCollection: function () {
      saper.get()
        .then(resp => {
          return resp
        })

      // axios.get('http://94.250.251.94:3180/v1/saper?sort=-id')
      //   .then(resp => {
      //     // this.gameList = resp.data;
      //     const builder = new SaperBuilder({userBuilder: new UserBuilder()})
      //     // const builder = new SaperBuilder()
      //     builder.createCollection(resp.data)
      //     this.collection = builder.getCollection()
      //   })
      //   .catch(err => {
      //     if (err.response) {
      //       this.exception = err.response.data;
      //     }
      //   })
    },

  },

  getters: {}
})