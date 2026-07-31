@echo off
setlocal
cd /d "%~dp0.."

echo [1/5] Validating localization catalogs...
node scripts\validate-i18n-catalogs.js || goto :fail

echo [2/5] Running Fashion server tests...
node --test test\fashionBlueprint.test.js test\fashionBlueprintPolicy.test.js || goto :fail

echo [3/5] Type-checking React...
call npm run typecheck:web || goto :fail

echo [4/5] Running React Fashion tests...
call npm run test --workspace web -- --run src/features/fashion-blueprint || goto :fail

echo [5/5] Building React...
call npm run build --workspace web || goto :fail

echo Fashion Blueprint validation passed.
exit /b 0

:fail
echo Fashion Blueprint validation failed. Review the first error above.
exit /b 1
