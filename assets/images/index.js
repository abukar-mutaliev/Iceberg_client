// Безопасная загрузка изображений с fallback

let defaultProduct;
let placeholder;

try {
    defaultProduct = require('./icecreamPlaceholder.png');
} catch (e) {
    console.warn('icecreamPlaceholder.png не найден, используем заглушку');
    defaultProduct = null;
}

try {
    placeholder = require('./placeholder.png');
} catch (e) {
    console.warn('placeholder.png не найден');
    placeholder = null;
}

// Fallback на пустое изображение
const emptyImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' };

export const Images = {
    defaultProduct: defaultProduct || emptyImage,
    placeholder: placeholder || emptyImage,
};

// Экспорт отдельных изображений
export const defaultProductImage = Images.defaultProduct;
export const placeholderImage = Images.placeholder;

// Функция для безопасного получения изображения
export const getImage = (imageName) => {
    return Images[imageName] || Images.placeholder;
};