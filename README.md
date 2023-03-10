#### **Установка проекта**

###### Требуемое окружение сервера Linux
OS `Debian/Ubuntu`

`git`   
`docker`   
`docker-compose`

###### Установка

* создать файл .env по аналогии с .env-sample
* создать директорию `code/dist`
* Из корневой директории выполнить 

`make up` или `docker-compose up -d`
    
  Для просмотра хода выполнения можно выполнить команду
   
   `docker-compose up -d && docker-compose logs -f`

* В контейнере `vuejs` выполнить компиляцию 
с изменением ограничения памяти (**если фронт не собрался**):
 
```
docker-compose run --rm vuejs sh
export NODE_OPTIONS=--max_old_space_size=4096
cd /web/code/ && npm run build
```

Фронт доступен по `localhost:3181` (номер порат, который указан в файле .env),
для разработки и *livereload* фронт необходимо открывать
по адресу `localhost:8080`
