import { useRef, useEffect, useState } from 'react'
import styles from './Canvas.module.css'

const TOOLS = ['rect', 'circle', 'line', 'draw']

function drawElement(ctx, el) {
  ctx.save()
  ctx.strokeStyle = '#1a1a2e'
  ctx.lineWidth = 2
  ctx.fillStyle = 'rgba(100, 149, 237, 0.25)'

  if (el.type === 'rect') {
    ctx.beginPath()
    ctx.rect(el.x, el.y, el.w, el.h)
    ctx.fill()
    ctx.stroke()
  } else if (el.type === 'circle') {
    ctx.beginPath()
    ctx.ellipse(el.cx, el.cy, el.rx, el.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (el.type === 'line') {
    ctx.beginPath()
    ctx.moveTo(el.x1, el.y1)
    ctx.lineTo(el.x2, el.y2)
    ctx.stroke()
  } else if (el.type === 'draw') {
    if (el.path.length < 2) return
    ctx.beginPath()
    ctx.moveTo(el.path[0].x, el.path[0].y)
    for (let i = 1; i < el.path.length; i++) ctx.lineTo(el.path[i].x, el.path[i].y)
    ctx.stroke()
  } else if (el.type === 'image') {
    ctx.drawImage(el.img, el.x, el.y, el.w, el.h)
  }

  ctx.restore()
}

function makeShapeElement(tool, start, end) {
  if (tool === 'rect') {
    return {
      type: 'rect',
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      w: Math.abs(end.x - start.x),
      h: Math.abs(end.y - start.y),
    }
  }
  if (tool === 'circle') {
    return {
      type: 'circle',
      cx: (start.x + end.x) / 2,
      cy: (start.y + end.y) / 2,
      rx: Math.abs(end.x - start.x) / 2,
      ry: Math.abs(end.y - start.y) / 2,
    }
  }
  if (tool === 'line') {
    return { type: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y }
  }
}

export function Canvas() {
  const canvasRef = useRef(null)
  const [elements, setElements] = useState([])
  const [tool, setTool] = useState('rect')

  // Refs avoid stale closures in mouse handlers
  const elementsRef = useRef(elements)
  elementsRef.current = elements
  const toolRef = useRef(tool)
  toolRef.current = tool
  const drawingRef = useRef({ active: false, start: null, path: [] })

  const redraw = (draft = null) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    elementsRef.current.forEach(el => drawElement(ctx, el))
    if (draft) {
      console.log('Drawing draft:', draft)
      drawElement(ctx, draft)
    }
  }

  useEffect(() => { redraw() }, [elements])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseDown = (e) => {
    const pos = getPos(e)
    drawingRef.current = { active: true, start: pos, path: [pos] }
  }

  const onMouseMove = (e) => {
    if (!drawingRef.current.active) return
    const pos = getPos(e)
    const { start, path } = drawingRef.current
    const t = toolRef.current

    if (t === 'draw') {
      path.push(pos)
      redraw({ type: 'draw', path: [...path] })
    } else {
      redraw(makeShapeElement(t, start, pos))
    }
  }

  const onMouseUp = (e) => {
    if (!drawingRef.current.active) return
    const pos = getPos(e)
    const { start, path } = drawingRef.current
    const t = toolRef.current
    drawingRef.current.active = false

    if (t === 'draw') {
      path.push(pos)
      setElements(prev => [...prev, { type: 'draw', path: [...path] }])
    } else {
      const el = makeShapeElement(t, start, pos)
      if (el) setElements(prev => [...prev, el])
    }
  }

  const onImageUpload = (e) => {
    const file = e.target.files[0]
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

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {TOOLS.map(t => (
          <button
            key={t}
            className={`${styles.btn} ${tool === t ? styles.active : ''}`}
            onClick={() => setTool(t)}
          >
            {t}
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
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
    </div>
  )
}
