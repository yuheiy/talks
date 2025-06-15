---
# You can also start simply with 'default'
theme: default
# random image from a curated Unsplash collection by Anthony
# like them? see https://unsplash.com/collections/94734566/slidev
# background: https://cover.sli.dev
# some information about your slides (markdown enabled)
title: npmパッケージじゃない仕組みで共有ライブラリを管理する
# apply unocss classes to the current slide
# https://sli.dev/features/drawing
drawings:
  persist: false
# slide transition: https://sli.dev/guide/animations.html#slide-transitions
transition: undefined
# enable MDC Syntax: https://sli.dev/features/mdc
mdc: true
# take snapshot for each slide in the overview
overviewSnapshots: true
colorSchema: light
routerMode: hash
contextMenu: false
---

# npmパッケージじゃない仕組みで共有ライブラリを管理する

Webフロントエンドを軸に、幅を広げたエンジニアたちの仕事

<style>
  * {
    font-feature-settings: "palt";
  }

  h1 {
    font-weight: bold;
  }

  p {
    margin-top: -0.25rem !important;
  }
</style>

<!--
- 発表時間: 10分
- https://plaidtech.connpass.com/event/328629/
-->

---
layout: intro
---

# yuhei (@\_yuheiy)

プレイド / デザインエンジニア

<img class="w-48 border border-slate-400" src="/assets/yuhei.png" alt="">

所属:

- Developer Experience & Performance
- デザインシステム

<!--
- 簡単に自己紹介をしますと、yuheiというものです
- 普段の業務では、社内の開発環境の改善などをしてるんですが、
- 今日はその一環として、社内の共有ライブラリの管理方法を刷新したという話をしていこうと思います
-->

---

```console {|9}
plaidev/karte-io-systems/
├── systems/
│   ├── academy2/
│   ├── action-editor/
│   ├── action-table/
│   ├── admin/
│   ├── apiv2/
│   ├── baisu/
│   ├── communication/
│   ├── craft/
│   ├── datahub/
│   ├── demo-sites/
│   ├── developers/
│   ├── edge/
│   ├── envelope-service/
│   └── （略。あと30ディレクトリくらいある）
└── README.md
```

<!--
- まず、KARTEというサービスは、複数のプロダクトの組み合わせからなる集合体のようなものなんですが、それらのほとんどのソースコードは、karte-io-systemsという一つのGitリポジトリの中に集約されてます
- その中のsystemsというディレクトリの中でソースコードが分割されてまして、この一つ一つのディレクトリをシステムと呼ぶんですが、
- （スライドを進める）
- 例としてこのcommunicationというシステムの中を見てみると、
-->

---

```console {3-99}
plaidev/karte-io-systems/
└── systems/
    └── communication/
        ├── packages/
        │   ├── front-react/
        │   │   └── package.json
        │   ├── front/
        │   │   └── package.json
        │   ├── lib/
        │   │   └── package.json
        │   └── web/
        │       └── package.json
        └── package.json
```

<!--
- こんな感じの構造になってます
- ソースコードはパッケージとして分割されていて、npmのワークスペースを使って管理されてます
- ちなみに、システムのバックエンドはほとんどnode.jsで実装されてるので、ひと通りnpmのエコシステムの中で扱えるようになってます
- で、ここからが本題なんですが、こうしたシステムごとのソースコードはこのように分割されてるわけですが、場合によっては、複数のシステム同士が連携するために、システムをまたいだ共通のデータを参照したいということがあるんですね
-->

---

```js
const EVENT_NAMES = [
  {
    id: 'view',
    event_name: '閲覧',
    tag_name: '閲覧',
    is_auto_send: false,
  },
  {
    id: 'buy',
    event_name: '購入',
    tag_name: '購入',
    is_auto_send: false,
  },
  {
    id: 'identify',
    event_name: 'ユーザー情報',
    tag_name: 'ユーザー情報',
    is_auto_send: false,
  },
  ...
```

<!--
- たとえばkarteには「定義済みイベント」という概念がありまして、ユーザーの行動を解析するために使われるものなんですが、そのイベントのデータを一元管理しているJavaScriptファイルというのがあります
- これをプレイドでは「constants」と呼んでるんですが、つまり「定数」ですね
- ここにはいろんなプロダクトで使う大量の定数がまとまってまして、行数で言うと全部で1万行くらいですね
- これまでは、これを複数のJSONファイルとしてビルドして、npmパッケージとして配布してました
-->

