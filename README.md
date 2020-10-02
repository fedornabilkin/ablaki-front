#### **Установка проекта**

###### Требуемое окружение сервера Linux
OS `Debian/Ubuntu`

`git`   
`docker`   
`docker-compose`

###### Требуемые настройки Сервера Linux

В файл `/etc/hosts` добавить:

```
127.0.0.1 api.Ablaki.local 
127.0.0.1 Ablaki.local
```

###### Установка

* Создать конфиг `\code\src\config\params.js`   
Пример конфига - `\code\src\config\params.js-sample`   
    Указывается адрес для обращений к апи. Можно указать адрес тестовых серверов.


* Из корневой директории выполнить 

`make up` или `docker-compose up -d`
    
  Для просмотра хода выполнения можно выполнить команду
   
   `docker-compose up -d && docker-compose logs -f`

* В контейнере `vuejs` выполнить компиляцию (**если фронт не собрался**):
 
```
docker-compose exec vuejs sh
cd /web/code/ && npm run build
```

Фронт доступен по `Ablaki.local`, для разработки и livereload
фронт необходимо открывать по адресу `localhost:8080`
