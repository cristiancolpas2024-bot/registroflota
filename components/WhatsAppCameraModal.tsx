import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  SwitchCamera, 
  Check, 
  Image as ImageIcon, 
  Trash2, 
  Zap, 
  ZapOff, 
  Loader2, 
  AlertTriangle, 
  Camera as CameraIcon,
  Plus
} from 'lucide-react';
import { processImageWithWatermark } from '../utils';

interface WhatsAppCameraModalProps {
  plate: string;
  calibrationDate: string;
  initialPhotos?: string[];
  maxPhotos?: number;
  onConfirm: (photos: string[]) => void;
  onClose: () => void;
}

const WhatsAppCameraModal: React.FC<WhatsAppCameraModalProps> = ({
  plate,
  calibrationDate,
  initialPhotos = [],
  maxPhotos = 8,
  onConfirm,
  onClose,
}) => {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const systemCameraInputRef = useRef<HTMLInputElement>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | undefined>(undefined);

  // Pre-fetch geolocation once when camera modal mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  // Initialize and switch camera stream
  useEffect(() => {
    let isMounted = true;
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      setCameraError(null);
      setTorchOn(false);

      // Stop previous tracks
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Tu navegador no soporta cámara en vivo. Puedes usar las opciones de selección.");
        return;
      }

      try {
        let mediaStream: MediaStream;
        try {
          const constraints: MediaStreamConstraints = {
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          console.warn("Retrying camera with generic constraints:", initialErr);
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false
          });
        }

        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }

        // Check if track supports torch/flash
        const track = mediaStream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const cap = track.getCapabilities() as any;
          setHasTorch(!!cap?.torch);
        } else {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.warn("Fallo al acceder a la cámara en vivo:", err);
        setCameraError(
          err?.name === 'NotAllowedError' 
            ? "Permiso de cámara denegado. Puedes usar la cámara del sistema o la galería abajo." 
            : "No se pudo iniciar la cámara en vivo. Usa las opciones alternativas de captura."
        );
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any]
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn("No se pudo alternar la linterna:", err);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // WhatsApp-style instantaneous capture
  const captureFrame = async () => {
    if (!videoRef.current || isProcessing || photos.length >= maxPhotos) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      // If live camera is not ready yet, trigger native system camera
      systemCameraInputRef.current?.click();
      return;
    }

    // Gentle flash effect (non-blinding, never stays stuck)
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 70);

    // Haptic feedback
    if (navigator.vibrate) {
      try { navigator.vibrate(40); } catch (_) {}
    }

    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawBase64 = canvas.toDataURL('image/jpeg', 0.85);

      try {
        const stamped = await processImageWithWatermark(rawBase64, plate, coordsRef.current, calibrationDate);
        setPhotos((prev) => [...prev, stamped].slice(0, maxPhotos));
      } catch (watermarkErr) {
        console.warn("Watermark error in captureFrame, using raw photo:", watermarkErr);
        setPhotos((prev) => [...prev, rawBase64].slice(0, maxPhotos));
      }
    } catch (err) {
      console.error("Error en captureFrame:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process incoming files from Gallery or System Camera
  const handleIncomingFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    const fileList = Array.from(files);
    for (const file of fileList) {
      if (photos.length >= maxPhotos) break;
      if (!file.type.startsWith('image/') && !file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) continue;

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const stamped = await processImageWithWatermark(base64, plate, coordsRef.current, calibrationDate);
        setPhotos((prev) => [...prev, stamped].slice(0, maxPhotos));
      } catch (err) {
        console.error("Error al procesar foto:", err);
      }
    }

    setIsProcessing(false);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (systemCameraInputRef.current) systemCameraInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    if (previewPhoto && previewPhoto === photos[index]) {
      setPreviewPhoto(null);
    }
  };

  const handleConfirm = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    onConfirm(photos);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {/* Visual Flash effect overlay */}
      {flashAnimation && (
        <div className="absolute inset-0 bg-white/40 z-50 pointer-events-none transition-opacity duration-75" />
      )}

      {/* TOP BAR */}
      <div className="relative z-20 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          type="button"
          onClick={handleClose}
          className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-all text-white"
          title="Cerrar cámara"
        >
          <X size={22} />
        </button>

        {/* Plate & Count Indicator */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-600/90 text-white rounded-full text-xs font-black uppercase tracking-wider shadow">
            {plate || 'VEHÍCULO'}
          </span>
          <span className="px-2.5 py-1 bg-white/20 text-white rounded-full text-xs font-black tracking-widest backdrop-blur-xs">
            {photos.length}/{maxPhotos} FOTOS
          </span>
        </div>

        {/* Action icons: Torch & Camera flip */}
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2.5 rounded-full transition-all ${
                torchOn ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/50' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Linterna"
            >
              {torchOn ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
          )}

          <button
            type="button"
            onClick={toggleCameraFacing}
            className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-all text-white"
            title="Cambiar cámara"
          >
            <SwitchCamera size={22} />
          </button>
        </div>
      </div>

      {/* CENTER VIEWFINDER AREA */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-950">
        {!cameraError ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            {/* Subtle WhatsApp-style grid focus corners */}
            <div className="absolute inset-8 sm:inset-16 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-5 h-5 border-t-2 border-l-2 border-white/70" />
                <div className="w-5 h-5 border-t-2 border-r-2 border-white/70" />
              </div>
              <div className="flex justify-between">
                <div className="w-5 h-5 border-b-2 border-l-2 border-white/70" />
                <div className="w-5 h-5 border-b-2 border-r-2 border-white/70" />
              </div>
            </div>
          </>
        ) : (
          /* Fallback view when live camera is blocked or unavailable */
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase text-white">Cámara en vivo no disponible</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
            </div>

            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={() => systemCameraInputRef.current?.click()}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <CameraIcon size={18} /> Tomar con Cámara del Sistema
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <ImageIcon size={18} /> Seleccionar de Galería
              </button>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold text-white border border-white/10 shadow-lg z-30">
            <Loader2 size={16} className="animate-spin text-indigo-400" />
            <span>Procesando evidencia...</span>
          </div>
        )}

        {/* Single Photo Zoom Preview Modal */}
        {previewPhoto && (
          <div 
            className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewPhoto(null)}
          >
            <img src={previewPhoto} alt="Previsualización" className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl" />
            <p className="text-xs font-bold text-slate-400 mt-3 uppercase">Toque en cualquier parte para volver</p>
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: THUMBNAILS REEL + WHATSAPP CONTROLS */}
      <div className="relative z-20 bg-gradient-to-t from-black via-black/85 to-transparent pt-3 pb-6 px-4 space-y-3">
        
        {/* Thumbnails Reel (WhatsApp Style Carousel) */}
        {photos.length > 0 ? (
          <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 scrollbar-none">
            {photos.map((photo, idx) => (
              <div 
                key={idx} 
                onClick={() => setPreviewPhoto(photo)}
                className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-white/70 shadow-lg cursor-pointer group active:scale-95 transition-all"
              >
                <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 left-0.5 bg-black/80 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(idx);
                  }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-md hover:bg-rose-700"
                  title="Eliminar foto"
                >
                  ×
                </button>
              </div>
            ))}

            {photos.length < maxPhotos && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-dashed border-white/40 flex flex-col items-center justify-center text-white/70 hover:border-white hover:text-white bg-white/5 transition-all"
                title="Agregar más fotos"
              >
                <Plus size={20} />
                <span className="text-[8px] font-bold mt-0.5 uppercase">Más</span>
              </button>
            )}
          </div>
        ) : (
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Toca el disparador para tomar fotos continuas o elige de la galería
          </p>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="flex items-center justify-between max-w-md mx-auto pt-1">
          
          {/* Gallery Button (Left) */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex flex-col items-center justify-center transition-all text-white"
            title="Seleccionar de galería"
          >
            <ImageIcon size={22} />
          </button>

          {/* Shutter Button (Center - WhatsApp Signature Ring) */}
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              disabled={isProcessing || photos.length >= maxPhotos}
              onClick={captureFrame}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform shadow-2xl disabled:opacity-40"
              title="Tomar foto"
            >
              <div className="w-full h-full rounded-full bg-white active:bg-slate-300 transition-colors shadow-inner" />
            </button>
          </div>

          {/* WhatsApp Confirm / Send Button (Right) */}
          <button
            type="button"
            disabled={photos.length === 0}
            onClick={handleConfirm}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${
              photos.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/50 ring-4 ring-emerald-500/20'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
            title="Confirmar fotos"
          >
            <Check size={26} strokeWidth={3} />
            {photos.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-white text-emerald-700 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {photos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hidden File Inputs for simultaneous selection */}
      <input
        ref={galleryInputRef}
        type="file"
        multiple
        accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleIncomingFiles(e.target.files)}
      />

      <input
        ref={systemCameraInputRef}
        type="file"
        multiple
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleIncomingFiles(e.target.files)}
      />
    </div>
  );
};

export default WhatsAppCameraModal;
