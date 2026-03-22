import Head from "next/head";
export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>WOAI — World of AI</title>
        <meta name="description" content="Unfiltered AI Intelligence. No hype. No agenda." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
