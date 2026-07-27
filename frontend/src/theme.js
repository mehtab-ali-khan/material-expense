import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f2f2f2' },
          100: { value: '#d9d9d9' },
          200: { value: '#bfbfbf' },
          300: { value: '#a6a6a6' },
          400: { value: '#8c8c8c' },
          500: { value: '#404040' },
          600: { value: '#262626' },
          700: { value: '#1a1a1a' },
          800: { value: '#0d0d0d' },
          900: { value: '#000000' },
        },
      },
    },
  },
})

const system = createSystem(defaultConfig, config)

export default system