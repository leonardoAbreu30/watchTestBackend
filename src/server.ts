import fastify from 'fastify'
import cors from '@fastify/cors'
import todoRoutes from './routes/todos'

const server = fastify({ logger: true })

server.register(cors, { 
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE']
})

server.get('/health', async () => {
  return { status: 'ok' }
})

server.register(todoRoutes, { prefix: '/api' })

const start = async () => {
  try {
    await server.listen({ port: 4000 })
    console.log('Server running on http://localhost:4000')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()