LittleChart
===========

Компонент для работы с интерактивными графиками.

Особенности и ограничения компонента:
- тренды отображаются только в виде ломанных линий
- интерактивная навигация указателем мыши или пальцами на тачскринах
- интерактивный зум колесом мыши или пальцами на тачскринах
- отображение значений точек на трендах в хинтах
- отображение легенды
- датасеты с большим количеством точек
- определенные участки одного тренда могут быть стилизованы по разному

Статус
------

Находится в разработке.

Обратная совместимость
----------------------

Разработка ведется с учетом обратной совместимости в пределах минорной версии (x.y.\*).
Устаревшие мажорные версии (x.\*.\*) удаляются по истечению шести месяцев после выхода
пакета новой версии.

Установка
---------

NPM:

```sh
npm i littlechart
```

CDN:

```html
<script type="module">
import * as littlechart from 'https://unpkg.com/littlechart/dist/littlechart.min.js'
// ...
</script>
```

Пример использования
--------------------

```js
import { Chart, Dataset } from 'littlechart'

const domCanvas = document.querySelector('canvas.chart')

const chart = new Chart(domCanvas, {
    fontFamily: 'monospace',
    fontSize: 15,
    invertMouseWheel: true,
    userScaleY: evt => evt.detail.originalEvent.shiftKey ? false : true,
    // ...
})

const datasetOptions = {
    lineColor: 'rgb(255,0,255)'
    // ...
}
const dataset = new Dataset('Тренд 1', datasetOptions)

let y = -2000
const points = []
for (let x = 200; x <= 1000; x += 5) {
    y += 1 + 2 * Math.random()
    points.push([x, y])
}
dataset.compile(points)

chart.datasets.push(dataset)
chart.fitViewAuto()
```

Лицензия
--------

MIT
