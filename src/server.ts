import sdk from './tracing';
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth.routes'
import todoRoutes from './routes/todos'
import 'dotenv/config'

sdk.start();

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

export const server = Fastify({ logger: true })

server.register(cors, { 
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'DELETE']
})

server.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key-here'
})

server.decorate('authenticate', async function(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

server.get('/health', async () => {
  return { status: 'ok' }
})

server.register(authRoutes, { prefix: '/auth' })
server.register(todoRoutes, { prefix: '/api' })

// Only start the server if we're not in Lambda
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
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
}