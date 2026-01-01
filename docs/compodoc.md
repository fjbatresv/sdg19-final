# Compodoc (Frontend)

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

```
https://<org>.github.io/<repo>/
```

Para asegurar que el sitio funcione bajo subpath, el workflow aplica un patch
del `<base href>` usando `tools/compodoc/patch-base.js`.

## Cómo corregir fallos de cobertura

- Añade JSDoc (`/** ... */`) a componentes, servicios y otros artefactos
  públicos de Angular.
- Documenta métodos públicos y propiedades expuestas relevantes.
