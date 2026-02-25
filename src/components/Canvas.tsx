import { useRef, useEffect, useState } from 'react'
import styles from './Canvas.module.css'

// ─── Element types ────────────────────────────────────────────────────────────

interface Point    { x: number; y: number }

interface RectEl   { type: 'rect';   x: number; y: number; w: number; h: number }
interface CircleEl { type: 'circle'; cx: number; cy: number; rx: number; ry: number }
interface LineEl   { type: 'line';   x1: number; y1: number; x2: number; y2: number }
interface DrawEl   { type: 'draw';   path: Point[] }
interface ImageEl  { type: 'image';  img: HTMLImageElement; x: number; y: number; w: number; h: number }

type CanvasElement = RectEl | CircleEl | LineEl | DrawEl | ImageEl

// ─── Tool base class ──────────────────────────────────────────────────────────

type ToolId = 'rect' | 'circle' | 'line' | 'draw' | 'image'

abstract class CanvasTool<E extends CanvasElement> {
  abstract readonly id: ToolId
  abstract readonly label: string
  abstract readonly cursor: string

  abstract draw(ctx: CanvasRenderingContext2D, el: E): void

  // Shape tools override this; freehand builds its path incrementally instead.
  makeElement(_start: Point, _end: Point): E | undefined {
    return undefined
  }
}

// ─── Tool implementations ─────────────────────────────────────────────────────

class RectTool extends CanvasTool<RectEl> {
  readonly id     = 'rect' as const
  readonly label  = 'rect'
  readonly cursor = 'crosshair'

  draw(ctx: CanvasRenderingContext2D, el: RectEl): void {
    ctx.beginPath()
    ctx.rect(el.x, el.y, el.w, el.h)
    ctx.fill()
    ctx.stroke()
  }

  makeElement(start: Point, end: Point): RectEl {
    return {
      type: 'rect',
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      w: Math.abs(end.x - start.x),
      h: Math.abs(end.y - start.y),
    }
  }
}

class CircleTool extends CanvasTool<CircleEl> {
  readonly id     = 'circle' as const
  readonly label  = 'circle'
  readonly cursor = 'crosshair'

  draw(ctx: CanvasRenderingContext2D, el: CircleEl): void {
    ctx.beginPath()
    ctx.ellipse(el.cx, el.cy, el.rx, el.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  makeElement(start: Point, end: Point): CircleEl {
    return {
      type: 'circle',
      cx: (start.x + end.x) / 2,
      cy: (start.y + end.y) / 2,
      rx: Math.abs(end.x - start.x) / 2,
      ry: Math.abs(end.y - start.y) / 2,
    }
  }
}

class LineTool extends CanvasTool<LineEl> {
  readonly id     = 'line' as const
  readonly label  = 'line'
  readonly cursor = 'crosshair'

  draw(ctx: CanvasRenderingContext2D, el: LineEl): void {
    ctx.beginPath()
    ctx.moveTo(el.x1, el.y1)
    ctx.lineTo(el.x2, el.y2)
    ctx.stroke()
  }

  makeElement(start: Point, end: Point): LineEl {
    return { type: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y }
  }
}

class FreehandTool extends CanvasTool<DrawEl> {
  readonly id     = 'draw' as const
  readonly label  = 'draw'
  readonly cursor = 'crosshair'

  draw(ctx: CanvasRenderingContext2D, el: DrawEl): void {
    if (el.path.length < 2) return
    ctx.beginPath()
    ctx.moveTo(el.path[0].x, el.path[0].y)
    for (let i = 1; i < el.path.length; i++) ctx.lineTo(el.path[i].x, el.path[i].y)
    ctx.stroke()
  }
}

class ImageTool extends CanvasTool<ImageEl> {
  readonly id     = 'image' as const
  readonly label  = 'image'
  readonly cursor = 'default'

  draw(ctx: CanvasRenderingContext2D, el: ImageEl): void {
    ctx.drawImage(el.img, el.x, el.y, el.w, el.h)
  }
}

// ─── Tool registry ────────────────────────────────────────────────────────────

// Toolbar tools — excludes ImageTool since images are added via file upload
const TOOLS: CanvasTool<CanvasElement>[] = [
  new RectTool(),
  new CircleTool(),
  new LineTool(),
  new FreehandTool(),
]

// Safe cast: drawElement dispatches by el.type, so each tool only receives
// the element type it was designed for.
const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.id, t])) as Record<ToolId, CanvasTool<CanvasElement>>
console.log(TOOL_MAP)

// ─── Drawing ──────────────────────────────────────────────────────────────────

function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement): void {
  ctx.save()
  ctx.strokeStyle = '#1a1a2e'
  ctx.lineWidth = 2
  ctx.fillStyle = 'rgba(100, 149, 237, 0.25)'

  if (el.type === 'image') {
    ctx.drawImage(el.img, el.x, el.y, el.w, el.h)
  } else {
    TOOL_MAP[el.type].draw(ctx, el)
  }

  ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [tool, setTool] = useState<ToolId>('rect')

  // Refs avoid stale closures in mouse handlers
  const elementsRef = useRef(elements)
  elementsRef.current = elements
  const toolRef = useRef(tool)
  toolRef.current = tool
  const drawingRef = useRef<{ active: boolean; start: Point | null; path: Point[] }>({
    active: false,
    start: null,
    path: [],
  })

  const redraw = (draft?: CanvasElement) => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    elementsRef.current.forEach(el => drawElement(ctx, el))
    if (draft) drawElement(ctx, draft)
  }

  useEffect(() => { redraw() }, [elements])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e)
    drawingRef.current = { active: true, start: pos, path: [pos] }
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current.active) return
    const pos = getPos(e)
    const { start, path } = drawingRef.current
    const t = toolRef.current

    if (t === 'draw') {
      path.push(pos)
      redraw({ type: 'draw', path: [...path] })
    } else if (start) {
      redraw(TOOL_MAP[t].makeElement(start, pos) ?? undefined)
    }
  }

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current.active) return
    const pos = getPos(e)
    const { start, path } = drawingRef.current
    const t = toolRef.current
    drawingRef.current.active = false

    if (t === 'draw') {
      path.push(pos)
      setElements(prev => [...prev, { type: 'draw', path: [...path] }])
    } else if (start) {
      const el = TOOL_MAP[t].makeElement(start, pos)
      if (el) setElements(prev => [...prev, el])
    }
  }

  const onImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const w = Math.min(img.width, 400)
      const h = Math.round((img.height / img.width) * w)
      setElements(prev => [...prev, { type: 'image', img, x: 50, y: 50, w, h }])
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const activeTool = TOOL_MAP[tool]

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`${styles.btn} ${tool === t.id ? styles.active : ''}`}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
        <label className={styles.btn}>
          image
          <input type="file" accept="image/*" onChange={onImageUpload} hidden />
        </label>
        <button className={`${styles.btn} ${styles.clear}`} onClick={() => setElements([])}>
          clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={styles.canvas}
        style={{ cursor: activeTool.cursor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
    </div>
  )
}
