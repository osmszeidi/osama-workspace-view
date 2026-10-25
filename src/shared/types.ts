// Shared data model for OSAMA WORKSPACE (main + preload + renderer)

export type CardType =
  | 'note'
  | 'heading'
  | 'checklist'
  | 'task'
  | 'image'
  | 'link'
  | 'file'
  | 'divider'
  | 'group'
  | 'swatch'
  | 'shotlist'

export type TaskStatus = 'todo' | 'doing' | 'done'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface ShotRow {
  id: string
  shot: string
  desc: string
  dur: string
  done: boolean
}

export interface CardData {
  tags?: string[]
  // note
  html?: string
  label?: string
  // heading
  text?: string
  level?: 1 | 2
  // checklist / shotlist / group
  title?: string
  items?: ChecklistItem[]
  rows?: ShotRow[]
  // task
  status?: TaskStatus
  notes?: string
  due?: string
  assignee?: string
  // image / file
  assetId?: string
  caption?: string
  naturalW?: number
  naturalH?: number
  path?: string
  name?: string
  size?: number
  ext?: string
  // link
  url?: string
  description?: string
  // swatch
  hex?: string
}

export interface Card {
  id: string
  boardId: string
  type: CardType
  x: number
  y: number
  w: number
  h: number
  z: number
  color: string | null
  parentId: string | null
  data: CardData
}

export interface ConnectionStyle {
  arrow: 'end' | 'both' | 'none'
  dashed: boolean
  color: string | null
}

export interface Connection {
  id: string
  boardId: string
  fromId: string
  toId: string
  style: ConnectionStyle
  label: string
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface Project {
  id: string
  title: string
  description: string
  icon: string
  color: string
  starred: boolean
  archived: boolean
  deletedAt: number | null
  createdAt: number
  updatedAt: number
  lastOpenedAt: number | null
  boardCount: number
  coverAssetId: string | null
}

export interface MiniRect {
  x: number
  y: number
  w: number
  h: number
  type: CardType
  color: string | null
  assetId?: string
}

export interface Board {
  id: string
  projectId: string
  title: string
  description: string
  icon: string
  position: number
  viewport: Viewport | null
  deletedAt: number | null
  createdAt: number
  updatedAt: number
  cardCount?: number
  preview?: MiniRect[]
}

export interface BoardContent {
  board: Board
  project: Project
  cards: Card[]
  connections: Connection[]
}

export interface AssetInfo {
  id: string
  originalName: string
  mime: string
  size: number
  width: number | null
  height: number | null
  isImage: boolean
  path?: string // original path on disk (for file references)
  copied: boolean
}

export interface Settings {
  authorName: string
  defaultPaper: 'A4' | 'A3'
  defaultOrientation: 'landscape' | 'portrait'
  sidebarCollapsed: boolean
  showGrid: boolean
  snapToGrid: boolean
}

export interface SearchResult {
  kind: 'project' | 'board' | 'card'
  id: string
  projectId: string
  boardId?: string
  title: string
  subtitle: string
  icon?: string
}

export interface TrashContents {
  projects: Project[]
  boards: (Board & { projectTitle: string })[]
}

// ---------- PDF export ----------

export type PdfMode = 'canvas' | 'document'
export type PdfScope = 'board' | 'project' | 'selection'

export interface PdfOptions {
  mode: PdfMode
  scope: PdfScope
  projectId: string
  boardIds: string[]
  cardIds: string[]
  area: 'all' | 'visible'
  visibleRect: { x: number; y: number; w: number; h: number } | null
  paper: 'A4' | 'A3'
  orientation: 'landscape' | 'portrait'
  fit: 'one' | 'multi'
  scale: number // percent, used for multi-page canvas
  margin: number // mm
  background: 'dark' | 'light' | 'white'
  showTitle: boolean
  showAuthor: boolean
  showDate: boolean
  showPageNumbers: boolean
  boardPerPage: boolean
  title: string
  author: string
}

export interface PdfJobData {
  options: PdfOptions
  project: Project
  boards: { board: Board; cards: Card[]; connections: Connection[] }[]
  exportedAt: number
}

export interface PdfResult {
  ok: boolean
  bytes?: Uint8Array
  pages?: number
  error?: string
}

export const DEFAULT_SETTINGS: Settings = {
  authorName: 'Osama Alzeidi',
  defaultPaper: 'A4',
  defaultOrientation: 'landscape',
  sidebarCollapsed: false,
  showGrid: true,
  snapToGrid: false
}

// ---------- Live sharing ----------

export type ShareState = 'off' | 'live' | 'syncing' | 'offline' | 'error'

export interface ShareStatus {
  boardId: string
  state: ShareState
  url: string | null
  lastPublishedAt: number | null
  error: string | null
}
