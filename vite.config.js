import { basename, resolve } from 'path'
import { globSync, readFileSync } from 'fs'
import { defineConfig } from 'vite'
import handlebars from 'vite-plugin-handlebars'
import { marked } from 'marked'

const pageContentMap = {
  '/pages/index.html': 'content/index.md',
  '/pages/bio.html': 'content/bio.md',
  '/pages/services.html': 'content/services.md',
  '/pages/resources.html': 'content/resources.md',
  '/pages/contact.html': 'content/contact.md',
  '/pages/testimonials.html': 'content/testimonials.md',
  '/pages/styleguide.html': 'content/styleguide.md'
}

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
      context(pagePath) {
        const mdFile = pageContentMap[pagePath]
        if (mdFile) {
          const md = readFileSync(resolve(__dirname, mdFile), 'utf-8')
          return { content: marked(md) }
        }
        return {}
      },
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
