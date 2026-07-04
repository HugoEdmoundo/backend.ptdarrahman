import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCurrentUser } from '../middleware/auth'
import { listAll, createRecord, updateRecord, deleteRecord, searchPaginated } from '../db/mysql'
import type { Variables } from '../types'

const students = new Hono<{ Variables: Variables }>()

function getId(c: any): string {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  return id
}

students.get('/', getCurrentUser, async (c) => {
  const search = c.req.query('search') || ''
  const page = parseInt(c.req.query('page') || '1', 10)
  const perPage = parseInt(c.req.query('per_page') || '20', 10)
  if (search) {
    const { data, total } = await searchPaginated('students', { search, columns: ['full_name', 'nisn', 'nis'], page, perPage })
    return c.json({ data, total, page, per_page: perPage })
  }
  return c.json(await listAll('students'))
})

students.get('/stats', getCurrentUser, async (c) => {
  const { total } = await searchPaginated('students', { perPage: 1 })
  return c.json({ total })
})

students.post('/', getCurrentUser, async (c) => c.json(await createRecord('students', await c.req.json()), 201))
students.put('/:id', getCurrentUser, async (c) => c.json(await updateRecord('students', getId(c), await c.req.json())))
students.patch('/:id/status', getCurrentUser, async (c) => c.json(await updateRecord('students', getId(c), await c.req.json())))
students.delete('/:id', getCurrentUser, async (c) => { await deleteRecord('students', getId(c)); return c.json({ message: 'Deleted' }) })

export default students
