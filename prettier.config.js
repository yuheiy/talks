/**
 * @see https://prettier.io/docs/configuration
 * @type {import('prettier').Config}
 */
export default {
  singleQuote: true,
  overrides: [
    {
      files: ['slides.md', 'pages/*.md'],
      options: {
        parser: 'slidev',
        plugins: ['prettier-plugin-slidev'],
      },
    },
  ],
};