---

`systems/communication/packages/web/package.json`:

```json
{
  "name": "communication/web",
  "dependencies": {
    "@plaidev/nodejs-constants": "x.x.x"
  }
}
```

`systems/communication/packages/front/package.json`:

```json
{
  "name": "communication/front",
  "dependencies": {
    "@plaidev/frontend-constants": "x.x.x"
  }
}
```

<!--
- それを、このように、各システムのパッケージからインストールして使っていたというわけですね
- 数としては100くらいのパッケージからインストールされてました
- で、こうしてnpmパッケージとして提供すると一つ問題になるが、どうやってパッケージのバージョンをアップデートし続けてもらうかということなんですね
- constantsの内容は日頃アップデートされ続けてるんですが、その度に新しいバージョンがリリースされる一方で、ユーザー側が使うバージョンはアップデートされずに放置されがちでした
- 一般的なライブラリであれば、利用者の任意のタイミングでバージョンアップする運用で問題ないんですが、
- constantsの場合はプロダクトの仕様に関わるデータなので、変更があればできるだけ早く実環境に反映したいという事情があります
-->

---
layout: image
image: ./version-up.png
backgroundSize: contain
---

<!--
- ただ、そのための対策を何もしていなかったかというとそうでもなくて、
- 以前は、パッケージをリリースしたタイミングで、ユーザー側のバージョンも同時にアップデートするという仕組みが運用されてました
- ただあるときから、これが、nodejsのバージョン由来の問題で動かなくなってしまっていたんですね
- 加えて、パッケージとして管理するという運用そのものにいろいろと不都合があったので、この機会に思い切ってやり方を見直すことにしました
-->

---
layout: statement
---

# 定数ファイルを<br>単純にコピーして配布する

<!--
- で、結論から言うと、パッケージとして配布するのをやめて、定数ファイルを直接コピーして配布するという仕組みを作って、乗り換えることにしました
- 具体的に説明しますと、
-->

---

# 1. JSONファイルを生成する

```console {|2-10|6-7|8-9|3-5}
plaidev/karte-io-systems/
├── shared-constants/
│   ├── __generated__/
│   │   ├── common/products.json
│   │   └── ...
│   ├── scripts/
│   │   └── build.ts
│   ├── src/
│   │   └── index.ts
│   └── sync-config.ts
└── systems/
    ├── communication/packages/
    │   ├── front/src/generated-shared-constants/
    │   └── web/src/generated-shared-constants/
    └── craft/packages/
        ├── common/src/generated-shared-constants/
        └── front-react/src/generated-shared-constants/
```

<!--
- 新しい仕組みの方は「constants」の代わりに
- （スライドを進める）
- 「shared-constants」という名前に言い換えることにしたんですが、まずこのshared-constantsを
- （スライドを進める）
- ビルドするスクリプトを実行すると、
- （スライドを進める）
- ソースファイルから
- （スライドを進める）
- JSONファイルが生成されます
-->

---

# 2. 設定に応じて対象ディレクトリへ一斉にコピー

```console {10}
plaidev/karte-io-systems/
├── shared-constants/
│   ├── __generated__/
│   │   ├── common/products.json
│   │   └── ...
│   ├── scripts/
│   │   └── build.ts
│   ├── src/
│   │   └── index.ts
│   └── sync-config.ts
└── systems/
    ├── communication/packages/
    │   ├── front/src/generated-shared-constants/
    │   └── web/src/generated-shared-constants/
    └── craft/packages/
        ├── common/src/generated-shared-constants/
        └── front-react/src/generated-shared-constants/
```

<!--
- そして、生成されたJSONファイルはこの「sync-config」というファイルの設定に応じて対象のディレクトリに一気にコピーされるようになってます
-->

---

```ts {|13-14}
import type { SyncConfig } from './scripts/lib/sync-config';

const config: SyncConfig = [
  {
    name: 'communication/front',
    needs: [
      'common/admin_role',
      'common/chat_status',
      'common/event_name',
      'common/products',
      // preserve from formatting
    ],
    outputDir:
      '../systems/communication/packages/front/src/generated-shared-constants',
    outputExt: 'json',
  },
  {
    name: 'communication/front-react',
    needs: [
      'common/admin_role',
      // preserve from formatting
    ],
    outputDir:
      '../systems/communication/packages/front-react/src/generated-shared-constants',
    outputExt: 'json',
  },
  ...
];

export default config;
```

