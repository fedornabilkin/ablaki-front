#!/bin/sh

CONFIG_FILE="/app/dist/js/config.js"
ENV_VARS=$(env | grep "VUE_APP_")

JSON_STRING="let appConfig = {";

for var in $ENV_VARS
do
    for key in $(echo "$var" | sed "s|\=.*||g")
    do
      JSON_STRING=$JSON_STRING'"'$key'": '

      for value in $(echo "$var" | sed "s|.*=||g")
      do
        JSON_STRING=$JSON_STRING'"'$value'", '
      done
    done
done

JSON_STRING=$JSON_STRING"};"

if [ -f $CONFIG_FILE ]
then
  echo $JSON_STRING > $CONFIG_FILE
fi

nginx -g 'daemon off;'
