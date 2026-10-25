import { create } from 'zustand'
import type { Project, Settings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { uid } from '../lib/util'

export type View = 'home' | 'projects' | 'recent' | 'starred' | 'archive' | 'trash' | 'settings' | 'project' | 'board'

export interface Route {
  view: View
  projectId?: string
  boardId?: string
  focusCardId?: string
}

export interface Toast {
  id: string
  kind: 'info' | 'success' | 'error'
  text: string
  actions?: { label: string; run: () => void }[]
}

export interface ConfirmRequest {
  title: string
  body?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

interface AppState {
  route: Route
  history: Route[]
  projects: Project[]
  projectsLoaded: boolean
  settings: Settings
  toasts: Toast[]
  confirmReq: ConfirmRequest | null
  paletteOpen: boolean
  shortcutsOpen: boolean
  projectDialog: { mode: 'create' } | { mode: 'edit'; project: Project } | null
  exportReq: { projectId: string; boardId?: string; scope: 'board' | 'project' | 'selection' } | null
  // actions
  navigate(r: Route): void
  back(): void
  refreshProjects(): Promise<void>
  loadSettings(): Promise<void>
  updateSettings(p: Partial<Settings>): Promise<void>
  toast(kind: Toast['kind'], text: string, actions?: Toast['actions'], ms?: number): void
  dismissToast(id: string): void
  confirm(req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean>
  setPalette(open: boolean): void
  setShortcuts(open: boolean): void
  setProjectDialog(d: AppState['projectDialog']): void
  setExportReq(r: AppState['exportReq']): void
}

export const useApp = create<AppState>((set, get) => ({
  route: { view: 'home' },
  history: [],
  projects: [],
  projectsLoaded: false,
  settings: DEFAULT_SETTINGS,
  toasts: [],
  confirmReq: null,
  paletteOpen: false,
  shortcutsOpen: false,
  projectDialog: null,
  exportReq: null,

  navigate(r) {
    const cur = get().route
    if (cur.view === r.view && cur.projectId === r.projectId && cur.boardId === r.boardId && !r.focusCardId) return
    set({ route: r, history: [...get().history.slice(-30), cur] })
    if (r.projectId && (r.view === 'project' || r.view === 'board')) window.api.projects.touch(r.projectId).catch(() => {})
  },
  back() {
    const h = get().history
    if (!h.length) return
    set({ route: h[h.length - 1], history: h.slice(0, -1) })
  },
  async refreshProjects() {
    const projects = await window.api.projects.list()
    set({ projects, projectsLoaded: true })
  },
  async loadSettings() {
    set({ settings: await window.api.settings.get() })
  },
  async updateSettings(p) {
    set({ settings: { ...get().settings, ...p } })
    set({ settings: await window.api.settings.set(p) })
  },
  toast(kind, text, actions, ms) {
    const id = uid()
    set({ toasts: [...get().toasts.slice(-3), { id, kind, text, actions }] })
    setTimeout(() => get().dismissToast(id), ms ?? (actions ? 9000 : kind === 'error' ? 7000 : 3500))
  },
  dismissToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
  confirm(req) {
    return new Promise<boolean>((resolve) => {
      set({
        confirmReq: {
          ...req,
          resolve: (ok) => {
            set({ confirmReq: null })
            resolve(ok)
          }
        }
      })
    })
  },
  setPalette(open) {
    set({ paletteOpen: open })
  },
  setShortcuts(open) {
    set({ shortcutsOpen: open })
  },
  setProjectDialog(d) {
    set({ projectDialog: d })
  },
  setExportReq(r) {
    set({ exportReq: r })
  }
}))

export const toast = (kind: Toast['kind'], text: string, actions?: Toast['actions']) => useApp.getState().toast(kind, text, actions)
export const confirmDialog = (req: Omit<ConfirmRequest, 'resolve'>) => useApp.getState().confirm(req)

export const reportError = (e: unknown, prefix = 'Something went wrong') => {
  const msg = e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(e)
  console.error(e)
  toast('error', `${prefix}: ${msg}`)
}
