import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const ANDROID_DOWNLOADS_DIR_KEY = 'invoice_saf_directory_uri';

/**
 * Конвертирует blob в base64 строку
 */
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        console.log('blobToBase64: начинаем конвертацию blob размером', blob.size, 'байт');
        
        const reader = new FileReader();
        reader.onloadend = () => {
            try {
                const arrayBuffer = reader.result;
                console.log('blobToBase64: получен ArrayBuffer размером', arrayBuffer.byteLength, 'байт');
                
                // Конвертируем ArrayBuffer в base64
                const base64 = arrayBufferToBase64(arrayBuffer);
                console.log('blobToBase64: base64 строка создана, длина:', base64.length);
                
                resolve(base64);
            } catch (error) {
                console.error('blobToBase64: ошибка при конвертации:', error);
                reject(error);
            }
        };
        reader.onerror = (error) => {
            console.error('blobToBase64: ошибка FileReader:', error);
            reject(error);
        };
        reader.readAsArrayBuffer(blob); // Используем readAsArrayBuffer вместо readAsDataURL
    });
};

/**
 * Конвертирует ArrayBuffer в base64 строку
 */
const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    
    // Проверяем, что это PDF файл (должен начинаться с %PDF-)
    const pdfSignature = Array.from(bytes.slice(0, 4)).map(b => String.fromCharCode(b)).join('');
    console.log('arrayBufferToBase64: сигнатура файла:', pdfSignature);
    
    if (!pdfSignature.startsWith('%PDF')) {
        console.warn('arrayBufferToBase64: файл не является PDF! Сигнатура:', pdfSignature);
    }
    
    // Используем более эффективный способ конвертации для больших файлов
    const chunkSize = 0x8000; // 32KB chunks
    let binary = '';
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    
    return btoa(binary);
};

/**
 * Проверяет содержимое Blob безопасным способом
 */
const checkBlobContent = async (pdfBlob) => {
    try {
        // Читаем первые байты через FileReader (более совместимый способ)
        const firstChunk = pdfBlob.slice(0, 10);
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // Убираем data:... префикс
            reader.onerror = reject;
            reader.readAsDataURL(firstChunk);
        });
        
        const binaryStr = atob(base64);
        console.log('checkBlobContent: первые байты:', binaryStr.substring(0, 5));
        
        if (binaryStr.includes('<html') || binaryStr.includes('<!DOCTYPE')) {
            throw new Error('Сервер вернул HTML вместо PDF файла');
        }
        
        return true;
    } catch (error) {
        console.warn('checkBlobContent: не удалось проверить содержимое Blob:', error.message);
        return false; // Не критично, продолжаем
    }
};

const savePdfToAndroidDownloads = async (base64Data, filename) => {
    const saf = FileSystem.StorageAccessFramework;
    if (Platform.OS !== 'android' || !saf?.requestDirectoryPermissionsAsync || !saf?.createFileAsync) {
        return null;
    }

    const fileNameWithoutExt = filename.replace(/\.pdf$/i, '');

    const writeToDirectory = async (directoryUri) => {
        const fileUri = await saf.createFileAsync(directoryUri, fileNameWithoutExt, 'application/pdf');
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return fileUri;
    };

    const storedDirectoryUri = await AsyncStorage.getItem(ANDROID_DOWNLOADS_DIR_KEY);
    if (storedDirectoryUri) {
        try {
            return await writeToDirectory(storedDirectoryUri);
        } catch (error) {
            await AsyncStorage.removeItem(ANDROID_DOWNLOADS_DIR_KEY);
        }
    }

    const initialUri = typeof saf.getUriForDirectoryInRoot === 'function'
        ? saf.getUriForDirectoryInRoot('Download')
        : null;
    const permissions = await saf.requestDirectoryPermissionsAsync(initialUri);

    if (!permissions?.granted || !permissions.directoryUri) {
        return null;
    }

    await AsyncStorage.setItem(ANDROID_DOWNLOADS_DIR_KEY, permissions.directoryUri);
    return writeToDirectory(permissions.directoryUri);
};

/**
 * Скачивает PDF и кладёт его туда, где пользователь его найдёт:
 * Android — папка «Загрузки», иначе системное меню «Сохранить / Поделиться».
 */
