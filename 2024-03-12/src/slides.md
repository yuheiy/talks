---
# try also 'default' to start simple
theme: default
# random image from a curated Unsplash collection by Anthony
# like them? see https://unsplash.com/collections/94734566/slidev
# background: https://cover.sli.dev
# some information about your slides, markdown enabled
title: 引数のあるmixinのような仕組みをプラグインとして実装する
# apply any unocss classes to the current slide
class: text-center
# https://sli.dev/custom/highlighters.html
highlighter: shiki
# https://sli.dev/guide/drawing
drawings:
  persist: false
# slide transition: https://sli.dev/guide/animations#slide-transitions
transition: fade
fonts:
  sans: Hiragino Sans
  local: Hiragino Sans
# enable MDC Syntax: https://sli.dev/guide/syntax#mdc-syntax
mdc: true
colorSchema: light
---

# 引数のあるmixin<br>のような仕組みを<br>プラグインとして実装する

安田 祐平（2024年3月12日）

<!--
（無言で次のページに行く）
-->

---
layout: image
image: /02.jpg
---

<!--
まず簡単に自己紹介ですが、雑誌版の「Tailwind CSS実践入門」を書いたものです。
-->

---
layout:
---

```scss
// https://qiita.com/degudegu2510/items/09f34d4b218c9df6bb57
@mixin triangle($size) {
  width: $size;
  height: calc(#{$size} / 2 * tan(60deg));
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.triangle {
  @include triangle(100px);
  background-color: rebeccapurple;
}
```

<!--
- さてさっそく本題なんですが、
- Tailwindを使っていると、Sassで言うところのmixinみたいな仕組みが欲しいということがたまにある
- たとえばこのように三角形を描画するためのものなど
- 実現方法はいろいろあるが、今回はこれをTailwindプラグインとして実装する方法をご紹介
-->

---
---

```js
const plugin = require('tailwindcss/plugin');

module.exports = {
  theme: {
    tabSize: { 1: '1', 2: '2', 4: '4', 8: '8' },
  },
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      matchUtilities(
        { tab: (value) => ({ 'tab-size': value }) },
        { values: theme('tabSize') },
      );
    }),
  ],
};
```

<!--
- 引数を取る仕組みを作るには、プラグインのmatchUtilitiesという関数を使う
- ほかにもmatchComponentsやmatchVariantというのもあるが、今回はユーティリティなのでmatchUtilitiesを使う
- このように実装すると（次のスライドに進む）
-->

---

```js
matchUtilities(
  { tab: (value) => ({ 'tab-size': value }) },
  { values: theme('tabSize') },
);
```

<hr class="my-[calc(18px*1.5)]">

テーマを使う例:

<div class="grid grid-cols-2 gap-x-4">
```html
<div class="tab-4">
  <!-- ... -->
</div>
```

```css
.tab-4 {
  tab-size: 4
}
```
</div>

arbitrary valuesを使う例:

<div class="grid grid-cols-2 gap-x-4">
```html
<div class="tab-[13]">
  <!-- ... -->
</div>
```

```css
.tab-\[13\] {
  tab-size: 13
}
```
</div>


<!--
- こんな感じのクラスが使えるようになる
- 「tab-4」のように書けばテーマの値を参照できる
- 「tab-[13]」のようにブラケットで囲えば、アービトラリーな値を直接指定できる
- 見ればわかる通り、このmatchUtilitiesのコールバック関数が返す値がそのままCSSとして出力されるという仕組み
- したがって、このvalueを基にして動的に宣言を組み立てることができる
-->

---

```js
matchComponents(
  {
    'auto-grid': (value) => ({
      display: 'grid',
      'grid-template-columns':
        `repeat(auto-fill, minmax(min(${value}, 100%), 1fr))`,
    }),
  },
);
```

<!--
- たとえばこのように、grid-template-columnsの値の一部としてvalueを挿入するようなこともできる
- この仕組みを活用することで、ほかにもいろいろできる
- ただ、引数の数が一つだけならいいものの、引数を複数取りたい場合には使いづらい
- そこで参考として、tailwindのコアプラグインではどのようになっているのかと調べてみると（次のスライドに進む）
-->

---

```html
<p class="text-base/6 ...">So I started to walk into the water...</p>
<p class="text-base/7 ...">So I started to walk into the water...</p>
<p class="text-base/loose ...">So I started to walk into the water...</p>
```

<v-click>
<hr class="my-[calc(18px*1.5)]">

`tailwindcss/src/corePlugins.js`:

```js {1,4-9}
text: (value, { modifier }) => {
  let [fontSize, options] = Array.isArray(value) ? value : [value]

  if (modifier) {
    return {
      'font-size': fontSize,
      'line-height': modifier,
    }
  }

  let { lineHeight, letterSpacing, fontWeight } = isPlainObject(options)
    ? options
    : { lineHeight: options }

  return {
    'font-size': fontSize,
    ...(lineHeight === undefined ? {} : { 'line-height': lineHeight }),
    ...(letterSpacing === undefined ? {} : { 'letter-spacing': letterSpacing }),
    ...(fontWeight === undefined ? {} : { 'font-weight': fontWeight }),
  }
},
```
</v-click>

<!--
- fontSizeのプラグインはこのように2値が取れるようになっている
- baseというのがfont-sizeで、「6、7、loose」というのがline-height
- この実装を見てみると、

（ページをめくる）

- 第二引数からmodifierというのを取って、それをline-heightの値として出力している
- 2値を取るプラグインを作りたいときにはこれと同じ要領で実現できる
- ただそうすると、引数の数を3つ以上にしたければどうするのか
- それはカスタムプロパティを使うことで実現できる
-->

---

```html {1}
<table class="border-separate border-spacing-2x3 border border-slate-400 ...">
  <thead>
    <tr>
      <th class="border border-slate-300 ...">State</th>
```

<hr class="my-[calc(18px*1.5)]">

```css
.border-spacing-2x3 {
  border-spacing: 0.5rem 0.75rem;
}
```

<!--
- CSSのプロパティにborder-spacingというのがある
- borderとborderの間の余白を縦方向と横方向で指定できる
- 問題は、縦と横を個別に設定できるプロパティが存在しないので、マルチクラスで別々の値を設定することができないこと
- しかしTailwindでは、カスタムプロパティを活用することで、縦と横を別々のクラスで指定できるようになっている
-->

---

```html {1}
<table class="border-separate border-spacing-x-2 border-spacing-y-3 border border-slate-400 ...">
  <thead>
    <tr>
      <th class="border border-slate-300 ...">State</th>
```

<hr class="my-[calc(18px*1.5)]">

```css
.border-spacing-x-2 {
  --tw-border-spacing-x: 0.5rem;
  border-spacing: var(--tw-border-spacing-x) var(--tw-border-spacing-y)
}

.border-spacing-y-3 {
  --tw-border-spacing-y: 0.75rem;
  border-spacing: var(--tw-border-spacing-x) var(--tw-border-spacing-y)
}
```

<!--
- このように、カスタムプロパティを使って値を挿入できるようにすることで、クラスの組み合わせによって引数のような仕組みを実現している
-->

---

Transforms:

```html
<div class="scale-75 translate-x-4 skew-y-3">
  <!-- ... -->
</div>
```

<hr class="my-[calc(18px*1.5)]">

Gradient Color Stops:

```html
<div class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ...">
  <!-- ... -->
</div>
```

<!-- - border-spacingのほかにも、transformやグラデーションの実装も同じような仕組みになっている
- それぞれのコアプラグインのソースコードを見れば、同じようなものが実装できるようになるはず
- ありがとうございました
 -->