<!--
- 設定はこんな感じで、定数を使うパッケージを配列で並べたものなんですが、
- （スライドを進める）
- このoutputDirで指定したディレクトリにファイルがコピーされるようになってます
-->

---

# 2. 設定に応じて対象ディレクトリへ一斉にコピー

```console {13-14,16-17}
plaidev/karte-io-systems/
├── shared-constants/
│   ├── __generated__/
│   │   ├── common/products.json
│   │   └── ...
│   ├── scripts/
│   │   └── build.ts
│   ├── src/
│   │   └── index.ts
│   └── sync-config.ts
└── systems/
    ├── communication/packages/
    │   ├── front/src/generated-shared-constants/
    │   └── web/src/generated-shared-constants/
    └── craft/packages/
        ├── common/src/generated-shared-constants/
        └── front-react/src/generated-shared-constants/
```

<!--
- で、このように、さっきの設定の数だけディレクトリが生成されるという感じですね
-->

---

```ts {6-12}
import type { SyncConfig } from './scripts/lib/sync-config';

const config: SyncConfig = [
  {
    name: 'communication/front',
    needs: [
      'common/admin_role',
      'common/chat_status',
      'common/event_name',
      'common/products',
      // preserve from formatting
    ],
    outputDir: '../systems/communication/packages/front/src/generated-shared-constants',
    outputExt: 'json',
  },
  {
    name: 'communication/front-react',
    needs: [
      'common/admin_role',
      // preserve from formatting
    ],
    outputDir: '../systems/communication/packages/front-react/src/generated-shared-constants',
    outputExt: 'json',
  },
  ...
];

export default config;
```

<!--
- で、さらに、設定項目としてneedsというフィールドを設けてまして、ここに必要な定数の種類を書くようにしてます
- 定数の種類は今のところ全部で60個くらいあるんですが、どこで何が使われているかがわからなくなりがちなので、明示的に指定するようにしました
-->

---

# 3. 対象の定数ファイルだけがコピーされる

```console {5-9}
plaidev/karte-io-systems/
└── systems/
    └── communication/packages/
        └── front/src/generated-shared-constants/
            ├── common/
            |   ├── admin_role.json
            |   ├── chat_status.json
            |   ├── event_name.json
            |   └── products.json
            ├── .gitattributes
            └── README.md
```

<!--
- これによって、実際に必要なファイルだけがコピーされるようになってます
-->

---

# 4. git commitする

```sh
$ cd plaidev/karte-io-systems/shared-constants
$ npm run build
$ git add --all
$ git commit -m "Update shared-constants"
```

<!--
- で、最後に重要なんですが、生成したファイルは.gitignoreとかで除外しないで、すべてコミットするようにします
-->

---

# Pros

- すべての依存箇所を確実にアップデートできる
- publishの手順を経由せずにテストできる
- 定数の利用箇所が明確になる
- 変更履歴を利用者側から追跡しやすくなる

<!--
- というわけでこういう仕組みを作ったわけですが、なぜこうしたかというと、いくつかポイントがあります
- 最初の、「すべての依存箇所を確実にアップデートできる」というのはわかりやすいと思うんですが、後の項目については個別に説明していきます
-->

---

# publishの手順を経由せずにテストできる

- パッケージ単体では意味のあるテストができないので、利用側に適用してテストするのが妥当
- 新しい仕組みでは、パッケージをリリースしないでも動作確認ができる
- pull requestを作成したタイミングで、影響する別システムのCIも実行される

<v-click>
```yaml
  name: "[communication] CI"
  on:
    pull_request:
      paths:
        - systems/communication/**
```
</v-click>

<!--
- まず「publishの手順を経由せずにテストできる」ということなんですが、
- 以前の、パッケージとしてpublishするスタイルだと、実際のシステムに適用する前にパッケージ側だけを変更してpublishしないといけなかったので、動作確認するのが難しかったんですね
- それが、ローカルでビルドするだけで変更を適用できるようになったので、その場で動作検証できるし、パッケージだけ個別にpublishするという手順も省けるようになりました
- さらにもうひとつうれしいのが、karteのリポジトリだと、対象のディレクトリに変更があったときだけCIを実行するという仕組みが一般的になってまして
- （スライドを進める）
- こういう風に、自分に関係のあるファイルが変更されたときだけテストを実行するという感じですね
- これが、新しい仕組みだと、コピーされたファイルがこのパターンにマッチするようになるので、pull requestを作成すると自ずと関係するシステムのテストだけが実行されるという感じになります
-->

