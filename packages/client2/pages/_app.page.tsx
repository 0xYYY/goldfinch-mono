import "react-toastify/dist/ReactToastify.min.css";
import "../styles/globals.css";
import { ApolloProvider } from "@apollo/client";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ToastContainer } from "react-toastify";

import { DevToolsPanel } from "@/components/dev-tools";
import { Layout } from "@/components/layout";
import { apolloClient } from "@/lib/graphql/apollo";
import { useAppInitialization } from "@/lib/state/app-init";
import { AppWideModals } from "@/lib/state/app-wide-modals";

export default function MyApp({ Component, pageProps }: AppProps) {
  useAppInitialization();
  return (
    <ApolloProvider client={apolloClient}>
      <ToastContainer position="top-center" theme="colored" />
      <Head>
        <title>Goldfinch</title>
        {/* remove this if we decide we want Google to index the app pages (unlikely) */}
        <meta name="robots" content="noindex" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>

      <AppWideModals />

      {process.env.NEXT_PUBLIC_ENV === "local" && <DevToolsPanel />}
    </ApolloProvider>
  );
}
