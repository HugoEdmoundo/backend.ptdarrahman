import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCurrentUser } from '../middleware/auth'
import { listAll, createRecord, updateRecord, deleteRecord, searchPaginated } from '../db/mysql'
import type { Variables } from '../types'

const students = new Hono<{ Variables: Variables }>()

function getId(c: any): string {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'Missing id' })
  return id
}

const studentSchema = z.object({
  full_name: z.string(),
  nisn: z.string().optional().nullable(),
  nis: z.string().optional().nullable(),
  gender: z.string().optional(),
  birth_place: z.string().optional(),
  birth_date: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional(),
  email: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  father_occupation: z.string().optional(),
  mother_occupation: z.string().optional(),
  parent_phone: z.string().optional(),
  photo: z.string().optional(),
  previous_school: z.string().optional(),
  registration_number: z.string().optional(),
  registration_date: z.string().optional().nullable(),
  program: z.string().optional(),
  class_name: z.string().optional(),
  academic_year: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
})

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

students.post('/', getCurrentUser, zValidator('json', studentSchema), async (c) => c.json(await createRecord('students', c.req.valid('json')), 201))
students.put('/:id', getCurrentUser, zValidator('json', studentSchema.partial()), async (c) => c.json(await updateRecord('students', getId(c), c.req.valid('json'))))
students.patch('/:id/status', getCurrentUser, zValidator('json', z.object({ status: z.string() })), async (c) => c.json(await updateRecord('students', getId(c), c.req.valid('json'))))
students.delete('/:id', getCurrentUser, async (c) => {
  const id = getId(c)
  try {
    const deleted = await deleteRecord('students', id)
    if (!deleted) throw new HTTPException(404, { message: 'Student not found' })
    return c.json({ message: 'Deleted' })
  } catch (e: any) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.errno === 1451) {
      throw new HTTPException(409, { message: 'Cannot delete student because they are referenced by bills or payments' })
    }
    throw e
  }
})

export default students
