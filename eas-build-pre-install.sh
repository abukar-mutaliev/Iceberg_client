#!/bin/bash

# Не выходим при ошибке, чтобы сборка могла продолжиться
set +e

echo "🔧 Настройка Podfile для исправления react-native-maps..."

if [ "$EAS_BUILD_PLATFORM" == "ios" ]; then
  PODFILE_PATH="./ios/Podfile"
  
  # eas-build-post-install выполняется после prebuild и pod install,
  # поэтому Podfile должен уже существовать
  
  # Добавляем фикс в Podfile если его еще нет
  if [ -f "$PODFILE_PATH" ]; then
    if ! grep -q "GLOBAL FIX: Disable warnings as errors" "$PODFILE_PATH"; then
      echo "📝 Добавление фикса в Podfile..."
      
      # Проверяем, есть ли уже post_install блок
      if grep -q "post_install do |installer|" "$PODFILE_PATH"; then
        echo "📋 Найден существующий post_install блок, добавляем глобальный фикс..."
        
        # Простой метод: добавляем фикс перед последним end в post_install блоке
        # Используем временный файл для безопасности
        TEMP_FILE=$(mktemp)
        FIX_CODE='  # GLOBAL FIX: Disable warnings as errors
  installer.pods_project.build_configurations.each do |config|
    config.build_settings["GCC_TREAT_WARNINGS_AS_ERRORS"] = "NO"
    config.build_settings["WARNING_CFLAGS"] = ["-Wno-error=non-modular-include-in-framework-module"]
  end
  
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings["GCC_TREAT_WARNINGS_AS_ERRORS"] = "NO"
      config.build_settings["WARNING_CFLAGS"] ||= ["$(inherited)"]
      config.build_settings["WARNING_CFLAGS"] << "-Wno-error=non-modular-include-in-framework-module"
      config.build_settings["CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "NO"
      config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "15.1"
    end
  end
'
        
        # Используем awk для вставки перед последним end в post_install
        awk -v fix="$FIX_CODE" '
          /^post_install do \|installer\|/ { in_post_install=1; print; next }
          in_post_install && /^end$/ && !seen_end {
            print fix
            seen_end=1
          }
          { print }
        ' "$PODFILE_PATH" > "$TEMP_FILE" && mv "$TEMP_FILE" "$PODFILE_PATH"
        
        if [ $? -eq 0 ]; then
          echo "✅ Глобальный фикс добавлен в существующий post_install"
        else
          echo "⚠️ Не удалось добавить фикс через awk, пробуем простой метод..."
          # Простой метод: добавляем в конец файла
          cat >> "$PODFILE_PATH" << 'EOF'

post_install do |installer|
  # GLOBAL FIX: Disable warnings as errors
  installer.pods_project.build_configurations.each do |config|
    config.build_settings["GCC_TREAT_WARNINGS_AS_ERRORS"] = "NO"
    config.build_settings["WARNING_CFLAGS"] = ["-Wno-error=non-modular-include-in-framework-module"]
  end
  
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings["GCC_TREAT_WARNINGS_AS_ERRORS"] = "NO"
      config.build_settings["WARNING_CFLAGS"] ||= ["$(inherited)"]
      config.build_settings["WARNING_CFLAGS"] << "-Wno-error=non-modular-include-in-framework-module"
      config.build_settings["CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "NO"
      config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "15.1"
    end
  end
end
EOF
          echo "✅ Добавлен новый post_install hook с глобальным фиксом"
        fi
      else
        echo "📝 Добавление нового post_install блока с глобальным фиксом..."
        cat >> "$PODFILE_PATH" << 'EOF'

post_install do |installer|
  # GLOBAL FIX: Disable warnings as errors
  installer.pods_project.build_configurations.each do |config|
    config.build_settings["GCC_TREAT_WARNINGS_AS_ERRORS"] = "NO"
    config.build_settings["WARNING_CFLAGS"] = ["-Wno-error=non-modular-include-in-framework-module"]
  end
  
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings["GCC_TREAT_WARNINGS_AS_ERRORS"] = "NO"
      config.build_settings["WARNING_CFLAGS"] ||= ["$(inherited)"]
      config.build_settings["WARNING_CFLAGS"] << "-Wno-error=non-modular-include-in-framework-module"
      config.build_settings["CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "NO"
      config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "15.1"
    end
  end
end
EOF
        echo "✅ Добавлен новый post_install hook с глобальным фиксом"
      fi
      
      # Показываем последние строки Podfile для проверки
      echo "📄 Последние 20 строк Podfile:"
      tail -n 20 "$PODFILE_PATH" 2>/dev/null || echo "⚠️ Не удалось прочитать Podfile"
    else
      echo "ℹ️ Фикс уже присутствует в Podfile"
    fi
  else
    echo "⚠️ Podfile не найден по пути: $PODFILE_PATH"
    echo "📋 Содержимое директории ios:"
    ls -la ./ios/ 2>/dev/null || echo "Директория ios не существует"
    echo "ℹ️ Это нормально, если prebuild еще не выполнен. Продолжаем сборку..."
  fi
else
  echo "ℹ️ Платформа не iOS, пропускаем фикс"
fi

echo "✅ Post-install hook завершен"
exit 0
