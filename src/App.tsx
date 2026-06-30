import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import './App.css'
import { VirtualStar } from './components/VirtualStar'
import { captureNeonSelfie, downloadBlob } from './utils/capture'

type CameraState = 'idle' | 'starting' | 'ready' | 'error'

const cameraConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'user' },
  },
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [error, setError] = useState('')
  const [isSigning, setIsSigning] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const syncSignatureCanvas = useCallback(() => {
    const canvas = signatureCanvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) {
      return
    }

    const rect = stage.getBoundingClientRect()
    const pixelRatio = window.devicePixelRatio || 1
    const nextWidth = Math.max(1, Math.round(rect.width * pixelRatio))
    const nextHeight = Math.max(1, Math.round(rect.height * pixelRatio))

    if (canvas.width === nextWidth && canvas.height === nextHeight) {
      return
    }

    const previous = document.createElement('canvas')
    previous.width = canvas.width
    previous.height = canvas.height
    previous.getContext('2d')?.drawImage(canvas, 0, 0)

    canvas.width = nextWidth
    canvas.height = nextHeight
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.lineCap = 'round'
    context.lineJoin = 'round'

    if (previous.width && previous.height && hasSignature) {
      context.drawImage(previous, 0, 0, nextWidth, nextHeight)
    }
  }, [hasSignature])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => stopStream, [stopStream])

  const startCamera = useCallback(async () => {
    if (cameraState === 'starting' || cameraState === 'ready') {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error')
      setError('이 브라우저는 카메라 API를 지원하지 않아요.')
      return
    }

    setCameraState('starting')
    setError('')
    setDownloaded(false)
    setIsSigning(false)
    setHasSignature(false)
    lastPointRef.current = null
    clearSignatureCanvas()

    try {
      const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints)
      streamRef.current = stream

      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.muted = true
        await video.play()
      }

      setCameraState('ready')
      window.requestAnimationFrame(syncSignatureCanvas)
    } catch (cameraError) {
      stopStream()
      setCameraState('error')
      setError(getCameraErrorMessage(cameraError))
    }
  }, [cameraState, stopStream, syncSignatureCanvas])

  useEffect(() => {
    syncSignatureCanvas()

    const stage = stageRef.current
    if (!stage) {
      return
    }

    const observer = new ResizeObserver(() => syncSignatureCanvas())
    observer.observe(stage)
    window.addEventListener('orientationchange', syncSignatureCanvas)
    window.addEventListener('resize', syncSignatureCanvas)

    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', syncSignatureCanvas)
      window.removeEventListener('resize', syncSignatureCanvas)
    }
  }, [syncSignatureCanvas])

  const requestSignature = useCallback(() => {
    if (cameraState !== 'ready') {
      setError('먼저 카메라를 시작해 주세요.')
      return
    }

    setError('')
    setDownloaded(false)
    setIsSigning(true)
    setHasSignature(false)
    lastPointRef.current = null
    clearSignatureCanvas()
    window.requestAnimationFrame(syncSignatureCanvas)
  }, [cameraState, syncSignatureCanvas])

  const savePhoto = useCallback(async () => {
    const video = videoRef.current
    const stage = stageRef.current

    if (cameraState !== 'ready' || !video || !stage) {
      setError('카메라가 준비된 뒤 저장할 수 있어요.')
      return
    }

    if (!hasSignature) {
      setError('싸인을 먼저 받아 주세요.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const blob = await captureNeonSelfie({
        video,
        stage,
        signatureCanvas: signatureCanvasRef.current,
      })
      downloadBlob(blob, createFileName())
      setDownloaded(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : '사진 저장 중 문제가 생겼어요.',
      )
    } finally {
      setIsSaving(false)
    }
  }, [cameraState, hasSignature])

  const retake = useCallback(() => {
    setError('')
    setDownloaded(false)
    setIsSigning(false)
    setHasSignature(false)
    lastPointRef.current = null
    clearSignatureCanvas()

    if (cameraState === 'error') {
      setCameraState('idle')
    }
  }, [cameraState])

  const beginDrawing = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isSigning || cameraState !== 'ready') {
        return
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      syncSignatureCanvas()
      const point = getCanvasPoint(event)
      const context = signatureCanvasRef.current?.getContext('2d')
      if (context) {
        paintNeonDot(context, point)
        setHasSignature(true)
        setDownloaded(false)
      }
      lastPointRef.current = point
    },
    [cameraState, isSigning, syncSignatureCanvas],
  )

  const drawSignature = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isSigning || cameraState !== 'ready' || !lastPointRef.current) {
        return
      }

      event.preventDefault()
      const canvas = signatureCanvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) {
        return
      }

      const nextPoint = getCanvasPoint(event)
      paintNeonLine(context, lastPointRef.current, nextPoint)
      lastPointRef.current = nextPoint

      if (!hasSignature) {
        setHasSignature(true)
      }
      if (downloaded) {
        setDownloaded(false)
      }
    },
    [cameraState, downloaded, hasSignature, isSigning],
  )

  const endDrawing = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    lastPointRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const statusText = getStatusText({
    cameraState,
    downloaded,
    error,
    hasSignature,
    isSaving,
  })

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Neon Star Sign Selfie</h1>
      </header>

      <section className="capture-panel" aria-label="네온 스타 싸인 셀피 촬영">
        <div
          ref={stageRef}
          className={`camera-stage camera-stage--${cameraState} ${
            isSigning ? 'camera-stage--signing' : ''
          }`}
          aria-label="셀피 카메라 미리보기"
        >
          <div className="stage-backdrop" aria-hidden="true" />
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            muted
            playsInline
            aria-label="라이브 셀피 카메라"
          />
          <div className="stage-shine" aria-hidden="true" />
          <div className="viewfinder" aria-hidden="true" />
          <VirtualStar />
          <canvas
            ref={signatureCanvasRef}
            className={`signature-canvas ${isSigning ? 'signature-canvas--active' : ''}`}
            aria-label="직접 그리는 싸인 캔버스"
            onPointerDown={beginDrawing}
            onPointerMove={drawSignature}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            onPointerLeave={endDrawing}
          />
        </div>

        {error ? (
          <p className="error-message" role="alert">
            {error}
          </p>
        ) : null}

        <div className="controls" aria-label="촬영 제어">
          <ActionButton
            onClick={startCamera}
            disabled={cameraState === 'starting' || cameraState === 'ready'}
            variant="cyan"
            aria-busy={cameraState === 'starting'}
          >
            카메라 시작
          </ActionButton>
          <ActionButton
            onClick={requestSignature}
            disabled={cameraState !== 'ready'}
            variant="pink"
            aria-pressed={isSigning}
          >
            싸인 받기
          </ActionButton>
          <ActionButton
            onClick={savePhoto}
            disabled={cameraState !== 'ready' || !hasSignature || isSaving}
            variant="violet"
            aria-busy={isSaving}
          >
            사진 저장
          </ActionButton>
          <ActionButton
            onClick={retake}
            disabled={cameraState === 'starting'}
            variant="ghost"
          >
            다시 찍기
          </ActionButton>
        </div>

        <span className="sr-only" aria-live="polite">
          {statusText}
        </span>
      </section>
    </main>
  )
}