---

# 定数の利用箇所が明確になる

- 影響箇所を意識しながら変更できるので、不用意な問題の混入を防げる

<v-click>

```console
yuhei.yasuda@plaid-yuhei-yasuda shared-constants % npm run build

> shared-constants@0.0.0 build
> tsx scripts/build.ts

（中略）

┌────────────────────────────────────────────┬─────────────────────────────────────────────┐
│ Constants Scope                            │ Needed By                                   │
├────────────────────────────────────────────┼─────────────────────────────────────────────┤
│ common/admin_role                          │ - fuzzy-adventure                           │
│                                            │ - glowing-octo-computing-machine            │
│                                            │ - legendary-enigma                          │
│                                            │ - literate-train                            │
│                                            │ - miniature-parakeet                        │
│                                            │ - shiny-robot                               │
│                                            │ - special-octo-giggle                       │
├────────────────────────────────────────────┼─────────────────────────────────────────────┤
│ common/chat_status                         │ - redesigned-goggles                        │
│                                            │ - upgraded-octo-telegram                    │
├────────────────────────────────────────────┼─────────────────────────────────────────────┤
│ common/contract_status                     │ - fantastic-happiness                       │
├────────────────────────────────────────────┼─────────────────────────────────────────────┤
│ common/data_types                          │ - animated-tribble                          │
│                                            │ - congenial-goggles                         │
│                                            │ - friendly-enigma                           │
│                                            │ - ideal-adventure                           │
│                                            │ - psychic-engine                            │
│                                            │ - redesigned-octo-system                    │
│                                            │ - refactored-memory                         │
│                                            │ - super-memory                              │
│                                            │ - upgraded-telegram                         │
│                                            │ - urban-potato                              │
│                                            │ - verbose-succotash                         │
```

</v-click>

<style>
  .slidev-code {
    --slidev-code-font-size: 8px;
  }
</style>

<!--
- 次が、「定数の利用箇所が明確になる」ということです
- 以前の、パッケージでの運用だと、どの定数がどこから使われているかがわかりにくかったので、変更したときに意図しない場所に影響が及んで、知らず知らずのうちに別のシステムが壊れてしまうような問題がありました
- 新しい仕組みだと、変更のタイミングで影響範囲を意識できることと、それに加えて、CIでテストが実行されるので、このような問題を軽減できると考えています
- （スライドを進める）
- また、どの定数がどこから利用されているかは設定ファイルに記述されてるんですが、ビルドしたときにこのような使用状況を表示する仕組みも実装しています
-->

---

# 変更履歴を利用者側から追跡しやすくなる

- 定数が変更された経緯をgitで調べられる
- 自分に関係のない定数の変更は無視できる

![](/assets/file-history.png)

<!--
- 続いては「変更履歴を利用者側から追跡しやすくなる」ことですね
- もし、システムに何かしらの問題が発生したときには、原因を調べるためにソースコードやそのgitのログを追ったりすることがよくあると思うんですが、パッケージに起因する問題の場合は、問題箇所の特定がやや面倒になりがちだと思います
- でもこれも、ファイルをコピーするという仕組みにすることで、ログが追いやすくなりました
- さらに、使ってない定数ファイルの変更は自ずと除外されるので、ノイズが少ないというのもいいところですね
-->

---

# Cons

- パッケージからの移行に手間がかかる
- ビルドされたファイルが確実にコミットされることを保証できない
- pull requestのdiffがうるさい
- 外部リポジトリと連携できない
- 独自の仕組みを運用できるか懸念がある

<!--
- 一方で、もちろん良いことばかりではなくて、こういう問題もありました
-->

---

# Cons

- パッケージからの移行に手間がかかる<br>
  ➡️ **移行用のスクリプトを書いて自動化する**
- ビルドされたファイルが確実にコミットされることを保証できない<br>
  ➡️ **保証する仕組みを作る**
- pull requestのdiffがうるさい<br>
  ➡️ **ノイズを軽減する**
- 外部リポジトリと連携できない<br>
  ➡️ **連携する仕組みを作る**
