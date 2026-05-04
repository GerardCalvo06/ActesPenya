# Actes de la Penya

PWA movil para crear actas de reuniones de una penya de futbol. Funciona sin backend: todos los datos se guardan en `localStorage` del navegador y el PDF se genera directamente en el dispositivo.

## Instalar dependencias

```bash
npm install
```

## Ejecutar en local

```bash
npm run dev
```

Abre la URL que muestra Vite, normalmente `http://localhost:5173`.

## Probar en iPhone

1. Conecta el ordenador y el iPhone a la misma red Wi-Fi.
2. Ejecuta:

```bash
npm run dev
```

3. En el iPhone abre Safari con la IP local del ordenador y el puerto de Vite. Ejemplo:

```text
http://192.168.1.141:5173
```

## Generar version final

```bash
npm run build
```

La version final queda en la carpeta `dist/`.

Para probarla antes de publicar:

```bash
npm run preview
```

## Subir gratis a Vercel

1. Crea una cuenta en Vercel.
2. Sube este proyecto a un repositorio de GitHub.
3. En Vercel pulsa `Add New Project`.
4. Importa el repositorio.
5. Usa estos ajustes:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Pulsa `Deploy`.

## Anadir a pantalla de inicio en iPhone

1. Abre la app publicada en Safari.
2. Pulsa el boton de compartir.
3. Elige `Anadir a pantalla de inicio`.
4. Confirma el nombre y pulsa `Anadir`.

## Privacidad

La app no envia datos a ningun servidor propio. Las actas quedan guardadas en el navegador del dispositivo usando `localStorage`.
