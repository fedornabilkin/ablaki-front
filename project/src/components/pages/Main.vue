<script setup>
const fact = {
  title: '',
  description: 'Хорошим комментарием на форуме заработай кредиты',
  type: 'info'
}
</script>
<template lang="pug">
  .container
    h1 Ablakin.ru - каждый день!
    p
      | Раз уж ты здесь, значит список пользователей сайта пополнится еще одним логином.
      | А почему это произойдет, сейчас узнаешь, если не испугаешься.
    p
      | Продолжаешь читать? Да неужели… Небось еще и правила полностью перечитываешь, перед тем как зарегистрироваться?
      | Никто их не читает, поэтому на этом сайте нет страницы с длинным бесполезным текстом.
      | Тут в основном только порядочные люди, которые думают, прежде, чем что-то написать или сделать.
    p
      | Вступая в ряды пользователей этого сайта, подумай, а нужен ли ты здесь?
      | Не принесешь ли ты вместе с регистрацией горе и печаль в сложившийся коллектив?
      | Помнишь? У нас думают прежде, чем что-то сделать. Есть у тебя уверенность, что это не поведенческая ловушка, попав в которую начнешь совершать иррациональные поступки?
      | Не дрейфь, жмакай кнопку в верхнем меню и будем знакомы.
    .row
      .col-xs-12.col-sm-6.m-b-1
        h6
          font-awesome-icon.text-warning(icon='fa fa-trophy')
          | Отзывчивый
        .pull-xs-left
          .user-info
            .rating.small.text-xs-center
              font-awesome-icon.text-info(icon='fa fa-star')
                span.amount 72.9
            img.avatar.img-rounded.img-thumbnail(src='' alt='')
        a.close.text-danger(href='/slider/remove/13' data-type='ajax' title='Удалить' aria-label='Close')
          span(aria-hidden='true') &times;
        .small.text-muted
          span.login.m-r-1
            a(href='/wall/Ass238' title='Страница пользователя Ass238')
              b Ass238
        div
          div Написал больше всех сообщений на форуме за предыдущий месяц.
        .clearfix
      .col-xs-12.col-sm-6.m-b-1
        h6
          font-awesome-icon.text-warning(icon='fa fa-trophy')
          | Король биржи
        .pull-xs-left
          .user-info
            .rating.small.text-xs-center
              font-awesome-icon.text-info(icon='fa fa-star')
                span.amount 155
            img.avatar.img-rounded.img-thumbnail(src='' alt='')
        a.close.text-danger(href='/slider/remove/9' data-type='ajax' title='Удалить' aria-label='Close')
          span(aria-hidden='true') &times;
        .small.text-muted
          span.login.m-r-1
            a(href='/wall/BORA179' title='Страница пользователя BORA179' target='_blank')
              b BORA179
        div
          div Купил больше всех кредитов на бирже за предыдущий месяц.
        .clearfix
    hr.m-b-1
    .row
      .col-xs-12.col-sm-6.col-lg-4
        span &Pcy;&ocy;&scy;&lcy;&iecy;&dcy;&ncy;&icy;&iecy; &vcy;&ycy;&pcy;&lcy;&acy;&tcy;&ycy;
        span.text-mutes.small (&dcy;&lcy;&yacy; &zcy;&acy;&mcy;&acy;&ncy;&ucy;&khcy;&icy;)
        table.table.table-sm.table-striped
          thead
            tr
              th &Kcy;&tcy;&ocy;
              th &Scy;&kcy;&ocy;&lcy;&softcy;&kcy;&ocy;
              th &Kcy;&ocy;&gcy;&dcy;&acy;
          tbody
            tr
              td &Vcy;&acy;&scy;&yacy;
              td &Bcy;&ocy;&lcy;&softcy;&shcy;&iecy; &vcy;&scy;&iecy;&khcy;
              td &Scy;&iecy;&gcy;&ocy;&dcy;&ncy;&yacy;
            tr
              td &Pcy;&iecy;&tcy;&yacy;
              td &KHcy;&ocy;&rcy;&ocy;&shcy;&icy;&jcy; &kcy;&ucy;&shcy;
              td &Vcy;&chcy;&iecy;&rcy;&acy;
            tr
              td &Icy;&vcy;&acy;&ncy;
              td &Ncy;&iecy;&mcy;&ncy;&ocy;&gcy;&ocy; &dcy;&iecy;&ncy;&iecy;&gcy;
              td &Ncy;&acy; &dcy;&ncy;&yacy;&khcy;
    el-alert.my-1(:title="fact.title" :description="fact.description" :type="fact.type" :closable="false" show-icon)

</template>

<style>
</style>
