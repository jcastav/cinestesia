## 6.8. Módulos principales

La arquitectura objetivo estará compuesta por los siguientes dominios o
módulos lógicos.

  ----------------------------------------------------------------------
  **Módulo**          **Responsabilidad principal**    **MVP**
  ------------------- -------------------------------- -----------------
  Web / BFF           Presentación y API orientada al  Sí
                      cliente                          

  Media Player Core   Experiencia de reproducción      Sí

  Catalog             Fuente de verdad de contenidos   Sí

  Source Registry     Inventario y estado de Sources   Sí

  Playback            Selección y coordinación         Sí
  Orchestrator                                         

  Playback Session    Contrato normalizado de          Sí
                      reproducción                     

  Source Resolver     Resolver una Source conocida     Sí

  Adapter Registry    Integraciones específicas        Sí

  Media Gateway       Plano de entrega audiovisual     Sí

  Health Checker      Salud de Sources                 Básico

  Reporting           Incidencias de reproducción      Básico

  Discovery /         Incorporación de                 Manual/semi
  Ingestion           contenidos/Sources               

  Search              Recuperación de contenidos       Básico

  Users / Auth        Identidad y sincronización       Opcional/básico

  Recommendations     Personalización avanzada         No

  Ad Manager          Monetización                     No

  Notifications       Comunicaciones                   No
  \----------------------------------------------------------------------

Esta tabla describe módulos lógicos. Algunos podrán coexistir
inicialmente dentro del mismo proceso.
