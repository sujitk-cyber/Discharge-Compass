import "./globals.css";
import { ReactNode } from "react";
import { Inter, Instrument_Serif } from "next/font/google";
import Navigation from "../components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
});

export const metadata = {
  title: "Discharge Compass",
  description: "Readmission risk support for diabetes inpatient encounters",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body>
        <div className="app-shell">
          <Navigation />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
