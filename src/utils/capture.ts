type CaptureNeonSelfieOptions = {
  video: HTMLVideoElement
  stage: HTMLElement
  signatureCanvas: HTMLCanvasElement | null
}

type Point = [number, number]

const CAPTURE_SCALE = 2
const STAR_POINTS: Point[] = [
  [160, 37],
  [190, 116],
  [275, 121],
  [209, 174],
  [232, 257],
  [160, 211],
  [88, 257],
  [111, 174],
  [45, 121],
  [130, 116],
]

export async function captureNeonSelfie({
  video,
  stage,
  signatureCanvas,
}: CaptureNeonSelfieOptions) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new Error('카메라 프레임이 아직 준비되지 않았어요.')
  }

  const stageRect = stage.getBoundingClientRect()
  const width = Math.max(1, Math.round(stageRect.width * CAPTURE_SCALE))
  const height = Math.max(1, Math.round(stageRect.height * CAPTURE_SCALE))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('캔버스를 만들지 못했어요.')
  }

  drawMirroredContainVideo(context, video, width, height)
  drawStageLighting(context, width, height)
  drawStarCharacter(context, width, height)
  drawSignatureCanvas(context, signatureCanvas, width, height)

  return canvasToPngBlob(canvas)
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

function drawMirroredContainVideo(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
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
  cyanGlow.addColorStop(0, 'rgba(53, 231, 255, 0.18)')
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
  pinkGlow.addColorStop(0, 'rgba(255, 79, 184, 0.22)')
  pinkGlow.addColorStop(1, 'rgba(255, 79, 184, 0)')
  context.fillStyle = pinkGlow
  context.fillRect(0, 0, width, height)

  const vignette = context.createLinearGradient(0, height * 0.52, 0, height)
  vignette.addColorStop(0, 'rgba(5, 7, 17, 0)')
  vignette.addColorStop(1, 'rgba(5, 7, 17, 0.36)')
  context.fillStyle = vignette
  context.fillRect(0, 0, width, height)
}

function drawStarCharacter(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const starSize = width * 0.42
  const scale = starSize / 320
  const x = width * 0.53
  const y = height * 0.1

  context.save()
  context.translate(x, y)
  context.scale(scale, scale)

  const aura = context.createRadialGradient(160, 160, 10, 160, 160, 152)
  aura.addColorStop(0, 'rgba(53, 231, 255, 0.24)')
  aura.addColorStop(0.64, 'rgba(255, 79, 184, 0.12)')
  aura.addColorStop(1, 'rgba(53, 231, 255, 0)')
  context.fillStyle = aura
  context.fillRect(0, 0, 320, 320)

  drawPath(context, [
    [122, 86],
    [137, 41],
    [161, 76],
    [187, 41],
    [199, 86],
  ])
  context.fillStyle = '#ffeb7a'
  context.shadowBlur = 20
  context.shadowColor = 'rgba(255, 79, 184, 0.62)'
  context.fill()
  context.lineWidth = 4
  context.strokeStyle = '#ff4fb8'
  context.stroke()

  drawPath(context, STAR_POINTS)
  const bodyGradient = context.createLinearGradient(44, 42, 246, 266)
  bodyGradient.addColorStop(0, '#fff6a8')
  bodyGradient.addColorStop(0.48, '#ffe66d')
  bodyGradient.addColorStop(1, '#ff8bd8')
  context.fillStyle = bodyGradient
  context.shadowBlur = 26
  context.shadowColor = 'rgba(53, 231, 255, 0.78)'
  context.fill()
  context.lineWidth = 4
  context.strokeStyle = 'rgba(255, 255, 255, 0.86)'
  context.stroke()
  context.shadowBlur = 0

  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#ffe66d'
  context.lineWidth = 10
  drawCurve(context, [102, 174], [78, 184], [60, 201], [47, 225])
  drawCurve(context, [214, 164], [244, 159], [262, 171], [277, 192])

  context.fillStyle = '#0b1022'
  drawCircle(context, 132, 150, 9)
  drawCircle(context, 183, 150, 9)
  context.fillStyle = 'rgba(255, 126, 207, 0.82)'
  drawCircle(context, 112, 172, 10)
  drawCircle(context, 203, 172, 10)

  context.strokeStyle = '#0b1022'
  context.lineWidth = 5
  drawCurve(context, [139, 178], [151, 190], [169, 190], [181, 178])

  context.save()
  context.translate(246, 188)
  context.rotate((-18 * Math.PI) / 180)
  roundedRect(context, 0, 0, 34, 50, 16)
  context.fillStyle = '#35e7ff'
  context.strokeStyle = '#ffffff'
  context.lineWidth = 4
  context.fill()
  context.stroke()
  context.strokeStyle = '#ffffff'
  context.lineWidth = 4
  drawLine(context, 8, 16, 26, 16)
  drawLine(context, 8, 27, 26, 27)
  drawLine(context, 17, 50, 17, 78)
  drawLine(context, 2, 78, 32, 78)
  context.restore()

  context.restore()
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

function drawPath(context: CanvasRenderingContext2D, points: Point[]) {
  context.beginPath()
  points.forEach(([x, y], index) => {
    if (index === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  })
  context.closePath()
}

function drawCurve(
  context: CanvasRenderingContext2D,
  start: Point,
  controlA: Point,
  controlB: Point,
  end: Point,
) {
  context.beginPath()
  context.moveTo(...start)
  context.bezierCurveTo(...controlA, ...controlB, ...end)
  context.stroke()
}

function drawLine(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  context.beginPath()
  context.moveTo(startX, startY)
  context.lineTo(endX, endY)
  context.stroke()
}

function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
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
