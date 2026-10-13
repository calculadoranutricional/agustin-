# NutriAI - Asistente Nutricional Inteligente

Aplicación web desarrollada con **Angular** y **Google Gemini 3.8 Flash** para la planificación nutricional, cálculo de macronutrientes, diario de comidas y asesoría mediante inteligencia artificial.

---

## 🚀 Despliegue en GitHub Pages

Este repositorio está preparado para desplegarse de forma automática en **GitHub Pages** mediante GitHub Actions.

### Pasos para configurar el despliegue automático:

1. **Subir el código a GitHub:**
   Asegúrate de publicar tus cambios en la rama principal (`main` o `master`).

2. **Activar GitHub Actions en GitHub Pages:**
   - Ve a tu repositorio en GitHub.
   - Entra a **Settings** (Configuración) > **Pages**.
   - En la sección **Build and deployment** -> **Source**, selecciona **GitHub Actions**.

3. **¡Listo!**
   - El flujo de trabajo configurado en `.github/workflows/deploy.yml` se ejecutará automáticamente en cada *push*.
   - La aplicación estará disponible en unas pocas minutos en la URL: `https://<tu-usuario>.github.io/<nombre-repositorio>/`.

---

## 🔑 Uso de la clave de API de Gemini en GitHub Pages

Dado que GitHub Pages aloja archivos estáticos (HTML/JS/CSS) sin un servidor Node.js backend en ejecución:

- Los usuarios pueden ingresar su propia clave de API de Gemini directamente en la barra superior de la aplicación (**Ajustes de API**).
- La clave se almacena de forma segura en el `localStorage` del navegador del usuario y se utiliza para realizar consultas directamente a la API de Gemini.
- Para verificar u obtener una clave gratuita de Gemini, visita [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 🛠️ Comandos de Desarrollo Local

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Inicia el servidor de desarrollo local en `http://localhost:3000` |
| `pnpm build` | Compila la aplicación en modo producción con SSR (Server-Side Rendering) |
| `pnpm build:gh-pages` | Compila la versión estática de la aplicación lista para GitHub Pages |
| `pnpm test` | Ejecuta la suite de pruebas unitarias |
| `pnpm lint` | Ejecuta el linter del código |

---

## 💻 Tecnologías Utilizadas

- **Angular 21** & **Angular Signals**
- **Tailwind CSS** & **Angular Material / CDK**
- **@google/genai** (Google Gemini 3.8 Flash)
- **GitHub Actions** para CI/CD estático
