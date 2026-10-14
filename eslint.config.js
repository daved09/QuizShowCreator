import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'
import tseslint from '@vue/eslint-config-typescript'

export default [
  {
    ignores: ['node_modules/', 'dist/', 'public/']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  ...tseslint(),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    rules: {
      // Project mixes plain JS and TS SFCs (main.js is JS); don't force lang="ts"
      'vue/block-lang': 'off'
    }
  },
  skipFormatting
]
