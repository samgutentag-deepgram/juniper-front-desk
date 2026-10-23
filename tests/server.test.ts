import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/server/index'

describe('server', () => {
  it('has no token or key route: the key never reaches it', async () => {
    const res = await request(createApp()).post('/api/token').set('x-deepgram-key', 'k')
    expect(res.status).toBe(404)
  })
})
