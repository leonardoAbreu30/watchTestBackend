import { FastifyInstance } from 'fastify';
import { AuthService, UserInput } from '../services/auth.service';

export async function authRoutes(fastify: FastifyInstance) {
    const authService = new AuthService();

    fastify.post<{ Body: UserInput }>('/register', async (request, reply) => {
        try {
            const user = await authService.register(request.body);
            const token = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username });
            return { user, token };
        } catch (error) {
            reply.status(400).send({ error: "User already exists" });
        }
    });

    fastify.post<{ Body: { usernameOrEmail: string; password: string } }>('/login', async (request, reply) => {
        try {
            const { usernameOrEmail, password } = request.body;
            const user = await authService.login(usernameOrEmail, password);
            const token = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username });
            return { user, token };
        } catch (error) {
            reply.status(401).send({ error: "Invalid credentials" });
        }
    });

    // Protected route test
    fastify.get('/me', {
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            return request.user;
        }
    });
} 