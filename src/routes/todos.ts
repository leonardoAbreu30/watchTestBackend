import { FastifyInstance } from 'fastify'
import { query } from '../db'

export default async function (server: FastifyInstance) {
  // Get all todos
  server.get('/todos', async () => {
    const { rows } = await query('SELECT * FROM todos ORDER BY created_at DESC')
    return rows
  })

  // Add new todo
  server.post<{ Body: { text: string } }>('/todos', async (req) => {
    const { text } = req.body
    const { rows } = await query(
      'INSERT INTO todos (text) VALUES ($1) RETURNING *',
      [text]
    )
    return rows[0]
  })

  // Delete todo
  server.delete<{ Params: { id: string } }>('/todos/:id', async (req) => {
    await query('DELETE FROM todos WHERE id = $1', [req.params.id])
    return { success: true }
  })
}