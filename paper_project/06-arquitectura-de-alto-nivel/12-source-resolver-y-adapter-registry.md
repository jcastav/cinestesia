## 6.12. Source Resolver y Adapter Registry

El actual **Motor de Fuentes y Adaptadores (Scraper / Extractor)** se
redefine arquitectónicamente como **Source Resolver + Adapter
Registry**.

Su responsabilidad será:

\> Recibir una Source conocida y producir una Playable Representation
normalizada.

Source

   │

   ▼

Resolver

   │

   ▼

Adapter Factory

   │

   ├── Adapter A

   ├── Adapter B

   └── Adapter N

   │

   ▼

Playable Representation

La arquitectura Strategy + Factory que ya propone el documento se
mantiene porque encaja correctamente con esta responsabilidad.

Sin embargo, cambia una cuestión importante: el documento original
define como responsabilidad del motor ejecutar técnicas de \*bypassing\*
de JavaScript, cookies, tokens, headers y CAPTCHA, e incluso contempla
escalamiento hacia workers headless y proxies cuando aparecen mecanismos
anti-bot. Esa parte no se conservará como responsabilidad arquitectónica
general.

La definición revisada será:

\> Cada Adapter implementará los mecanismos de integración necesarios y
permitidos para transformar una Source compatible en una representación
reproducible.

Una protección anti-bot o CAPTCHA podrá representarse como una condición
de resolución fallida o integración no disponible; su evasión no
constituye un requisito del sistema.