function clearSignatureCanvas() {
  const canvas = document.querySelector<HTMLCanvasElement>('.signature-canvas')
  const context = canvas?.getContext('2d')
  if (!canvas || !context) {
    return
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
}

function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
  const canvas = event.currentTarget
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

function paintNeonLine(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  if (distance < 1) {
    return
  }

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'

  context.shadowColor = 'rgba(53, 231, 255, 0.95)'
  context.shadowBlur = 18
  context.strokeStyle = 'rgba(53, 231, 255, 0.8)'
  context.lineWidth = 16
  drawSegment(context, from, to)

  context.shadowColor = 'rgba(255, 79, 184, 0.95)'
  context.shadowBlur = 14
  context.strokeStyle = '#ff4fb8'
  context.lineWidth = 8
  drawSegment(context, from, to)

  context.shadowColor = 'rgba(255, 255, 255, 0.9)'
  context.shadowBlur = 4
  context.strokeStyle = '#fff3a8'
  context.lineWidth = 3
  drawSegment(context, from, to)

  context.restore()
}

function paintNeonDot(
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
) {
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.shadowColor = 'rgba(53, 231, 255, 0.95)'
  context.shadowBlur = 18
  context.fillStyle = '#ff4fb8'
  context.beginPath()
  context.arc(point.x, point.y, 4, 0, Math.PI * 2)
  context.fill()
  context.shadowColor = 'rgba(255, 255, 255, 0.9)'
  context.shadowBlur = 4
  context.fillStyle = '#fff3a8'
  context.beginPath()
  context.arc(point.x, point.y, 1.8, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawSegment(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant: 'cyan' | 'pink' | 'violet' | 'ghost'
}

function ActionButton({
  children,
  className = '',
  variant,
  ...buttonProps
}: ActionButtonProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      className={`action-button action-button--${variant} ${className}`}
    >
      {children}
    </button>
  )
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return '카메라 권한이 거부됐어요. 브라우저 권한을 허용한 뒤 다시 시도해 주세요.'
    }

    if (error.name === 'NotFoundError') {
      return '사용할 수 있는 카메라를 찾지 못했어요.'
    }

    if (error.name === 'NotReadableError') {
      return '다른 앱이 카메라를 사용 중일 수 있어요.'
    }
  }

  if (!window.isSecureContext) {
    return '카메라는 localhost 또는 HTTPS 환경에서만 사용할 수 있어요.'
  }

  return '카메라를 시작하지 못했어요. 권한과 장치 상태를 확인해 주세요.'
}

function getStatusText({
  cameraState,
  downloaded,
  error,
  hasSignature,
  isSaving,
}: {
  cameraState: CameraState
  downloaded: boolean
  error: string
  hasSignature: boolean
  isSaving: boolean
}) {
  if (error) {
    return error
  }

  if (isSaving) {
    return 'PNG 저장 중'
  }

  if (downloaded) {
    return 'PNG 저장 완료'
  }

  if (hasSignature) {
    return '네온 싸인 표시됨'
  }

  if (cameraState === 'ready') {
    return '카메라 준비 완료'
  }

  if (cameraState === 'starting') {
    return '카메라 시작 중'
  }

  return '카메라 대기 중'
}

function createFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `neon-star-sign-selfie-${stamp}.png`
}

export default App
