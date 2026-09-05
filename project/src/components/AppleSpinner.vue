<script setup>
// SVG-яблоко с непрерывным вращением вокруг оси Z (в плоскости экрана).
// size — размер в rem, speed — длительность одного оборота в секундах.
defineProps({
  size: { type: [Number, String], default: 4 },
  speed: { type: [Number, String], default: 3 },
});
</script>

<template lang="pug">
  svg.apple-spinner(
    :style="{ width: size + 'rem', height: size + 'rem', '--apple-speed': speed + 's' }"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Яблоко"
  )
    g.apple-spin
      //- листик
      path.apple-leaf(d="M52 24 C54 14 62 9 72 11 C70 21 62 27 52 28 Z")
      //- черенок
      path.apple-stem(
        d="M50 26 C49 19 50 14 54 11"
        fill="none"
        stroke-width="3"
        stroke-linecap="round"
      )
      //- тело яблока (две дольки)
      path.apple-body(d="M50 30 C42 22 28 24 24 36 C20 48 26 70 38 80 C44 85 47 82 50 82 C53 82 56 85 62 80 C74 70 80 48 76 36 C72 24 58 22 50 30 Z")
      //- блик
      path.apple-shine(d="M36 40 C32 44 31 52 34 58 C30 50 31 42 36 40 Z" opacity="0.5")
</template>

<style lang="scss" scoped>
.apple-spinner {
  display: inline-block;

  .apple-spin {
    transform-box: fill-box;
    transform-origin: center;
    animation: apple-rotate-z var(--apple-speed, 3s) linear infinite;
  }

  .apple-body {
    fill: var(--primary);
  }

  .apple-leaf {
    fill: var(--primary-hover);
  }

  .apple-stem {
    stroke: var(--text);
  }

  .apple-shine {
    fill: var(--text);
  }
}

// вращение вокруг оси Z = поворот в плоскости экрана
@keyframes apple-rotate-z {
  from {
    transform: rotateZ(0deg);
  }
  to {
    transform: rotateZ(360deg);
  }
}

// уважение к настройке «уменьшить движение»
@media (prefers-reduced-motion: reduce) {
  .apple-spinner .apple-spin {
    animation: none;
  }
}
</style>
