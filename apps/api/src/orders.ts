import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.status(501).json({
    error: 'Escrow orders are not implemented yet.',
  })
})

export default router
