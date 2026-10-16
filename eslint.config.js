import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'
import tseslint from '@vue/eslint-config-typescript'

export default [
  {
    ignores: ['node_modules/', 'dist/', 'dist-electron/', 'release/', 'public/']
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
      // Alles ist TypeScript (inkl. SFCs mit lang="ts")
      'vue/block-lang': ['error', { script: { lang: 'ts' } }]
    }
  },
  skipFormatting
]
