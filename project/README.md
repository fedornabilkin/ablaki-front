# Ablaki

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run dev
```

### Compiles and minifies for production
```
npm run build
```

### Tests
```
npm run test:unit
npm run test:slow
npm run test:full
npm run test:profile
```

`test:unit` runs the ordinary isolated checks. `test:slow` runs the separately marked rendering and broad interaction checks. `test:full` runs both projects, unit first and slow second; it is required before production. `test:profile` runs the full suite and reports import costs.

Slow files use `*.slow.test.ts` and the Vitest `// @module-tag slow` marker. Filtering happens at file discovery, so the ordinary run does not load their component graphs. Per-file isolation remains enabled. Transformed modules are cached under `node_modules/.vitest-cache` for subsequent runs; `npm ci` removes this local cache.

To select cases: `npm run test:unit -- tests/auth.test.ts tests/httpClient.test.ts` or `npm run test:slow -- world-controls-interaction`. Build/runtime configuration is in `vite.config.js`. There is no separate lint or typecheck command.

# Работа с проектом
## Вывод ошибок 
Если необходимо вывести модальное окно с ошибкой
```vuejs
this.$root.$emit('showError', 'incorrectData');
```
Типы ошибок доступны по пути
```
texts/errors.js
```
Так же можно вывести просто текст ошибки, передав его вторым параметром.
Данные о поддержке подставятся автоматически
```vuejs
this.$root.$emit('showError', 'Некорректные данные'); 
/* Некорректные данные, опишите проблему в 
электронном письме */
```
Если нужно вывести ошибку без информации о поддержке, то передайте вторым параметром false 
```vuejs
this.$root.$emit('showError', 'Некорректные данные', false); 
/* Некорректные данные */
```
Если необходимо вывести модальное окно с ошибкой по умолчанию
```vuejs
this.$root.$emit('showError');
this.$root.$emit('showError', 'default', false); // без вспомагательного текста поддержки
```

## Страница не найдена
Для того чтобы вывести блок "Страница не найдена", например в случае если не было найдено информации в бд после выполнения запроса, необходимо написать
```vuejs
this.$root.$emit('pageNotFound', true);
```
