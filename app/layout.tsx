import "./globals.css";

export const metadata = {
  title: "Mini Healthcare Agent",
  description: "Healthcare chatbot demo for Vercel deployment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
