# Canales en vivo — reproductor HTTPS experimental

Componente estático independiente para probar el reproductor oficial de YouTube desde un origen HTTPS real. No es una implementación oficial de YouTube ni de los canales. Sólo ofrece los identificadores públicos de TN, C5N, LN+, A24, Crónica TV y Canal26 verificados al preparar la prueba; pueden finalizar o rotar. No se implementa extracción de medios ni descubrimiento por scraping.

`index.html` y `player.js` reciben comandos de una aplicación contenedora mediante un protocolo limitado, con source/origin/nonce y selección de video validados. No se solicita acceso a cuentas, credenciales, archivos locales ni API de datos. Una instancia reproduce un único video; al salir se destruye. La app contenedora privada no se publica en este repositorio.

Los controles y las marcas de YouTube permanecen visibles. Consultá [Privacidad](privacy.html) y [Condiciones](terms.html). La reproducción en una TV y el manejo físico de CH+/CH− todavía requieren una prueba. Una comprobación en un navegador de escritorio no acredita esa compatibilidad.

Alojamiento previsto: GitHub Pages con HTTPS obligatorio. No hay servidor de procesamiento propio ni es necesario mantener una computadora encendida. Google/YouTube y GitHub pueden procesar los datos técnicos correspondientes a sus servicios.

Licencia del código propio: MIT. El reproductor de YouTube es remoto y se rige por sus condiciones, no por esa licencia.
