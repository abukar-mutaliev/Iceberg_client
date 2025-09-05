// Тестовый скрипт для проверки данных продуктов поставщика
// Запустите этот скрипт в браузере для проверки

console.log('🔍 Начинаем проверку данных продуктов поставщика...');

// Имитируем проверку данных из useProductManagement
const checkSupplierProducts = async () => {
  try {
    // Получаем текущего пользователя
    const currentUser = window.__REDUX_STORE__?.getState()?.auth?.user;
    console.log('👤 Текущий пользователь:', currentUser);

    if (!currentUser) {
      console.log('❌ Пользователь не авторизован');
      return;
    }

    if (currentUser.role !== 'SUPPLIER') {
      console.log('❌ Пользователь не является поставщиком');
      return;
    }

    // Получаем профиль
    const profile = window.__REDUX_STORE__?.getState()?.profile?.data;
    console.log('📋 Профиль пользователя:', profile);

    // Получаем продукты
    const products = window.__REDUX_STORE__?.getState()?.products?.items || [];
    console.log('📦 Все продукты в сторе:', products.length);

    // Фильтруем продукты поставщика
    const supplierProducts = products.filter(product => {
      const isOwner = product.supplierId === currentUser.id ||
                     product.supplierId === currentUser.supplier?.id ||
                     product.supplierId === profile?.supplier?.id;

      console.log('🔍 Проверка продукта:', {
        productId: product.id,
        productName: product.name,
        productSupplierId: product.supplierId,
        currentUserId: currentUser.id,
        currentUserSupplierId: currentUser.supplier?.id,
        profileSupplierId: profile?.supplier?.id,
        isOwner: isOwner
      });

      return isOwner;
    });

    console.log('✅ Найденные продукты поставщика:', supplierProducts.length);
    supplierProducts.forEach(product => {
      console.log('  -', product.name, '(ID:', product.id, ', SupplierId:', product.supplierId, ')');
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  }
};

// Запускаем проверку
checkSupplierProducts();
