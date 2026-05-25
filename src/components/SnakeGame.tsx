import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface SnakeGameProps {
  onScore?: (score: number) => void
}

const GRID = 20
const CELL = 18
const TICK = 130

export default function SnakeGame({ onScore }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef({
    snake: [{ x: 10, y: 10 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 5, y: 5 },
    score: 0,
    highScore: parseInt(localStorage.getItem('snakeHS') || '0'),
    alive: true,
    running: false,
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const g = gameRef.current

    function placeFood() {
      const occupied = new Set(g.snake.map(s => `${s.x},${s.y}`))
      let fx: number, fy: number
      do {
        fx = Math.floor(Math.random() * GRID)
        fy = Math.floor(Math.random() * GRID)
      } while (occupied.has(`${fx},${fy}`))
      g.food = { x: fx, y: fy }
    }

    function reset() {
      g.snake = [{ x: 10, y: 10 }]
      g.dir = { x: 1, y: 0 }
      g.nextDir = { x: 1, y: 0 }
      g.score = 0
      g.alive = true
      placeFood()
    }

    function tick() {
      if (!g.alive) return
      g.dir = { ...g.nextDir }
      const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y }

      // Wall collision
      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        g.alive = false
        if (g.score > g.highScore) {
          g.highScore = g.score
          localStorage.setItem('snakeHS', String(g.score))
        }
        return
      }
      // Self collision
      if (g.snake.some(s => s.x === head.x && s.y === head.y)) {
        g.alive = false
        if (g.score > g.highScore) {
          g.highScore = g.score
          localStorage.setItem('snakeHS', String(g.score))
        }
        return
      }

      g.snake.unshift(head)

      if (head.x === g.food.x && head.y === g.food.y) {
        g.score++
        onScore?.(g.score)
        placeFood()
      } else {
        g.snake.pop()
      }
    }

    function draw() {
      const cvs = canvasRef.current
      if (!cvs) return   // guard: canvas unmounted
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, cvs.width, cvs.height)

      // Grid dots
      ctx.fillStyle = '#111'
      for (let x = 0; x < GRID; x++) {
        for (let y = 0; y < GRID; y++) {
          ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2)
        }
      }

      // Food — neon green blinking square
      const foodBlink = Math.floor(Date.now() / 300) % 2 === 0
      ctx.fillStyle = foodBlink ? '#00FF00' : '#00CC00'
      ctx.fillRect(g.food.x * CELL + 2, g.food.y * CELL + 2, CELL - 4, CELL - 4)
      ctx.strokeStyle = '#00FF00'
      ctx.lineWidth = 2
      ctx.strokeRect(g.food.x * CELL + 2, g.food.y * CELL + 2, CELL - 4, CELL - 4)

      // Snake
      g.snake.forEach((seg, i) => {
        if (i === 0) {
          ctx.fillStyle = '#FFFFFF'
        } else {
          const shade = Math.max(80, 255 - i * 6)
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        }
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2)
        if (i === 0) {
          // Eyes
          ctx.fillStyle = '#000'
          const ex = g.dir.x === 0 ? 4 : g.dir.x === 1 ? CELL - 6 : 2
          const ey = g.dir.y === 0 ? 4 : g.dir.y === 1 ? CELL - 6 : 2
          ctx.fillRect(seg.x * CELL + ex, seg.y * CELL + ey, 3, 3)
        }
      })

      // Dead overlay
      if (!g.alive) {
        ctx.fillStyle = 'rgba(255,0,255,0.25)'
        ctx.fillRect(0, 0, cvs.width, cvs.height)
        ctx.fillStyle = '#FF00FF'
        ctx.font = 'bold 20px "Major Mono Display", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', cvs.width / 2, cvs.height / 2 - 14)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '13px "Inconsolata", monospace'
        ctx.fillText(`SCORE: ${g.score}  |  PRESS R TO RESTART`, cvs.width / 2, cvs.height / 2 + 12)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    function onKey(e: KeyboardEvent) {
      const d = g.nextDir
      if ((e.key === 'ArrowUp' || e.key === 'w') && d.y !== 1) g.nextDir = { x: 0, y: -1 }
      if ((e.key === 'ArrowDown' || e.key === 's') && d.y !== -1) g.nextDir = { x: 0, y: 1 }
      if ((e.key === 'ArrowLeft' || e.key === 'a') && d.x !== 1) g.nextDir = { x: -1, y: 0 }
      if ((e.key === 'ArrowRight' || e.key === 'd') && d.x !== -1) g.nextDir = { x: 1, y: 0 }
      if (e.key === 'r' || e.key === 'R') {
        reset()
        if (!g.running) {
          g.running = true
          timerRef.current = setInterval(tick, TICK)
        }
      }
    }

    // Touch controls
    let touchStartX = 0, touchStartY = 0
    function onTouchStart(e: TouchEvent) {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchStartX
      const dy = e.changedTouches[0].clientY - touchStartY
      const d = g.nextDir
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && d.x !== -1) g.nextDir = { x: 1, y: 0 }
        if (dx < -20 && d.x !== 1) g.nextDir = { x: -1, y: 0 }
      } else {
        if (dy > 20 && d.y !== -1) g.nextDir = { x: 0, y: 1 }
        if (dy < -20 && d.y !== 1) g.nextDir = { x: 0, y: -1 }
      }
    }

    placeFood()
    g.running = true
    timerRef.current = setInterval(tick, TICK)
    rafRef.current = requestAnimationFrame(draw)
    window.addEventListener('keydown', onKey)
    canvas.addEventListener('touchstart', onTouchStart)
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      clearInterval(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [onScore])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ border: '4px solid #000', boxShadow: '8px 8px 0px #00FF00', background: '#000' }}
    >
      {/* Header */}
      <div style={{
        borderBottom: '4px solid #000',
        background: '#00FF00',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div className="font-mono-display" style={{ fontSize: '14px', fontWeight: 900 }}>
          🐍 SNAKE — KILL TIME
        </div>
        <div className="font-mono-body" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
          ARROWS/WASD · R=RESTART
        </div>
        <div className="font-mono-display" style={{ fontSize: '12px' }}>
          HS: {gameRef.current.highScore}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={GRID * CELL}
        height={GRID * CELL}
        style={{ display: 'block' }}
      />

      {/* Touch controls */}
      <div style={{ borderTop: '3px solid #222', background: '#0a0a0a', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 4, height: 80 }}>
        {[
          { dir: 'up', label: '▲', col: 2, row: 1 },
          { dir: 'left', label: '◀', col: 1, row: 2 },
          { dir: 'down', label: '▼', col: 2, row: 2 },
          { dir: 'right', label: '▶', col: 3, row: 2 },
        ].map(btn => (
          <button
            key={btn.dir}
            onPointerDown={() => {
              const g = gameRef.current
              const d = g.nextDir
              if (btn.dir === 'up' && d.y !== 1) g.nextDir = { x: 0, y: -1 }
              if (btn.dir === 'down' && d.y !== -1) g.nextDir = { x: 0, y: 1 }
              if (btn.dir === 'left' && d.x !== 1) g.nextDir = { x: -1, y: 0 }
              if (btn.dir === 'right' && d.x !== -1) g.nextDir = { x: 1, y: 0 }
            }}
            style={{
              gridColumn: btn.col,
              gridRow: btn.row,
              border: '2px solid #333',
              background: '#111',
              color: '#00FF00',
              fontSize: '18px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
