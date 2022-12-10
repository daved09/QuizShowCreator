import Vue from 'vue'
import Vuex from 'vuex'
import axios from "axios"

Vue.use(Vuex)

const API_ROUTES = {
  HELLO: '/api/hello'
}

export default new Vuex.Store({
  state: {
    msg: "",
    error: undefined
  },
  getters: {
  },
  mutations: {
    setMessage(state, message){
      state.msg = message
    },
    setError(state, error){
      state.error = error
    }
  },
  actions: {
    async getMessage({commit}) {
      await axios.get(API_ROUTES.HELLO + "?name=David")
          .then(result => commit('setMessage', result.data))
          .catch(error => commit('setError', error))
    }
  },
  modules: {
  }
})
