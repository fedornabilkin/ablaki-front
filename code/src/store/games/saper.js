import {defineStore} from 'pinia'
import {SaperBuilder} from "@/entities/games/builder";
import {UserBuilder} from "@/entities/user/builder";
import axios from "axios";
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

    async getItems() {
      if (this.items.length < 1) {
        await this.getItemsRemote()
      }

      return this.items
    },

    getItemById(id) {
      if (!this.items[id]) {
        const item = this.getItemRemote(id)
        const builder = this.createBuilder()
        builder.build(item)
        this.selectItem(builder.getEntity())
      }

      return this.item
    },

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
      let items = []
      await saper.get()
        .then(resp => {
          items = resp

          const builder = this.createBuilder()
          builder.createCollection(items)
          this.fetchItems(builder.getCollection())

          // console.log("then items: ", items)
          // console.log("store items: ", this.items)
        })

      // return [
      //   {
      //     "id": 26,
      //     "user_id": 2,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1734375401
      //   },
      //   {
      //     "id": 25,
      //     "user_id": 2,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1732705140
      //   },
      //   {
      //     "id": 24,
      //     "user_id": 2,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1732705109
      //   },
      //   {
      //     "id": 23,
      //     "user_id": 2,
      //     "user_gamer": 0,
      //     "kon": 3,
      //     "created_at": 1732705046
      //   },
      //   {
      //     "id": 22,
      //     "user_id": 2,
      //     "user_gamer": 0,
      //     "kon": 5,
      //     "created_at": 1732704844
      //   },
      //   {
      //     "id": 21,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -100,
      //     "created_at": 1639389951
      //   },
      //   {
      //     "id": 20,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -100,
      //     "created_at": 1639389951
      //   },
      //   {
      //     "id": 19,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -100,
      //     "created_at": 1639389951
      //   },
      //   {
      //     "id": 18,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -1,
      //     "created_at": 1639389615
      //   },
      //   {
      //     "id": 17,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -1,
      //     "created_at": 1639389615
      //   },
      //   {
      //     "id": 16,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -1,
      //     "created_at": 1639389615
      //   },
      //   {
      //     "id": 15,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1639389610
      //   },
      //   {
      //     "id": 14,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1639389610
      //   },
      //   {
      //     "id": 13,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1639389610
      //   },
      //   {
      //     "id": 12,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -1,
      //     "created_at": 1639385782
      //   },
      //   {
      //     "id": 11,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -1,
      //     "created_at": 1639385782
      //   },
      //   {
      //     "id": 10,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": -1,
      //     "created_at": 1639385782
      //   },
      //   {
      //     "id": 9,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1639385769
      //   },
      //   {
      //     "id": 8,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1639385769
      //   },
      //   {
      //     "id": 7,
      //     "user_id": 6,
      //     "user_gamer": 0,
      //     "kon": 1,
      //     "created_at": 1639385769
      //   }
      // ]
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