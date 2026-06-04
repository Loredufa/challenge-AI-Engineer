import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="application-name" content="DocuMind AI" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
