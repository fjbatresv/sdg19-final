---
title: Compodoc (Frontend)
description: "Documentación del frontend Angular con Compodoc: generarla en local, validar la cobertura de documentación en CI y publicarla en Pages."
---

<img src="https://sdg19.fjbatresv.com/compodoc/images/coverage-badge-documentation.svg" alt="Frontend Coverage" width="135" height="20" />

Disponible en GitHub Pages: <https://sdg19.fjbatresv.com/compodoc/>

## Generar documentación local

```bash
npx nx run web:docs
```

Salida: `dist/compodoc/web`.

## Validar cobertura de documentación

```bash
npx nx run web:docs:coverage
```

- Umbral global: **>= 80%**.
- Minimo por archivo: **>= 25%**.
- Compodoc falla el comando si no se alcanza el umbral.
- Para reducir ruido, sólo se listan los elementos con documentación faltante.

## Validar todo (coverage + docs)

```bash
npx nx run web:docs:check
```

## GitHub Pages

El sitio se publica en GitHub Pages bajo la ruta del repositorio:

```text
https://<org>.github.io/<repo>/
```

Para asegurar que el sitio funcione bajo subpath, el workflow aplica un patch
del `<base href>` usando `tools/compodoc/patch-base.js`.

## CI

- El workflow `docs-pages.yml` genera Compodoc y lo publica en GitHub Pages.
- En CI se valida la cobertura con `nx run web:docs:coverage`.

## Cómo corregir fallos de cobertura

- Añade JSDoc (`/** ... */`) a componentes, servicios y otros artefactos
  públicos de Angular.
- Documenta métodos públicos y propiedades expuestas relevantes.
