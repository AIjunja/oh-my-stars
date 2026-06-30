type CaptureNeonSelfieOptions = {
  video: HTMLVideoElement
  stage: HTMLElement
  signatureCanvas: HTMLCanvasElement | null
  mirrorVideo: boolean
}

type DrawNeonSelfieFrameOptions = CaptureNeonSelfieOptions & {
  canvas: HTMLCanvasElement
  scale?: number
}

const CAPTURE_SCALE = 2

export async function captureNeonSelfie({
  video,
  stage,
  signatureCanvas,
  mirrorVideo,
}: CaptureNeonSelfieOptions) {
  const canvas = document.createElement('canvas')
  drawNeonSelfieFrame({
    video,
    stage,
    signatureCanvas,
    mirrorVideo,
    canvas,
    scale: CAPTURE_SCALE,
  })

  return canvasToPngBlob(canvas)
}

export function drawNeonSelfieFrame({
  video,
  stage,
  signatureCanvas,
  mirrorVideo,
  canvas,
  scale = CAPTURE_SCALE,
}: DrawNeonSelfieFrameOptions) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new Error('카메라 프레임이 아직 준비되지 않았어요.')
  }

  const stageRect = stage.getBoundingClientRect()
  const width = Math.max(1, Math.round(stageRect.width * scale))
  const height = Math.max(1, Math.round(stageRect.height * scale))

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('캔버스를 만들지 못했어요.')
  }

  drawContainVideo(context, video, width, height, mirrorVideo)
  drawStageLighting(context, width, height)
  drawSignatureCanvas(context, signatureCanvas, width, height)
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function drawContainVideo(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  mirrorVideo: boolean,
) {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight

  if (!videoWidth || !videoHeight) {
    throw new Error('카메라 해상도를 아직 읽지 못했어요.')
  }

  const scale = Math.min(width / videoWidth, height / videoHeight)
  const targetWidth = videoWidth * scale
  const targetHeight = videoHeight * scale
  const targetX = (width - targetWidth) / 2
  const targetY = (height - targetHeight) / 2

  context.save()
  context.fillStyle = '#050711'
  context.fillRect(0, 0, width, height)

  if (mirrorVideo) {
    context.translate(targetX + targetWidth, targetY)
    context.scale(-1, 1)
    context.drawImage(
      video,
      0,
      0,
      videoWidth,
      videoHeight,
      0,
      0,
      targetWidth,
      targetHeight,
    )
  } else {
    context.drawImage(
      video,
      0,
      0,
      videoWidth,
      videoHeight,
      targetX,
      targetY,
      targetWidth,
      targetHeight,
    )
  }

  context.restore()
}

function drawStageLighting(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const cyanGlow = context.createRadialGradient(
    width * 0.18,
    height * 0.16,
    0,
    width * 0.18,
    height * 0.16,
    width * 0.72,
  )
  cyanGlow.addColorStop(0, 'rgba(53, 231, 255, 0.12)')
  cyanGlow.addColorStop(1, 'rgba(53, 231, 255, 0)')
  context.fillStyle = cyanGlow
  context.fillRect(0, 0, width, height)

  const pinkGlow = context.createRadialGradient(
    width * 0.78,
    height * 0.72,
    0,
    width * 0.78,
    height * 0.72,
    width * 0.68,
  )
  pinkGlow.addColorStop(0, 'rgba(255, 79, 184, 0.14)')
  pinkGlow.addColorStop(1, 'rgba(255, 79, 184, 0)')
  context.fillStyle = pinkGlow
  context.fillRect(0, 0, width, height)

  const vignette = context.createLinearGradient(0, height * 0.52, 0, height)
  vignette.addColorStop(0, 'rgba(5, 7, 17, 0)')
  vignette.addColorStop(1, 'rgba(5, 7, 17, 0.28)')
  context.fillStyle = vignette
  context.fillRect(0, 0, width, height)
}

function drawSignatureCanvas(
  context: CanvasRenderingContext2D,
  signatureCanvas: HTMLCanvasElement | null,
  width: number,
  height: number,
) {
  if (!signatureCanvas?.width || !signatureCanvas.height) {
    return
  }

  context.drawImage(signatureCanvas, 0, 0, width, height)
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('PNG 파일을 만들지 못했어요.'))
      }
    }, 'image/png')
  })
}
