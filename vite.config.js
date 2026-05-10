import { basename, resolve } from 'path'
import { globSync, readFileSync } from 'fs'
import { defineConfig } from 'vite'
import handlebars from 'vite-plugin-handlebars'
import { marked } from 'marked'
import matter from 'gray-matter'

// --- Load structured content once at startup ---

const settings = JSON.parse(readFileSync(resolve(__dirname, 'content/settings.json'), 'utf-8'))

const navigation = JSON.parse(readFileSync(resolve(__dirname, 'content/navigation.json'), 'utf-8'))
  .sort((a, b) => a.order - b.order)

const gallery = JSON.parse(readFileSync(resolve(__dirname, 'content/gallery.json'), 'utf-8'))
  .sort((a, b) => a.order - b.order)

const services = JSON.parse(readFileSync(resolve(__dirname, 'content/services.json'), 'utf-8'))
services.tiers.sort((a, b) => a.order - b.order)
services.packages.sort((a, b) => a.order - b.order)
services.standards.sort((a, b) => a.order - b.order)

const resources = JSON.parse(readFileSync(resolve(__dirname, 'content/resources.json'), 'utf-8'))
resources.categories.sort((a, b) => a.order - b.order)
resources.categories.forEach(c => c.links.sort((a, b) => a.order - b.order))

// --- Pages that render markdown content ---

const pageContentMap = {
  '/pages/index.html': 'content/index.md',
  '/pages/bio.html': 'content/bio.md',
  '/pages/contact.html': 'content/contact.md',
  '/pages/testimonials.html': 'content/testimonials.md',
  '/pages/styleguide.html': 'content/styleguide.md',
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
      helpers: {
        eq: (a, b) => a === b,
      },
      context(pagePath) {
        const currentPageUrl = pagePath.replace('/pages/', '/')
        const base = { settings, navigation, gallery, services, resources, currentPageUrl }
        const mdFile = pageContentMap[pagePath]
        if (mdFile) {
          const raw = readFileSync(resolve(__dirname, mdFile), 'utf-8')
          const { data, content: body } = matter(raw)
          return {
            ...base,
            pageTitle: data.title,
            pageSubheading: data.subheading,
            content: marked(body),
          }
        }
        return base
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
