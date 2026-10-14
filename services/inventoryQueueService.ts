import { InventoryQueueItem, VehicleInventoryPayload } from '../types';
import { uploadImageToDrive, submitVehicleInventory } from './sheetService';

const DB_NAME = 'bqa_inventory_db';
const DB_VERSION = 1;
const STORE_NAME = 'inventory_queue';

let dbInstance: IDBDatabase | null = null;
let isProcessing = false;
let cachedQueueCount = 0;
const listeners = new Set<(items: InventoryQueueItem[]) => void>();

// Inicializar la base de datos IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no soportado en este entorno'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Error abriendo IndexedDB:', request.error);
      reject(request.error);
    };
  });
};

// Obtener todos los registros en la cola
export const getQueueItems = async (): Promise<InventoryQueueItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: InventoryQueueItem[] = req.result || [];
        // Ordenar por fecha de creación ascendente (los más antiguos primero)
        items.sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
      req.onerror = () => {
        console.error('Error al leer cola IndexedDB:', req.error);
        resolve([]);
      };
    });
  } catch (e) {
    console.error('getQueueItems exception:', e);
    return [];
  }
};

// Guardar o actualizar un registro en la cola
export const saveQueueItem = async (item: InventoryQueueItem): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => {
      notifyListeners();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
};

// Eliminar un registro de la cola
export const deleteQueueItem = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => {
      notifyListeners();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
};

// Suscribirse a cambios en la cola
export const subscribeToInventoryQueue = (callback: (items: InventoryQueueItem[]) => void): (() => void) => {
  listeners.add(callback);
  // Emitir estado inicial
  getQueueItems().then((items) => callback(items)).catch(() => {});
  return () => {
    listeners.delete(callback);
  };
};

const notifyListeners = async () => {
  const items = await getQueueItems();
  cachedQueueCount = items.length;
  if (listeners.size === 0) return;
  listeners.forEach((fn) => {
    try {
      fn(items);
    } catch (e) {
      console.error('Error en listener de cola:', e);
    }
  });
};

