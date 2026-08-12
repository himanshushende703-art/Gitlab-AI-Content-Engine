
import "./globals.css";

export const metadata = {
  title: "GitLab ",
  description:
    "Multi-agent content generation for GitLab release notes, docs, and blogs.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1117] text-white">
        {children}

      </body>
    </html>
  );
}