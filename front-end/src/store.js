import { createStore } from 'vuex'
import axios from "axios";

const API_ROUTES = {
  HELLO: '/api/hello'
}

export default createStore({
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
