## 6.29. Camino de administración

El CMS utilizará el mismo dominio central, pero mediante interfaces
autorizadas:

Admin / Moderator

       │

       ▼

      CMS

       │

       ▼

 Admin API + RBAC

       │

   ┌───┼──────────────┐

   ▼   ▼              ▼

Catalog Sources     Reports

       │

       ▼

Source Registry

Una modificación administrativa deberá poder producir eventos de
auditoría.
