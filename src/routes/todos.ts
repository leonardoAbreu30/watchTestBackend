import { FastifyInstance } from 'fastify'
import { query } from '../db'

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/todos', async (request) => {
    const { rows } = await query(
      'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
      [request.user.id]
    );
    return rows;
  });

  fastify.post<{ Body: { text: string } }>('/todos', async (request) => {
    const { text } = request.body;
    const { rows } = await query(
      'INSERT INTO todos (text, user_id) VALUES ($1, $2) RETURNING *',
      [text, request.user.id]
    );
    return rows[0];
  });

  fastify.delete<{ Params: { id: string } }>('/todos/:id', async (request, reply) => {
    const { rows } = await query(
      'SELECT user_id FROM todos WHERE id = $1',
      [request.params.id]
    );

    if (rows.length === 0) {
      reply.status(404).send({ error: 'Todo not found' });
      return;
    }

    if (rows[0].user_id !== request.user.id) {
      reply.status(403).send({ error: 'Not authorized to delete this todo' });
      return;
    }

    await query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [
      request.params.id,
      request.user.id
    ]);
    return { success: true };
  });
}