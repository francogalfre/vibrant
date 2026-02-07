# Guía de Desarrollo: Vibrant CLI

## Índice

1. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
2. [Cómo Funciona Cada Parte](#cómo-funciona-cada-parte)
3. [Flujo de Trabajo de Desarrollo](#flujo-de-trabajo-de-desarrollo)
4. [Mejoras Sugeridas](#mejoras-sugeridas)
5. [Roadmap de Desarrollo](#roadmap-de-desarrollo)
6. [Testing Local](#testing-local)
7. [Publicación en npm](#publicación-en-npm)
8. [Debugging](#debugging)

---

## Arquitectura del Proyecto

```
vibrant/
├── apps/
│   ├── cli/           # CLI Tool - Producto principal
│   │   ├── src/
│   │   │   ├── bin.ts         # Entry point (shebang)
│   │   │   ├── cli.ts         # Commander setup
│   │   │   ├── linter.ts      # Motor principal
│   │   │   ├── runner.ts      # Ejecución y output
│   │   │   ├── rules/         # Reglas de detección
│   │   │   └── utils/         # Utilidades
│   │   └── package.json       # "bin": {"vibrant": "..."}
│   │
│   └── web/           # Landing Page
│       ├── src/
│       └── package.json
│
├── package.json       # Root workspace config
└── bunfig.toml       # Bun configuration
```

### ¿Por qué esta estructura?

- **CLI es el producto**: Los usuarios instalan `vibrant` globalmente y lo ejecutan
- **Separación de responsabilidades**: CLI hace parsing de args, linter hace análisis
- **Escalable**: Puedes agregar más apps (VS Code extension, GitHub Action) sin mezclar código

---

## Cómo Funciona Cada Parte

### 1. Entry Point (`bin.ts`)

```typescript
#!/usr/bin/env bun
import cli from "./cli";
cli.parse();
```

**Qué hace:**

- El shebang (`#!`) permite ejecutar el archivo directamente como script
- Bun lo compila a un ejecutable de Node.js
- Es el punto de entrada cuando corres `vibrant` en terminal

**Build output:** `dist/bin.js` - archivo ejecutable standalone

### 2. CLI (`cli.ts`)

Usa `commander` para parsear argumentos:

```typescript
program
  .argument("[path]", "Ruta a analizar", ".")
  .option("-f, --format <type>", "Formato de salida", "pretty")
  .option("--fix", "Auto-fix", false)
  .option("--ai", "Usar IA", false);
```

**Comandos disponibles:**

- `vibrant .` - Analiza directorio actual
- `vibrant ./src` - Analiza directorio específico
- `vibrant . --format json` - Output JSON
- `vibrant . --ai` - Modo IA (futuro)
- `vibrant rules` - Lista reglas
- `vibrant init` - Crea config file

### 3. Motor del Linter (`linter.ts`)

**Flujo de análisis:**

1. **Descubrimiento de archivos**

   ```typescript
   const files = await glob(`${options.path}/**/*.{ts,tsx,js,jsx}`, {...})
   ```

   Usa `glob` para encontrar todos los archivos de código

2. **Parseo AST (opcional)**

   ```typescript
   const ast = parse(code, { loc: true, range: true });
   ```

   Convierte el código a un árbol de sintaxis abstracta

3. **Ejecución de reglas**

   ```typescript
   for (const rule of this.rules.values()) {
     const issues = rule.check(code, filePath);
   }
   ```

   Cada regla recibe el código y retorna issues encontrados

4. **Agregación de resultados**
   Retorna un objeto con todas las issues, conteo de archivos, tiempo, etc.

### 4. Sistema de Reglas (`rules/`)

Cada regla es un objeto con:

```typescript
{
  id: 'generic-variables',           // Identificador único
  name: 'Generic Variable Names',    // Nombre legible
  description: '...',                // Descripción
  severity: 'warning',               // error | warning | info
  check: (code, filePath) => {       // Función de análisis
    // Retorna array de issues
    return [{
      ruleId: 'generic-variables',
      message: 'Variable genérica detectada',
      line: 10,
      column: 5,
      file: filePath,
      suggestion: 'Usa un nombre más descriptivo'
    }]
  }
}
```

**Tipos de análisis que puedes hacer:**

- **Regex-based**: Búsqueda de patrones de texto (rápido, simple)

  ```typescript
  const regex = /\b(const|let|var)\s+data\b/g;
  ```

- **AST-based**: Análisis del árbol de sintaxis (preciso, complejo)

  ```typescript
  // Navegar el AST para encontrar nodos específicos
  ast.body.forEach((node) => {
    if (node.type === "FunctionDeclaration") {
      // Analizar función
    }
  });
  ```

- **Híbrido**: Combinar ambos para mejor precisión/performance

### 5. Runner (`runner.ts`)

**Responsabilidades:**

- Ejecutar el linter con las opciones del usuario
- Formatear output (pretty, json, compact)
- Colorear terminal con `picocolors`
- Agrupar issues por archivo
- Calcular resumen estadístico
- Decidir exit code (0 = éxito, 1 = errores encontrados)

**Lógica de colores:**

```typescript
const severityColor = {
  error: pc.red,
  warning: pc.yellow,
  info: pc.blue,
}[issue.severity];
```

### 6. Web App

Landing page para marketing:

- Explica qué hace Vibrant
- Muestra comandos de instalación
- Lista features
- (Futuro) Playground interactivo para probar el linter online

---

## Flujo de Trabajo de Desarrollo

### Desarrollo Diario

```bash
# 1. Entrar al proyecto
cd /home/francogalfre/Documentos/dev/vibrant

# 2. Instalar dependencias (primera vez o si cambia package.json)
bun install

# 3. Trabajar en el CLI
cd apps/cli

# 4. Modo desarrollo (hot reload)
bun run src/bin.ts .

# O probar comandos específicos:
bun run src/bin.ts . --format json
bun run src/bin.ts rules

# 5. Build cuando esté listo
bun run build

# 6. Test con el binario compilado
./dist/bin.js .
```

### Agregar una Nueva Regla

1. **Crear archivo** `apps/cli/src/rules/mi-regla.ts`

2. **Implementar la regla:**

```typescript
import type { LintRule } from "../types";

export const miRegla: LintRule = {
  id: "mi-regla",
  name: "Mi Regla",
  description: "Detecta algo específico",
  severity: "warning",
  check: (code, filePath) => {
    const issues = [];

    // Tu lógica aquí
    if (code.includes("patron_malo")) {
      issues.push({
        ruleId: "mi-regla",
        message: "Detecté el patrón malo",
        severity: "warning",
        line: 1,
        column: 1,
        file: filePath,
      });
    }

    return issues;
  },
};
```

3. **Registrar en `vibecode-rules.ts`:**

```typescript
import { miRegla } from "./mi-regla";

export const vibecodeRules = [
  // ... otras reglas
  miRegla,
];
```

4. **Probar:**

```bash
bun run src/bin.ts . --format json | grep mi-regla
```

### Modificar el Output

Editar `runner.ts`:

- `printPretty()` - Formato visual con colores
- `printCompact()` - Formato una línea por issue
- JSON se genera con `JSON.stringify(result, null, 2)`

---

## Mejoras Sugeridas

### Mejora 1: Configuración vía Archivo

**Estado actual:** Opciones solo por CLI args
**Mejora:** Soporte para `vibrant.config.js`

```javascript
// vibrant.config.js
module.exports = {
  ignore: ["node_modules", "dist", "*.test.ts"],
  rules: {
    "generic-variables": "error", // Cambiar severidad
    "excessive-comments": "off", // Desactivar regla
  },
  format: "compact",
};
```

**Implementación:** En `cli.ts`, antes de ejecutar:

```typescript
const config = await loadConfig(options.config || "vibrant.config.js");
// Merge CLI args con config (CLI args tienen prioridad)
```

### Mejora 2: Ignorar con Comentarios

Permitir ignorar líneas específicas:

```typescript
// vibrant-ignore-next-line
const data = fetchData(); // No reportará "variable genérica"
```

**Implementación:** En cada regla, verificar si la línea anterior tiene el comentario de ignore.

### Mejora 3: Modo Fix Automático

Algunos problemas se pueden arreglar automáticamente:

```typescript
// Antes (warning: unused import)
import { unused } from "./utils";

// Fix automático: remover la línea
```

**Implementación:**

- Agregar `fix?: (issue: LintIssue) => string` a las reglas
- En `runner.ts`, si `--fix` está activo, aplicar transformaciones
- Reescribir archivos modificados

### Mejora 4: Análisis AST Avanzado

**Actual:** Regex simple (rápido pero limitado)
**Mejora:** Usar el AST para análisis semántico

```typescript
// Detectar funciones con demasiados parámetros
if (node.type === "FunctionDeclaration") {
  if (node.params.length > 4) {
    issues.push({
      message: `Función con ${node.params.length} parámetros (máximo recomendado: 4)`,
      line: node.loc.start.line,
      // ...
    });
  }
}
```

### Mejora 5: Cache de Resultados

Para proyectos grandes, cachear resultados entre ejecuciones:

```typescript
// Guardar hash de archivos + timestamp
// Si el archivo no cambió, usar resultado cacheado
```

### Mejora 6: Modo Watch

```bash
vibrant . --watch
```

**Implementación:**

- Usar `fs.watch()` o `chokidar`
- Re-ejecutar análisis cuando cambian archivos
- Mostrar solo nuevos issues o limpiar pantalla

### Mejora 7: Reportes

Generar reportes en diferentes formatos:

```bash
vibrant . --output report.html
vibrant . --output report.md
vibrant . --output junit.xml  # Para CI/CD
```

---

## Roadmap de Desarrollo

### Fase 1: MVP (Estás aquí)

- ✅ CLI básico funcional
- ✅ 4 reglas de detección
- ✅ Output en 3 formatos
- ✅ Web landing simple

### Fase 2: Mejoras Core (2-3 semanas)

- [ ] Config file (`vibrant.config.js`)
- [ ] Ignorar líneas con comentarios
- [ ] Cache de análisis
- [ ] Modo watch
- [ ] Más reglas (10+)
- [ ] Tests unitarios

### Fase 3: Developer Experience (2-3 semanas)

- [ ] Autofix para reglas simples
- [ ] Reportes HTML/JSON detallados
- [ ] Integración CI/CD (GitHub Action)
- [ ] VS Code Extension
- [ ] Mejorar landing (playground)

### Fase 4: AI Integration (3-4 semanas)

- [ ] Comando `--ai` con OpenAI
- [ ] Sugerencias inteligentes
- [ ] Explicación de issues
- [ ] Refactoring automático

### Fase 5: Producción (1-2 semanas)

- [ ] Publicar en npm
- [ ] Documentación completa
- [ ] Marketing/Community
- [ ] GitHub releases automatizados

---

## Testing Local

### Método 1: Link Local (Recomendado para desarrollo)

```bash
# 1. Entrar al CLI
cd apps/cli

# 2. Build
bun run build

# 3. Crear link global
bun link

# 4. Ahora puedes usar `vibrant` en cualquier lado
vibrant --help
vibrant .
vibrant ~/projects/otro-proyecto --format json

# 5. Para desinstalar
bun unlink vibrant
```

**Ventajas:**

- Usa el código actual sin instalar desde npm
- Cambios en el código se reflejan inmediatamente (después de build)

**Flujo de desarrollo con link:**

```bash
# Hacer cambios en apps/cli/src/
# ...

# Rebuild
bun run build

# Probar inmediatamente en cualquier proyecto
vibrant ~/mi-proyecto
```

### Método 2: Ejecutar Directamente

```bash
# Sin build (más lento, pero no necesitas rebuild)
bun run apps/cli/src/bin.ts .

# Con build (más rápido, necesitas rebuild después de cambios)
bun run build
./apps/cli/dist/bin.js .
```

### Método 3: Probar en el Propio Proyecto

```bash
# Analizar el código de vibrant con vibrant
bun run apps/cli/src/bin.ts apps/cli/src/
```

### Testing en Otros Proyectos

```bash
# Ir a otro proyecto
cd ~/projects/mi-app

# Si hiciste bun link:
vibrant . --format json

# Ver solo errores:
vibrant . 2>&1 | grep error

# Guardar reporte:
vibrant . --format json > vibrant-report.json
```

### Debugging

```bash
# Ver output completo para debug
DEBUG=vibrant* vibrant .

# O agregar console.log en el código y:
bun run apps/cli/src/bin.ts . --format json
```

---

## Publicación en npm

### ¿Cuándo publicar?

**Espera a tener:**

- ✅ CLI funcional y estable
- ✅ Al menos 5-10 reglas útiles
- ✅ Tests básicos
- ✅ README con documentación
- ✅ Landing page online

**No esperes a tener todo perfecto**, un MVP funcional es suficiente para v0.1.0

### Paso a Paso para Publicar

#### 1. Preparar el Package

```bash
cd apps/cli

# Verificar package.json
cat package.json
```

**Campos importantes:**

```json
{
  "name": "vibrant-cli", // O "vibrant" si está disponible
  "version": "0.1.0",
  "description": "CLI tool for detecting vibecoded code",
  "main": "dist/index.js",
  "bin": {
    "vibrant": "./dist/bin.js"
  },
  "files": ["dist"], // Solo subir dist/, no src/
  "keywords": ["cli", "linter", "ai", "code-quality"],
  "author": "Tu Nombre",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/tuusuario/vibrant.git"
  }
}
```

#### 2. Build de Producción

```bash
# Limpiar build anterior
rm -rf dist

# Build optimizado
bun build src/bin.ts --outfile=dist/bin.js --target=node --shebang --minify

# Verificar que existe
ls -la dist/
```

#### 3. Test Final

```bash
# Probar el build localmente
./dist/bin.js --help
./dist/bin.js .
./dist/bin.js . --format json
```

#### 4. Login en npm

```bash
# Crear cuenta en npmjs.com si no tienes

# Login en CLI
npm login
# O si usas bun:
bunx npm login

# Verificar login
npm whoami
```

#### 5. Publicar

```bash
# Publicar versión
npm publish

# Si es primera vez y el nombre está tomado:
# Cambiar "name" en package.json a "vibrant-cli" o "@tuusuario/vibrant"

# Publicar como scoped (recomendado si el nombre simple está tomado)
npm publish --access public
```

#### 6. Verificar Publicación

```bash
# En otra carpeta, instalar global
npm install -g vibrant-cli

# Probar
vibrant --version
vibrant --help

# O usar npx (sin instalar)
npx vibrant-cli .
```

### Versionado

Usar [Semantic Versioning](https://semver.org/):

- **0.1.0** - MVP inicial
- **0.2.0** - Nuevas features (backward compatible)
- **0.2.1** - Bug fixes
- **1.0.0** - API estable, producción ready

**Comandos:**

```bash
# Actualizar versión
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0

# Luego publicar
npm publish
```

### Automatización (GitHub Actions)

Crear `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd apps/cli && bun run build
      - run: cd apps/cli && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Debugging

### Problemas Comunes

#### "command not found: vibrant"

```bash
# Verificar que está instalado globalmente
npm list -g vibrant-cli

# Verificar PATH
echo $PATH
which vibrant

# Solución: Reinstalar
npm uninstall -g vibrant-cli
npm install -g vibrant-cli
```

#### "Cannot find module"

```bash
# Limpiar e instalar de nuevo
rm -rf node_modules bun.lockb
bun install
```

#### Errores de TypeScript

```bash
# Verificar tipos
bun run typecheck

# O manualmente
cd apps/cli
npx tsc --noEmit
```

#### Build falla

```bash
# Verificar que todos los imports son correctos
# No usar extensiones en imports:
import { algo } from './file'  // ✅
import { algo } from './file.ts' // ❌

# Verificar que no hay dependencias circulares
```

### Debug Mode

Agregar a `linter.ts`:

```typescript
if (process.env.DEBUG === "vibrant") {
  console.log("Analizando archivo:", filePath);
  console.log("Reglas activas:", this.rules.keys());
}
```

Usar:

```bash
DEBUG=vibrant vibrant .
```

---

## Recursos Útiles

- **Bun Docs**: https://bun.sh/docs
- **Commander.js**: https://github.com/tj/commander.js
- **TypeScript ESTree**: https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/typescript-estree
- **AST Explorer**: https://astexplorer.net/ (para debuggear análisis AST)
- **Picocolors**: https://github.com/alexeyraspopov/picocolors
- **npm Publishing**: https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry

---

## Checklist Antes de Publicar

- [ ] Build exitoso: `bun run build`
- [ ] CLI funciona: `./dist/bin.js --help`
- [ ] Testeado en proyectos reales
- [ ] README completo con ejemplos
- [ ] Versión actualizada en package.json
- [ ] Licencia (MIT recomendado)
- [ ] .gitignore incluye node_modules y dist/
- [ ] No hay secretos/API keys en el código
- [ ] package.json tiene todos los campos necesarios
- [ ] Landing page básica funciona

---

**¿Preguntas?** Revisa la sección de Debugging o Roadmap para saber por dónde continuar.
