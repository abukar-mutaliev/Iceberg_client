# MultiDistrictPicker

Компонент для выбора нескольких районов с возможностью поиска, "Выбрать всё" и отображения количества выбранных элементов.

## Использование

```jsx
import { MultiDistrictPicker } from '@shared/ui/Pickers/MultiDistrictPicker';

const MyComponent = () => {
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  
  return (
    <MultiDistrictPicker
      districts={districts}
      selectedDistricts={selectedDistricts}
      setSelectedDistricts={setSelectedDistricts}
      showDistrictPicker={showDistrictPicker}
      setShowDistrictPicker={setShowDistrictPicker}
      error={errors.districts}
      disabled={isLoading}
    />
  );
};
```

## Свойства

| Свойство | Тип | Описание |
|----------|-----|----------|
| `districts` | `Array<District>` | Массив районов для выбора |
| `selectedDistricts` | `Array<number>` | Массив ID выбранных районов |
| `setSelectedDistricts` | `Function` | Функция для установки выбранных районов |
| `showDistrictPicker` | `boolean` | Показать/скрыть модальное окно |
| `setShowDistrictPicker` | `Function` | Функция для управления видимостью модального окна |
| `error` | `string` | Текст ошибки валидации |
| `disabled` | `boolean` | Отключить компонент |

## Функции

- **Мультивыбор**: Позволяет выбирать несколько районов одновременно
- **Поиск**: Фильтрация районов по названию и описанию
- **Выбрать всё**: Быстрый выбор или снятие выбора со всех районов
- **Счетчик**: Отображение количества выбранных элементов
- **Валидация**: Поддержка отображения ошибок валидации
- **Анимация**: Плавная анимация появления/скрытия модального окна

## Структура District

```typescript
interface District {
  id: number;
  name: string;
  description?: string;
}
```

## Стили

Компонент использует глобальные стили приложения и адаптируется под общую цветовую схему.

## Примеры использования

### Базовое использование для сотрудника

```jsx
<MultiDistrictPicker
  districts={districts}
  selectedDistricts={selectedEmployeeDistricts}
  setSelectedDistricts={setSelectedEmployeeDistricts}
  showDistrictPicker={showEmployeeDistrictPicker}
  setShowDistrictPicker={setShowEmployeeDistrictPicker}
  error={errors.employeeDistricts}
  disabled={districtsLoading}
/>
```

### С валидацией

```jsx
const [errors, setErrors] = useState({});

const validateDistricts = () => {
  if (selectedDistricts.length === 0) {
    setErrors({ districts: 'Выберите хотя бы один район' });
    return false;
  }
  return true;
};

<MultiDistrictPicker
  districts={districts}
  selectedDistricts={selectedDistricts}
  setSelectedDistricts={setSelectedDistricts}
  showDistrictPicker={showDistrictPicker}
  setShowDistrictPicker={setShowDistrictPicker}
  error={errors.districts}
/>
``` 