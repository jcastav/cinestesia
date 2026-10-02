# 10. MONETIZATION BASELINE & CHECKLIST

## 10.1. Propósito

Esta sección no define la arquitectura publicitaria — está en 6.38.
Sirve como checklist de implementación.

## 10.2. Principios (referencia)
- La publicidad es opcional
- El contenido nunca depende de la publicidad para reproducirse
- Fail-open: error publicitario ≠ error de playback
- VAST/VMAP son protocolos externos, no modelo de dominio

## 10.3. Checklist

### Motor de anuncios
- [ ] Ad Policy Engine → 6.38
- [ ] Ad Opportunity → 6.38
- [ ] Ad Decision Service → 6.38
- [ ] Provider Adapters → 6.38
- [ ] VAST/VMAP Processor → 6.38
- [ ] Ad Session Manager → 6.38
- [ ] Ad Playback Coordinator → 6.38

### Seguridad
- [ ] CSP estricta → 6.38, 6.43
- [ ] Aislamiento de terceros (iframe sandbox) → 6.38
- [ ] SSRF en Ad Server Gateway → 6.38, 6.43
- [ ] URLs de click validadas → 6.38
- [ ] Secretos de Provider fuera del frontend → 6.38

### Fail-open
- [ ] Timeout publicitario no bloquea contenido → 6.38
- [ ] NO_FILL permite continuar → 6.38
- [ ] VAST inválido permite continuar → 6.38
- [ ] Provider caído permite continuar → 6.38

### Frequency Capping
- [ ] Configurable por placement → 6.38
- [ ] No reiniciar por cambio de Source → 6.38

### Métricas
- [ ] Ad Business Metrics separadas de QoE → 6.38
- [ ] Content Start Delay → 6.38
- [ ] Ad-related Abandonment Rate → 6.38

### Kill Switch
- [ ] `ads_enabled = false` funciona → 6.38