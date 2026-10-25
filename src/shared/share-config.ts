// Live sharing endpoints. These values are public by design: viewers can only read a board
// whose unguessable link they have, and every write needs a per-share secret held by the desktop app.
export const SHARE_SUPABASE_URL = 'https://sqbedflvdxrzuyyyoozm.supabase.co'
export const SHARE_PUBLISHABLE_KEY = 'sb_publishable_1Y0MP8usRbUs-TR8pmYM_Q_aPMDA96J'
export const SHARE_FUNCTION_URL = `${SHARE_SUPABASE_URL}/functions/v1/share`
export const SHARE_VIEWER_BASE = 'https://osama-workspace-view.vercel.app'
export const SHARE_ASSET_BASE = `${SHARE_SUPABASE_URL}/storage/v1/object/public/share-assets`

export const shareUrl = (token: string): string => `${SHARE_VIEWER_BASE}/b/${token}`
