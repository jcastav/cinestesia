## 6.21. Redis

Redis será infraestructura compartida y podrá utilizarse para funciones
efímeras como:

cache

distributed locks

rate limiting

temporary sessions

resolution cache

queues

short-lived state

idempotency

Ejemplos conceptuales:

catalog:media:{id}

source:health:{source_id}

resolution:{source_id}

playback:session:{session_id}

rate:{subject}:{window}

Las claves exactas y TTL deberán definirse en cada motor.

Redis no deberá convertirse accidentalmente en la fuente de verdad de
información persistente crítica.
