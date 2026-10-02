## 6.18. Health Checker

El Health Checker operará independientemente del Player.

Scheduler / Queue

       │

       ▼

Health Checker

       │

       ▼

Source

       │

       ▼

Controlled Check

       │

       ▼

Health Observation

       │

       ▼

Source Registry

Debe distinguirse entre:

Source.status

y:

HealthObservation

Una observación es un evento.

El estado es una conclusión derivada de múltiples observaciones y
reglas.

Esto evita marcar permanentemente una Source como caída debido a un
único timeout transitorio.
