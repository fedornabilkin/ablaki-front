# Ablaki

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your tests
```
npm run test
```

### Lints and fixes files
```
npm run lint
```

### Run your unit tests
```
npm run test:unit
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

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
