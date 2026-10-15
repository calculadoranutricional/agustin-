# NutriAI - Calculadora Nutricional & Asistente IA

Aplicación web desarrollada en **Angular** y **Gemini 3.8 Flash** que actúa como calculadora de macronutrientes, diario de alimentos, calculador de recetas y asistente nutricional interactivo.

## 🚀 Despliegue en GitHub Pages

El proyecto incluye un flujo de trabajo automatizado con **GitHub Actions** (`.github/workflows/deploy.yml`) para compilar y desplegar la aplicación estática en GitHub Pages al realizar un `push` a la rama principal (`main` o `master`).

### Pasos para activar el despliegue:

1. Ve a los **Settings** (Configuración) de tu repositorio en GitHub.
2. En la sección lateral izquierda, selecciona **Pages**.
3. En **Build and deployment** > **Source**, selecciona **GitHub Actions**.
4. Realiza un `push` a la rama `main` o `master` (o ejecuta el flujo manualmente en la pestaña **Actions** > **Deploy to GitHub Pages** > **Run workflow**).

### Configuración de la API Key de Gemini en GitHub Pages

Al ejecutarse en un entorno de alojamiento estático como GitHub Pages (sin servidor Express en ejecución), la aplicación cambia automáticamente al modo ejecutable directamente desde el navegador.

- Los usuarios ingresan su **API Key de Gemini** en la barra superior de la aplicación.
- La clave se almacena localmente en el navegador (`localStorage`) y se comunica de manera directa con la API de Google Gemini.
- Puedes obtener una API key gratuita en [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 🛠️ Desarrollo Local

### Requisitos previos
- Node.js 20+
- pnpm (o npm)

### Comandos de desarrollo

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo local
pnpm dev

# Ejecutar pruebas unitarias
pnpm test

# Ejecutar linter
pnpm lint

# Compilar para producción (con servidor SSR Express)
pnpm build

# Compilar para GitHub Pages (sitio estático)
pnpm build:gh-pages
```
