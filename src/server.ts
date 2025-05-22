import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth.routes'
import todoRoutes from './routes/todos'
import 'dotenv/config'

declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            id: number;
            email: string;
            username: string;
        }
    }
}

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: any;
    }
}

const server = Fastify({ logger: true })

server.register(cors, { 
  origin: process.env.CORS_ORIGIN
})

server.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key-here'
})

server.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
})

server.get('/health', async () => {
  return { status: 'ok' }
})

server.register(authRoutes, { prefix: '/auth' })
server.register(todoRoutes, { prefix: '/api' })

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '4000')
    const host = process.env.HOST || '0.0.0.0'
    
    await server.listen({ port, host })
    console.log(`Server running on http://localhost:${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()