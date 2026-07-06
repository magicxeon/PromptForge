@echo off
echo ==========================================
echo Creating AAA-Character-Generator Structure
echo ==========================================

REM -----------------------------
REM Create folders
REM -----------------------------

mkdir css 2>nul
mkdir js 2>nul
mkdir data 2>nul
mkdir output 2>nul

echo.
echo Creating CSS...

type nul > css\style.css

echo Creating JavaScript...

type nul > js\app.js
type nul > js\generator.js
type nul > js\random.js
type nul > js\promptBuilder.js
type nul > js\ui.js
type nul > js\export.js

echo Creating JSON files...

echo {} > data\style.json
echo {} > data\character.json
echo {} > data\hair.json
echo {} > data\face.json
echo {} > data\outfit.json
echo {} > data\weapon.json
echo {} > data\pose.json
echo {} > data\scene.json
echo {} > data\rank.json
echo {} > data\class.json
echo {} > data\faction.json
echo {} > data\colorPalette.json
echo {} > data\quality.json

echo Creating HTML...

type nul > index.html

echo.
echo ==========================================
echo Done.
echo ==========================================

tree /f
pause