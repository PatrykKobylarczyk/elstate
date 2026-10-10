import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import Intro from "@/components/Intro";

// Publiczna strona: ekran startowy, menu, stopka i silnik ruchu. CRM (/crm) ma własny, prosty układ.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Intro />
      <Nav />
      <main>{children}</main>
      <Footer />
      <Motion />
    </>
  );
}