export const downloadPDFFile = async (pdfBlob, filename) => {
    try {
        await checkBlobContent(pdfBlob);

        const safeFilename = sanitizeFilename(filename);
        const base64Data = await blobToBase64(pdfBlob);
        const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${safeFilename}`;

        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists || !fileInfo.size) {
            throw new Error('Файл не был сохранен или имеет нулевой размер');
        }

        const firstBytes = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
            length: 8,
            position: 0
        });
        const signature = atob(firstBytes).substring(0, 4);
        if (!signature.startsWith('%PDF')) {
            throw new Error('Сохраненный PDF файл поврежден');
        }

        let savedToDownloads = false;
        let publicPath = null;

        try {
            publicPath = await savePdfToAndroidDownloads(base64Data, safeFilename);
            savedToDownloads = Boolean(publicPath);
        } catch (androidSaveError) {
            console.warn('Не удалось сохранить PDF в Загрузки:', androidSaveError?.message);
        }

        if (!savedToDownloads) {
            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (!isSharingAvailable) {
                throw new Error('Не удалось сохранить файл в доступную папку устройства');
            }
            await shareFile(fileUri, safeFilename);
        }

        return {
            success: true,
            path: publicPath || fileUri,
            filename: safeFilename,
            savedToDownloads
        };

    } catch (error) {
        console.error('Ошибка при сохранении PDF файла:', error);

        GlobalAlert.showError(
            'Ошибка',
            `Не удалось сохранить файл: ${error.message}`
        );

        throw error;
    }
};

/**
 * Открывает файл через системное sharing меню
 */
export const openFile = async (fileUri, filename) => {
    try {
        await shareFile(fileUri, filename);
    } catch (error) {
        console.error('Ошибка при открытии файла:', error);
        GlobalAlert.showError(
            'Ошибка',
            'Не удалось открыть файл'
        );
    }
};

/**
 * Делится файлом через системное sharing меню
 */
export const shareFile = async (fileUri, filename) => {
    try {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        
        if (!isSharingAvailable) {
            GlobalAlert.showError(
                'Ошибка',
                'Функция шаринга недоступна на этом устройстве'
            );
            return;
        }

        await Sharing.shareAsync(fileUri, {
            UTI: 'com.adobe.pdf',
            mimeType: 'application/pdf',
            dialogTitle: `Накладная ${filename}`,
        });
    } catch (error) {
        console.error('Ошибка при sharing файла:', error);
        GlobalAlert.showError(
            'Ошибка',
            'Не удалось поделиться файлом'
        );
    }
};

/**
 * Проверяет доступность папки для записи
 */
export const checkWritePermission = async () => {
    try {
        const testFile = `${FileSystem.documentDirectory}test.txt`;
        
        await FileSystem.writeAsStringAsync(testFile, 'test', {
            encoding: FileSystem.EncodingType.UTF8,
        });
        
        await FileSystem.deleteAsync(testFile);
        
        return true;
    } catch (error) {
        console.error('Нет разрешения на запись:', error);
        return false;
    }
};

/**
 * Получает список сохраненных PDF файлов
 */
export const getSavedPDFFiles = async () => {
    try {
        const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
        
        const pdfFiles = [];
        
        for (const filename of files) {
            if (filename.endsWith('.pdf')) {
                const fileUri = `${FileSystem.documentDirectory}${filename}`;
                try {
                    const fileInfo = await FileSystem.getInfoAsync(fileUri);
                    pdfFiles.push({
                        name: filename,
                        path: fileUri,
                        size: fileInfo.size || 0,
                        mtime: fileInfo.modificationTime || 0
                    });
                } catch (error) {
                    console.warn(`Не удалось получить информацию о файле ${filename}:`, error);
                }
            }
        }
        
        // Сортируем по дате изменения (новые сначала)
        return pdfFiles.sort((a, b) => b.mtime - a.mtime);
    } catch (error) {
        console.error('Ошибка при получении списка файлов:', error);
        return [];
    }
};

/**
 * Удаляет PDF файл
 */
export const deletePDFFile = async (fileUri) => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(fileUri);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        return false;
    }
};

/**
 * Форматирует размер файла для отображения
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Создает безопасное имя файла
 */
export const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9а-яёА-ЯЁ\-_.]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
};

/**
 * Получает информацию о файле
 */
export const getFileInfo = async (fileUri) => {
    try {
        const info = await FileSystem.getInfoAsync(fileUri);
        return info;
    } catch (error) {
        console.error('Ошибка при получении информации о файле:', error);
        return null;
    }
};

/**
 * Копирует файл
 */
export const copyFile = async (sourceUri, destinationUri) => {
    try {
        await FileSystem.copyAsync({
            from: sourceUri,
            to: destinationUri
        });
        return true;
    } catch (error) {
        console.error('Ошибка при копировании файла:', error);
        return false;
    }
};

/**
 * Проверяет доступность sharing функций
 */
export const isSharingAvailable = async () => {
    try {
        return await Sharing.isAvailableAsync();
    } catch (error) {
        console.error('Ошибка при проверке доступности sharing:', error);
        return false;
    }
};

export default {
    downloadPDFFile,
    openFile,
    shareFile,
    checkWritePermission,
    getSavedPDFFiles,
    deletePDFFile,
    formatFileSize,
    sanitizeFilename,
    getFileInfo,
    copyFile,
    isSharingAvailable
}; 