import type { Request, Response, NextFunction } from 'express'
import { getSupabaseClient } from '../services/supabase.js'
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email?: string
  }
}
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'A valid Bearer token is required.',
    })
    return
  }
  const token = authHeader.slice(7).trim()
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is missing.',
    })
    return
  }
  try {
    // Initializes Supabase when needed instead of checking
    // whether it was initialized before this request.
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token.',
      })
      return
    }
    req.user = {
      id: data.user.id,
      email: data.user.email,
    }
    next()
  } catch (error) {
    console.error(
      '[Auth] Authentication service error:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    res.status(503).json({
      error: 'Service unavailable',
      message: 'Authentication is temporarily unavailable.',
    })
  }
}
