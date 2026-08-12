// import About from "../components/home/About";
// import CTA from "../components/home/Cta";
// import Features from "../components/home/Features";
// import Hero from "../components/home/Hero";
// import Stats from "../components/home/Stats";
// import Workflow from "../components/home/Workflow";
// import Navbar from "../components/layout/Navbar";


// export default function HomePage() {
//   return (
//     <main className="bg-[#0d1117] text-white min-h-screen">
//       <Navbar/>
//       <Hero/>
//       <Stats/>
//       <Features/>
//       <Workflow/>
//       <About/>
//       <CTA/>
//       {/* <Footer/> */}
//     </main>
//   );
// }


import About from "../components/home/About";
import CTA from "../components/home/Cta";
import Features from "../components/home/Features";
import Hero from "../components/home/Hero";
import Stats from "../components/home/Stats";
import Workflow from "../components/home/Workflow";
import Navbar from "../components/layout/Navbar";


export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar/>
      <Hero/>
      <Stats/>
      <Features/>
      <Workflow/>
      <About/>
      <CTA/>
    </main>
  );
}