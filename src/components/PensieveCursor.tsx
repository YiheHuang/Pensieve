import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

const TRAIL_LENGTH = 6
const TRAIL_STOP_DELAY = 150
const interactiveSelector = 'button:not(:disabled),a,summary,select:not(:disabled),[role="button"]:not([aria-disabled="true"]),[role="link"]'

export function PensieveCursor({ reduceMotion }: { reduceMotion: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const starRef = useRef<HTMLSpanElement>(null)
  const trailRefs = useRef<Array<HTMLSpanElement | null>>([])

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)')
    const highContrast = window.matchMedia('(forced-colors: active)')
    if (!finePointer.matches || highContrast.matches) return

    const points = Array.from({ length: TRAIL_LENGTH }, () => ({ x: 0, y: 0 }))
    const target = { x: 0, y: 0 }
    const previous = { x: 0, y: 0, time: 0 }
    let initialized = false
    let animating = false
    let frame = 0
    let stillTimer = 0
    let lastElement: Element | null = null

    const setPointerMode = (element: Element | null) => {
      if (element === lastElement) return
      lastElement = element
      const root = rootRef.current
      if (!root || !element) return
      const cursor = getComputedStyle(element).cursor
      const useSystemCursor = !['none', 'auto', 'default'].includes(cursor)
      root.classList.toggle('native-cursor', useSystemCursor)
      root.classList.toggle('interactive', !useSystemCursor && Boolean(element.closest(interactiveSelector)))
    }
    const settle = () => rootRef.current?.classList.remove('moving')
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const now = performance.now()
      const distance = Math.hypot(event.clientX - previous.x, event.clientY - previous.y)
      const elapsed = Math.max(now - previous.time, 1)
      const speed = distance / elapsed
      target.x = event.clientX
      target.y = event.clientY
      starRef.current?.style.setProperty('transform', `translate3d(${target.x}px,${target.y}px,0) translate(-50%,-50%)`)
      if (!initialized) {
        points.forEach(point => { point.x = target.x; point.y = target.y })
        initialized = true
      }
      const root = rootRef.current
      root?.classList.add('visible')
      setPointerMode(event.target instanceof Element ? event.target : null)
      if (!reduceMotion && previous.time > 0 && distance >= 1.2 && speed >= .025) {
        root?.classList.add('moving')
        window.clearTimeout(stillTimer)
        stillTimer = window.setTimeout(settle, TRAIL_STOP_DELAY)
        if (!animating) {
          animating = true
          frame = requestAnimationFrame(animate)
        }
      }
      previous.x = event.clientX
      previous.y = event.clientY
      previous.time = now
    }
    const leave = (event: MouseEvent) => {
      if (!event.relatedTarget) rootRef.current?.classList.remove('visible', 'moving')
    }
    const animate = () => {
      if (initialized && !reduceMotion) {
        points[0].x += (target.x - points[0].x) * .48
        points[0].y += (target.y - points[0].y) * .48
        for (let index = 1; index < points.length; index += 1) {
          points[index].x += (points[index - 1].x - points[index].x) * .4
          points[index].y += (points[index - 1].y - points[index].y) * .4
        }
        trailRefs.current.forEach((element, index) => element?.style.setProperty('transform', `translate3d(${points[index].x}px,${points[index].y}px,0) translate(-50%,-50%)`))
      }
      const tail = points.at(-1)
      const distanceLeft = tail ? Math.hypot(target.x - tail.x, target.y - tail.y) : 0
      if (rootRef.current?.classList.contains('moving') || distanceLeft > .3) frame = requestAnimationFrame(animate)
      else animating = false
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('mouseout', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('mouseout', leave)
      window.clearTimeout(stillTimer)
      cancelAnimationFrame(frame)
    }
  }, [reduceMotion])

  return <div ref={rootRef} className="pensieve-pointer-magic" aria-hidden="true">
    <span className="pensieve-pointer-trail">
      {Array.from({ length: TRAIL_LENGTH }, (_, index) => <i className="pensieve-pointer-trace" style={{ width: 3.2 - index * .3, height: 3.2 - index * .3, opacity: .3 - index * .038, filter: `blur(${index * .12}px)` } as CSSProperties} ref={element => { trailRefs.current[index] = element }} key={index} />)}
    </span>
    <span ref={starRef} className="pensieve-pointer-star" />
  </div>
}
