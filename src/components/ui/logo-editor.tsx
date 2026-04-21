'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Upload,
  X,
  Check,
  Crop as CropIcon,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Smartphone,
  Monitor,
  FileText,
  LayoutDashboard,
  Image as ImageIcon,
  Sparkles,
  Building2,
  Maximize,
  Square,
  RectangleHorizontal,
} from 'lucide-react'

interface LogoEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLogo?: string | null
  onSave: (file: File) => Promise<void>
  isUploading?: boolean
  organizationName?: string
  organizationShortName?: string
}

interface PreviewContext {
  id: string
  name: string
  icon: React.ElementType
  size: { width: number; height: number }
  description: string
  showFull?: boolean
}

const previewContexts: PreviewContext[] = [
  { id: 'sidebar', name: 'Sidebar', icon: LayoutDashboard, size: { width: 40, height: 40 }, description: 'Navigation header', showFull: true },
  { id: 'login', name: 'Login Page', icon: Monitor, size: { width: 200, height: 80 }, description: 'Sign-in screen', showFull: true },
  { id: 'report', name: 'Reports', icon: FileText, size: { width: 150, height: 60 }, description: 'PDF & print', showFull: true },
  { id: 'mobile', name: 'Favicon', icon: Smartphone, size: { width: 32, height: 32 }, description: 'Browser tab', showFull: false },
]

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop | null,
  maxWidth: number = 800,
  maxHeight: number = 400
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  let sourceX = 0, sourceY = 0, sourceWidth = image.naturalWidth, sourceHeight = image.naturalHeight

  if (crop) {
    sourceX = crop.x * scaleX
    sourceY = crop.y * scaleY
    sourceWidth = crop.width * scaleX
    sourceHeight = crop.height * scaleY
  }

  // Calculate output dimensions maintaining aspect ratio
  let outputWidth = sourceWidth
  let outputHeight = sourceHeight

  if (outputWidth > maxWidth) {
    outputHeight = (maxWidth / outputWidth) * outputHeight
    outputWidth = maxWidth
  }
  if (outputHeight > maxHeight) {
    outputWidth = (maxHeight / outputHeight) * outputWidth
    outputHeight = maxHeight
  }

  canvas.width = outputWidth
  canvas.height = outputHeight

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      'image/png',
      1
    )
  })
}

type AspectOption = 'original' | '1:1' | '4:3' | '16:9' | '3:1'

