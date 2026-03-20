import { basename, resolve } from 'path'
import { globSync } from 'fs'
import { defineConfig } from 'vite'
import handlebars from 'vite-plugin-handlebars'

const pageFiles = globSync(resolve(__dirname, 'pages/*.html'))
const input = Object.fromEntries(
  pageFiles.map((file) => {
    const name = basename(file, '.html')
    return [name === 'index' ? 'main' : name, file]
  })
)

export default defineConfig({
  plugins: [
    handlebars({
      partialDirectory: resolve(__dirname, 'src/components'),
    }),
    {
      name: 'pages-rewrite',
      configureServer(server) {
        const htmlFileNames = pageFiles.map((f) => '/' + basename(f))
        server.middlewares.use((req, _res, next) => {
          const path = req.url?.split('?')[0]
          if (path === '/') {
            req.url = '/pages/index.html'
          } else if (htmlFileNames.includes(path)) {
            req.url = '/pages' + req.url
          }
          next()
        })
      },
      enforce: 'post',
      generateBundle(_, bundle) {
        for (const [key, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'asset' && key.startsWith('pages/') && key.endsWith('.html')) {
            chunk.fileName = chunk.fileName.replace(/^pages\//, '')
            bundle[chunk.fileName] = chunk
            delete bundle[key]
          }
        }
      },
    },
  ],
  build: {
    rollupOptions: { input },
  },
})