- 独自の仕組みを運用できるか懸念がある<br>
  ➡️ **周知 ＆ ドキュメントでカバーする**

<!--
- なので、これらはこのように解決することにしました
- で、このまま詳しく説明していきたいところなんですが、
-->

---
layout: statement
---

# 後日ブログ書きます

<!--
- 時間の都合により続きは後日ブログにまとめますので、この場ではご容赦いただいて、プレイドからの発信をウォッチしておいていただければ幸いです
- 以上です。ありがとうございました
-->

---

# パッケージからの移行プロセス

- パッケージはおよそ1200ファイルから参照されていた
- 移行用スクリプトを実装して作業を自動化
  - パッケージを参照するパスを書き換え
    ```js
    import { PRODUCT_NAMES } from '@plaidev/nodejs-constants/build/products.json';
    //                                                 ↑ Before / After ↓
    import { PRODUCT_NAMES } from './path/to/generated-shared-constants/common/products.json';
    ```
  - システムごとに必要な設定を生成
    ```js
    {
      name: ...,
      needs: [
        ...
      ],
      outputDir: ...,
      outputExt: ...,
    },
    ```
- スコープを区切ってpull requestを作成し、担当者にレビューと動作確認依頼
- 新しい仕組みと旧パッケージを同時にビルドする仕組みを作成
  - 移行が完了するまで両方を共存させる
- 移行完了後にパッケージを廃止

<style>
  .slidev-code {
    --slidev-code-font-size: 10px;
  }

  pre {
    padding-top: 0 !important;
  }
</style>

<!--
- まず、パッケージからの移行についてなんですが、
- constantsのパッケージはおよそ1200くらいのファイルから参照されてまして、それらを全部手動で移行するのは現実的ではありませんでした
- なので、移行用のスクリプトを実装して、定数ファイルへのパスを書き換えたり、システムごとに必要な設定を生成したりするのを自動でできるようにしました
- ただ、それだけで確実に問題なく移行ができるかどうかは保証できないので、pull requestを細かく分解して、それぞれのシステムの担当者にレビューをしてもらいました
-->

---

# ビルドされたファイルのコミットを保証する仕組み

- CIでビルドを実行して差分が出れば、CIを落としてpull requestにコメントで警告する

![](/assets/generation-check-status.png)

![](/assets/generation-check-comment.png)

<style>
  img {
    margin-inline: auto;
  }
</style>

<!--
- 続いて、新しい仕組みでは、ビルドしたファイルはgitにコミットする運用になっているんですが、
- そうすると問題になるが、そのファイルが確実にコミットされているかどうかを保証できないということです
- これについては、正しくコミットできてなければCIを落として、かつコメントで警告するという仕組みを作ってカバーしました
-->

---

# diffのノイズを減らす

- `.gitattributes`に`linguist-generated=true`を指定する

![](/assets/hide-diff.png)

<!--
- 続いてが、コピーで配布するという仕組み上、gitの差分が余計に発生するので、logが見づらいという問題があります
- これについては根本的には解決できないんですが、.gitattributesでdiffを非表示にすることでgithub上では少し見やすくなるように工夫しています
-->

---

# 外部リポジトリに変更を同期する仕組み

- 定数を変更するpull requestがマージされたら、外部リポジトリにも同期するpull requestを作成する

![](/assets/external-repository-comment.png)

![](/assets/external-repository-pr.webp)

<style>
  img {
    width: 77%;
    margin-inline: auto;
  }
</style>

<!--
- 次に、これは基本的に一つのリポジトリだけで完結する仕組みなので、外部のリポジトリとの連携がしづらいのが弱点なんですが、
- これについては、定数を変更するpull requestがマージされたタイミングで、自動的に外部のリポジトリにもpull requestを作成するという仕組みを作って対処してます
-->

---

# 独自の仕組みなのでドキュメントは手厚めに

<div class="cols">

![](/assets/docs-pr.png)

![](/assets/docs-readme.png)

</div>

<style>
  .cols {
    display: flex;
    gap: 4rem;
    width: 51%;
    margin-inline: auto;
  }
</style>

<!--
- 最後に、こういう独自の仕組みを作ると、使い方がわからなかったり、設計意図が伝わらなくて正しく運用されなかったりしがちなんですが、
- これについては、ドキュメントを手厚めに書いたり、issueやpull requestコメントで変更の経緯をまとめたりすることでカバーしています
-->
