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
    error: undefined,
    buzzer: {
      enabled: true,
      activated: true
    }
  },
  getters: {
  },
  mutations: {
    setMessage(state, message){
      state.msg = message
    },
    setError(state, error){
      state.error = error
    },
    setBuzzerAttributes(state, buzzer) {
      state.buzzer = buzzer
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
