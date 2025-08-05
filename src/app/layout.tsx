import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <head>
        <title>WikiBlog N2O</title>
        <meta name="description" content="Web per exportar una pàgina de Notion a LaTeX, per poder generar documents PDF pesonalitzables amb Overleaf o editors similars." />
        <meta property="og:title" content="Notion a Overleaf" />
        <meta property="og:description" content="Web per exportar una pàgina de Notion a LaTeX, per poder generar documents PDF pesonalitzables amb Overleaf o editors similars." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ca_ES" />
        <meta property="og:image" content="/ms-icon-310x310.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://notion-a-overleaf.vercel.app" />
        <meta property="og:url" content="https://notion-a-overleaf.vercel.app" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