export function LogoEditor({ 
  open, 
  onOpenChange, 
  currentLogo, 
  onSave, 
  isUploading,
  organizationName = 'Organization',
  organizationShortName = 'ORG'
}: LogoEditorProps) {
  const displayName = organizationShortName || organizationName?.split(' ')[0] || 'ORG'
  const fullName = organizationName || 'Organization'
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [aspectOption, setAspectOption] = useState<AspectOption>('original')
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [activePreview, setActivePreview] = useState('login')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'crop' | 'preview'>('upload')
  const [useCrop, setUseCrop] = useState(false)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getAspectValue = (option: AspectOption): number | undefined => {
    switch (option) {
      case '1:1': return 1
      case '4:3': return 4/3
      case '16:9': return 16/9
      case '3:1': return 3/1
      default: return undefined
    }
  }

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setImageSrc(null)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setScale(1)
      setRotate(0)
      setPreviewUrl(null)
      setStep('upload')
      setAspectOption('original')
      setUseCrop(false)
      setOriginalDimensions(null)
    }
  }, [open])

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string)
      setStep('crop')
    })
    reader.readAsDataURL(file)
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget
    setOriginalDimensions({ width: naturalWidth, height: naturalHeight })
    
    // If original aspect, don't set a crop - use full image
    if (aspectOption === 'original') {
      setCrop(undefined)
      setUseCrop(false)
    } else {
      const aspectValue = getAspectValue(aspectOption)
      if (aspectValue) {
        const newCrop = centerAspectCrop(width, height, aspectValue)
        setCrop(newCrop)
        setUseCrop(true)
      }
    }
  }, [aspectOption])

  const handleAspectChange = (newAspect: AspectOption) => {
    setAspectOption(newAspect)
    if (newAspect === 'original') {
      setCrop(undefined)
      setUseCrop(false)
    } else if (imgRef.current) {
      const { width, height } = imgRef.current
      const aspectValue = getAspectValue(newAspect)
      if (aspectValue) {
        setCrop(centerAspectCrop(width, height, aspectValue))
        setUseCrop(true)
      }
    }
  }

  const generatePreview = useCallback(async () => {
    if (!imgRef.current) return

    try {
      const blob = await getCroppedImg(
        imgRef.current, 
        useCrop && completedCrop ? completedCrop : null,
        800,
        400
      )
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setStep('preview')
    } catch (err) {
      console.error('Failed to generate preview:', err)
    }
  }, [completedCrop, useCrop])

  const handleSave = async () => {
    if (!previewUrl) return

    try {
      const response = await fetch(previewUrl)
      const blob = await response.blob()
      const file = new File([blob], 'logo.png', { type: 'image/png' })
      await onSave(file)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save logo:', err)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string)
        setStep('crop')
      })
      reader.readAsDataURL(file)
    }
  }, [])

  const aspectRatio = originalDimensions 
    ? (originalDimensions.width / originalDimensions.height).toFixed(2) 
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-emerald-700" />
            </div>
            Logo Editor
          </DialogTitle>
          <DialogDescription>
            Upload your organization logo - supports any aspect ratio
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-3 border-b">
          {['upload', 'crop', 'preview'].map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => {
                  if (s === 'upload') setStep('upload')
                  else if (s === 'crop' && imageSrc) setStep('crop')
                  else if (s === 'preview' && previewUrl) setStep('preview')
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  step === s
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                  step === s ? "bg-primary text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {i + 1}
                </span>
                <span className="capitalize">{s === 'crop' ? 'Adjust' : s}</span>
              </button>
              {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                className="hidden"
              />
              
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="w-full max-w-md p-8 border-2 border-dashed border-gray-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors cursor-pointer text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-primary flex items-center justify-center">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Logo</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Drag and drop an image, or click to browse
                </p>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">
                    Supports: PNG, JPG, GIF, SVG, WebP (Max 5MB)
                  </div>
                  <div className="text-xs text-emerald-600 font-medium">
                    Any aspect ratio supported (wide logos recommended)
                  </div>
                </div>
              </div>

              {currentLogo && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">Current Logo:</p>
                  <div className="max-w-xs mx-auto rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm p-3 checkerboard">
                    <img src={currentLogo} alt="Current logo" className="max-h-20 w-auto mx-auto object-contain" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Adjust */}
          {step === 'crop' && imageSrc && (
            <div className="space-y-4">
              {/* Info Bar */}
              {originalDimensions && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-800">
                      <strong>Original:</strong> {originalDimensions.width} × {originalDimensions.height}px
                    </span>
                    <span className="text-emerald-700">
                      <strong>Ratio:</strong> {aspectRatio}:1
                    </span>
                  </div>
                  <span className="text-emerald-700 text-xs">
                    {originalDimensions.width > originalDimensions.height ? 'Wide/Horizontal Logo' : 
                     originalDimensions.width < originalDimensions.height ? 'Tall/Vertical Logo' : 'Square Logo'}
                  </span>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700">Crop:</Label>
                  <div className="flex gap-1">
                    {[
                      { value: 'original' as AspectOption, label: 'Keep Original', icon: Maximize },
                      { value: '1:1' as AspectOption, label: '1:1', icon: Square },
                      { value: '4:3' as AspectOption, label: '4:3', icon: RectangleHorizontal },
                      { value: '3:1' as AspectOption, label: '3:1 Wide', icon: RectangleHorizontal },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleAspectChange(opt.value)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors",
                          aspectOption === opt.value
                            ? "bg-primary text-white"
                            : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                        )}
                      >
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
                  <button
                    onClick={() => setScale(Math.min(3, scale + 0.1))}
                    className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4 text-gray-600" />
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-2" />
                  <button
                    onClick={() => setRotate((r) => (r + 90) % 360)}
                    className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
                    title="Rotate 90°"
                  >
                    <RotateCw className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Image Area */}
              <div className="flex justify-center bg-gray-100 rounded-xl p-4 min-h-[300px]">
                {useCrop ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={getAspectValue(aspectOption)}
                    className="max-h-[280px]"
                  >
                    <img
                      ref={imgRef}
                      alt="Crop preview"
                      src={imageSrc}
                      onLoad={onImageLoad}
                      style={{
                        transform: `scale(${scale}) rotate(${rotate}deg)`,
                        maxHeight: '280px',
                      }}
                      className="rounded-lg"
                    />
                  </ReactCrop>
                ) : (
                  <img
                    ref={imgRef}
                    alt="Logo preview"
                    src={imageSrc}
                    onLoad={onImageLoad}
                    style={{
                      transform: `scale(${scale}) rotate(${rotate}deg)`,
                      maxHeight: '280px',
                    }}
                    className="rounded-lg"
                  />
                )}
              </div>

              {aspectOption === 'original' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-sm text-emerald-700 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <strong>Recommended:</strong> Your logo will be used at its original aspect ratio for the best quality.
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Change Image
                </Button>
                <Button onClick={generatePreview}>
                  <Check className="h-4 w-4 mr-2" />
                  Continue to Preview
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && previewUrl && (
            <div className="space-y-6">
              {/* Preview Tabs */}
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
                {previewContexts.map((ctx) => (
                  <button
                    key={ctx.id}
                    onClick={() => setActivePreview(ctx.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                      activePreview === ctx.id
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <ctx.icon className="h-4 w-4" />
                    {ctx.name}
                  </button>
                ))}
              </div>

              {/* Preview Mockups */}
              <div className="grid grid-cols-1 gap-6">
                {/* Sidebar Preview */}
                {activePreview === 'sidebar' && (
                  <div className="flex justify-center">
                    <div className="bg-primary rounded-xl p-4 w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                          <img src={previewUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[14px] font-bold text-primary-foreground truncate">{displayName} Finance</h3>
                          <p className="text-[11px] text-primary-foreground/70">Enterprise ERP</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-1">
                        <div className="flex items-center gap-3 px-3 py-2 bg-primary-light/30 rounded-lg">
                          <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
                          <span className="text-sm text-primary-foreground">Dashboard</span>
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 text-primary-foreground/80 hover:bg-primary-light/20 rounded-lg">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">Reports</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Login Preview */}
                {activePreview === 'login' && (
                  <div className="flex justify-center">
                    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-xl p-8 w-[400px] shadow-inner">
                      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <div className="max-w-[280px] mx-auto mb-4 p-4 rounded-xl bg-white border border-gray-100">
                          <img src={previewUrl} alt="Logo" className="max-h-16 w-auto mx-auto object-contain" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome Back</h2>
                        <p className="text-sm text-gray-500 mb-4">Sign in to your account</p>
                        <div className="space-y-3">
                          <div className="h-10 bg-gray-100 rounded-lg" />
                          <div className="h-10 bg-gray-100 rounded-lg" />
                          <div className="h-10 bg-primary rounded-lg" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Report Preview */}
                {activePreview === 'report' && (
                  <div className="flex justify-center">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 w-[550px] shadow-sm">
                      <div className="flex items-start justify-between pb-4 border-b-2 border-gray-800">
                        <div className="flex items-center gap-4">
                          <div className="max-w-[180px] p-2 rounded-lg bg-white">
                            <img src={previewUrl} alt="Logo" className="max-h-14 w-auto object-contain" />
                          </div>
                          <div>
                            <h1 className="text-base font-bold text-gray-900">{fullName}</h1>
                            <p className="text-xs text-gray-600">123 Main Street, Kabul, Afghanistan</p>
                            <p className="text-xs text-gray-600">Tel: +93 20 123 4567</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 text-center py-3 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900">Financial Report</h2>
                        <p className="text-sm text-gray-600">For the Period Ending December 31, 2024</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                          <span className="text-gray-600">1000 - Cash & Bank</span>
                          <span className="font-medium">$150,000.00</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                          <span className="text-gray-600">2000 - Accounts Payable</span>
                          <span className="font-medium">$45,000.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Favicon Preview */}
                {activePreview === 'mobile' && (
                  <div className="flex justify-center">
                    <div className="space-y-6">
                      {/* Browser Tab */}
                      <div className="bg-gray-200 rounded-t-lg p-2">
                        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 max-w-xs">
                          <div className="w-4 h-4 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                            <img src={previewUrl} alt="Favicon" className="w-full h-full object-contain" />
                          </div>
                          <span className="text-xs text-gray-700 truncate">{displayName} Finance - Dashboard</span>
                          <X className="h-3 w-3 text-gray-400 ml-auto" />
                        </div>
                      </div>
                      
                      {/* Mobile App Icon */}
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-3">Mobile App Icon</p>
                        <div className="inline-flex flex-col items-center gap-2">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-lg border border-gray-200 p-2">
                            <img src={previewUrl} alt="App Icon" className="w-full h-full object-contain" />
                          </div>
                          <span className="text-xs text-gray-600">{displayName} Finance</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Preview & Actions */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-900">Logo ready to save!</h4>
                    <p className="text-sm text-emerald-700">Will be applied across the entire system</p>
                  </div>
                </div>
                <div className="max-w-[120px] p-2 rounded-xl bg-white shadow-sm checkerboard">
                  <img src={previewUrl} alt="Final" className="max-h-12 w-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {step === 'preview' && (
                <Button variant="outline" onClick={() => setStep('crop')}>
                  Back to Adjust
                </Button>
              )}
              {step === 'preview' && (
                <Button onClick={handleSave} disabled={isUploading} className="bg-primary hover:bg-emerald-800">
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Logo
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
