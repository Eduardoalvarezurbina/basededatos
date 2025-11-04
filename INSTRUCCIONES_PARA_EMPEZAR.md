Para ponerte al día con el proyecto, sigue estos pasos:

1.  **Lee el Resumen del Proyecto:**
    *   Comienza por leer el archivo `avance_del_proyecto.md`. Este archivo contiene un resumen de alto nivel del proyecto,
        el estado actual de cada componente (Base de Datos, Backend, Frontend, Despliegue) y el progreso general. Te dará
        una visión clara de lo que se ha hecho y lo que queda por hacer.

2.  **Explora la Estructura de Archivos:**
    *   Utiliza el comando `ls -R` para obtener una vista completa de la estructura de directorios y archivos del proyecto.
        Esto te ayudará a familiarizarte con la organización del código.

3.  **Entiende la Base de Datos:**
    *   La base de datos es fundamental. Revisa el archivo `proyecto-db/ddl/postgres_schema_consolidado.sql` para entender
        el esquema completo de la base de datos, las tablas y sus relaciones.

4.  **Inicia el Entorno de Desarrollo:**
    *   Navega al directorio `app-gestion/backend/`.
    *   Ejecuta `npm install` si es la primera vez que trabajas en el proyecto o si se han añadido nuevas dependencias.
    *   Ejecuta `npm start` para iniciar el servidor del backend. El servidor se conectará automáticamente a la base de datos de desarrollo existente.

5.  **Revisa el Código del Backend:**
    *   Explora el directorio `app-gestion/backend/`.
    *   Presta especial atención al directorio `routes/` para entender los endpoints de la API y la lógica de negocio
        implementada.
    *   Revisa el archivo `compras.js` para ver un ejemplo de una ruta completamente implementada y probada.

6.  **Revisa el Código del Frontend:**
    *   Explora el directorio `app-gestion/frontend/src/`.
    *   Revisa los componentes en `src/` para entender cómo se construye la interfaz de usuario y cómo interactúa con el
        backend a través de `apiService.js`.

7.  **Analiza las Pruebas (Entorno de Pruebas):**
    *   Las pruebas son una excelente fuente de verdad sobre el comportamiento esperado de la aplicación.
    *   Lee el archivo `app-gestion/backend/compras.test.js` para ver cómo se prueban las rutas del backend.
    *   **Importante:** El archivo `app-gestion/backend/test-setup.js` se utiliza **exclusivamente para el entorno de pruebas**.
        Su función es reiniciar la base de datos *de prueba* antes de que se ejecuten los tests. **No debes ejecutar este archivo manualmente.**

8.  **Revisa el Avance y la Tarea Actual:**
    *   Vuelve a leer el archivo `avance_del_proyecto.md` para consolidar tu comprensión del estado actual del proyecto y la
        próxima tarea a realizar, que es la refactorización y prueba del módulo de `Ventas`.

Siguiendo estos pasos, tendrás un contexto completo y preciso del proyecto y estarás listo para continuar con el
desarrollo.