import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

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

/**
 * Скачивает PDF файл и предлагает его открыть/поделиться
 */
export const downloadPDFFile = async (pdfBlob, filename) => {
    try {
        console.log('downloadPDFFile: начинаем обработку', { 
            blobSize: pdfBlob.size, 
            blobType: pdfBlob.type, 
            filename 
        });
        
        // Проверяем содержимое Blob безопасным способом
        await checkBlobContent(pdfBlob);
        
        const safeFilename = sanitizeFilename(filename);
        
        // Для React Native/Expo сразу используем base64 метод (наиболее совместимый)
        console.log('downloadPDFFile: используем base64 метод сохранения');
        const base64Data = await blobToBase64(pdfBlob);
        
        console.log('downloadPDFFile: base64 конвертация завершена, длина:', base64Data.length);
        
        const fileUri = `${FileSystem.documentDirectory}${safeFilename}`;
        console.log('downloadPDFFile: сохраняем в:', fileUri);

        // Записываем файл
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('PDF файл сохранен:', fileUri, 'методом: base64');
        
        // Проверяем целостность сохраненного файла
        try {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            console.log('downloadPDFFile: проверка файла:', {
                exists: fileInfo.exists,
                size: fileInfo.size,
                uri: fileInfo.uri
            });
            
            if (fileInfo.exists && fileInfo.size > 0) {
                // Читаем первые несколько байт для проверки PDF сигнатуры
                const firstBytes = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                    length: 8, // Читаем первые 8 байт
                    position: 0
                });
                
                // Декодируем base64 и проверяем сигнатуру
                const binaryStr = atob(firstBytes);
                const signature = binaryStr.substring(0, 4);
                console.log('downloadPDFFile: сигнатура сохраненного файла:', signature);
                
                if (!signature.startsWith('%PDF')) {
                    console.error('downloadPDFFile: сохраненный файл поврежден! Неправильная сигнатура');
                    throw new Error('Сохраненный PDF файл поврежден');
                } else {
                    console.log('downloadPDFFile: PDF файл прошел проверку целостности');
                }
            } else {
                throw new Error('Файл не был сохранен или имеет нулевой размер');
            }
        } catch (verifyError) {
            console.error('downloadPDFFile: ошибка при проверке файла:', verifyError);
            throw new Error(`Ошибка проверки файла: ${verifyError.message}`);
        }

        // Проверяем, доступен ли sharing на устройстве
        const isSharingAvailable = await Sharing.isAvailableAsync();
        
        if (isSharingAvailable) {
            // Показываем диалог с опциями
            Alert.alert(
                'Накладная готова',
                'PDF накладная успешно сформирована. Что вы хотите сделать?',
                [
                    {
                        text: 'Открыть',
                        onPress: () => openFile(fileUri, safeFilename)
                    },
                    {
                        text: 'Поделиться',
                        onPress: () => shareFile(fileUri, safeFilename)
                    },
                    {
                        text: 'Закрыть',
                        style: 'cancel'
                    }
                ]
            );
        } else {
            Alert.alert(
                'Накладная сохранена',
                `Файл ${safeFilename} сохранен в папке приложения`
            );
        }

        return {
            success: true,
            path: fileUri,
            filename: safeFilename
        };

    } catch (error) {
        console.error('Ошибка при сохранении PDF файла:', error);
        
        Alert.alert(
            'Ошибка',
            `Не удалось сохранить файл: ${error.message}`
        );

        return {
            success: false,
            error: error.message
        };
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
        Alert.alert(
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
            Alert.alert(
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
        Alert.alert(
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