// Generar ID único: fecha + placa + timestamp
export const generateInventoryId = (fecha: string, plate: string): string => {
  const cleanFecha = (fecha || '').replace(/[^0-9]/g, '');
  const cleanPlate = (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const timestamp = Date.now();
  return `${cleanFecha}_${cleanPlate}_${timestamp}`;
};

// Guardar nuevo inventario en la cola local (tarda < 100ms)
export const enqueueInventory = async (
  data: Omit<InventoryQueueItem, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt' | 'uploadedUrls'> & {
    id?: string;
  }
): Promise<InventoryQueueItem> => {
  const id = data.id || generateInventoryId(data.fecha, data.plate);
  const now = Date.now();

  const newItem: InventoryQueueItem = {
    ...data,
    id,
    uploadedUrls: {},
    status: 'pending',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await saveQueueItem(newItem);
  
  // Disparar proceso en segundo plano inmediatamente
  setTimeout(() => {
    processQueue();
  }, 50);

  return newItem;
};

// Subir fotos en paralelo (máximo 3 a la vez)
async function uploadPhotosInParallel(
  item: InventoryQueueItem,
  onPhotoUploaded: (key: string, url: string) => Promise<void>
): Promise<Record<string, string>> {
  const plateClean = item.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Lista de fotos a procesar
  const photos: Array<{ key: string; name: string; value?: string }> = [
    { key: 'fotoFrontal', name: `INV_FRONTAL_${plateClean}`, value: item.fotoFrontal },
    { key: 'fotoLateralIzq', name: `INV_LATIZQ_${plateClean}`, value: item.fotoLateralIzq },
    { key: 'fotoLateralDer', name: `INV_LATDER_${plateClean}`, value: item.fotoLateralDer },
    { key: 'fotoTrasera', name: `INV_TRASERA_${plateClean}`, value: item.fotoTrasera },
    { key: 'estriboIzq', name: `INV_ESTRIBO_IZQ_${plateClean}`, value: item.estriboIzq },
    { key: 'estriboDer', name: `INV_ESTRIBO_DER_${plateClean}`, value: item.estriboDer },
    { key: 'novedad1', name: `INV_NOV1_${plateClean}`, value: item.novedad1 },
    { key: 'novedad2', name: `INV_NOV2_${plateClean}`, value: item.novedad2 },
    { key: 'novedad3', name: `INV_NOV3_${plateClean}`, value: item.novedad3 },
  ];

  const currentUploaded = { ...(item.uploadedUrls || {}) };

  // Filtrar fotos pendientes de subir (que no tengan URL http ya guardada)
  const pendingPhotos: Array<{ key: string; name: string; base64: string }> = [];
  for (const p of photos) {
    if (!p.value) continue;
    // Si ya fue subida y tenemos el URL http en currentUploaded
    if (currentUploaded[p.key as keyof typeof currentUploaded] && currentUploaded[p.key as keyof typeof currentUploaded]?.startsWith('http')) {
      continue;
    }
    // Si ya era un enlace http
    if (p.value.startsWith('http')) {
      currentUploaded[p.key as keyof typeof currentUploaded] = p.value;
      continue;
    }
    pendingPhotos.push({ key: p.key, name: p.name, base64: p.value });
  }

  if (pendingPhotos.length === 0) {
    return currentUploaded;
  }

  // Ejecución en paralelo con concurrencia máxima 3
  const MAX_CONCURRENCY = 3;
  let cursor = 0;
  let hasError = false;
  let firstErrorMessage = '';

  const runWorker = async () => {
    while (cursor < pendingPhotos.length && !hasError) {
      const idx = cursor++;
      const itemToUpload = pendingPhotos[idx];
      try {
        const driveUrl = await uploadImageToDrive(itemToUpload.base64, itemToUpload.name);
        currentUploaded[itemToUpload.key as keyof typeof currentUploaded] = driveUrl;
        await onPhotoUploaded(itemToUpload.key, driveUrl);
      } catch (err: any) {
        hasError = true;
        firstErrorMessage = err?.message || 'Error al subir foto a Drive';
        throw err;
      }
    }
  };

  const poolSize = Math.min(MAX_CONCURRENCY, pendingPhotos.length);
  const workers = Array.from({ length: poolSize }, () => runWorker());
  await Promise.all(workers);

  if (hasError) {
    throw new Error(firstErrorMessage || 'Error en subida paralela de fotos');
  }

  return currentUploaded;
}

// Proceso principal: procesa los registros de la cola uno por uno
export const processQueue = async (): Promise<void> => {
  if (isProcessing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    // Sin conexión, esperar al evento 'online' o al siguiente ciclo
    return;
  }

  isProcessing = true;
  try {
    const queue = await getQueueItems();
    if (queue.length === 0) {
      isProcessing = false;
      return;
    }

    for (const item of queue) {
      // Si el navegador perdió la conexión durante el proceso
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break;
      }

      // Marcar como en proceso
      item.status = 'uploading';
      item.updatedAt = Date.now();
      await saveQueueItem(item);

      try {
        // 1. Subir fotos a Drive en paralelo (máx 3 a la vez)
        const driveLinks = await uploadPhotosInParallel(item, async (key, url) => {
          // Guardar cada foto inmediatamente en IndexedDB
          item.uploadedUrls = {
            ...item.uploadedUrls,
            [key]: url,
          };
          item.updatedAt = Date.now();
          await saveQueueItem(item);
        });

        // 2. Enviar registro a Apps Script con los enlaces de Drive y el ID único
        const payload: VehicleInventoryPayload = {
          id: item.id,
          fecha: item.fecha,
          plate: item.plate,
          nombre: item.nombre,
          fotoFrontal: driveLinks.fotoFrontal || '',
          fotoLateralIzq: driveLinks.fotoLateralIzq || '',
          fotoLateralDer: driveLinks.fotoLateralDer || '',
          fotoTrasera: driveLinks.fotoTrasera || '',
          carretilla: item.carretilla,
          conos: item.conos,
          estriboIzq: driveLinks.estriboIzq || '',
          estriboDer: driveLinks.estriboDer || '',
          novedad1: driveLinks.novedad1 || '',
          novedad2: driveLinks.novedad2 || '',
          novedad3: driveLinks.novedad3 || '',
          observacion: item.observacion || '',
        };

        const success = await submitVehicleInventory(payload);
        if (success) {
          // Solo se borra cuando responde con éxito
          await deleteQueueItem(item.id);
        } else {
          throw new Error('El script no confirmó la escritura del registro.');
        }
      } catch (err: any) {
        console.error(`Error procesando inventario placa ${item.plate}:`, err);
        item.status = 'failed';
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = err?.message || 'Error desconocido al sincronizar';
        item.updatedAt = Date.now();
        await saveQueueItem(item);
      }
    }
  } finally {
    isProcessing = false;
  }
};

// Reintentar manualmente todos los registros o uno específico
export const retryQueueItem = async (id: string): Promise<void> => {
  const items = await getQueueItems();
  const target = items.find((i) => i.id === id);
  if (target) {
    target.status = 'pending';
    target.retryCount = 0; // Reiniciar contador de intentos para reintentos manuales
    target.lastError = undefined;
    target.updatedAt = Date.now();
    await saveQueueItem(target);
    processQueue();
  }
};

export const retryAllFailed = async (): Promise<void> => {
  const items = await getQueueItems();
  for (const item of items) {
    item.status = 'pending';
    item.retryCount = 0;
    item.lastError = undefined;
    item.updatedAt = Date.now();
    await saveQueueItem(item);
  }
  processQueue();
};

// Configuración de sincronización automática y eventos
let initialized = false;
export const initInventoryQueueAutoSync = (): void => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // 1. Reintento automático cada 30 segundos
  setInterval(() => {
    processQueue();
  }, 30000);

  // 2. Al recuperar conexión
  window.addEventListener('online', () => {
    processQueue();
  });

  // 3. Advertencia antes de cerrar o recargar con registros pendientes
  window.addEventListener('beforeunload', (event) => {
    if (cachedQueueCount > 0) {
      event.preventDefault();
      event.returnValue = 'Tienes registros de inventario pendientes por enviar. Si sales ahora, se enviarán al volver.';
      return event.returnValue;
    }
  });

  // Cargar conteo inicial
  getQueueItems().then((items) => {
    cachedQueueCount = items.length;
  }).catch(() => {});

  // 4. Procesar al arrancar
  setTimeout(() => {
    processQueue();
  }, 1000);
};
