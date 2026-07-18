import Header from "../components/Header";
import Hero from "../components/Hero";
import Benefits from "../components/Benefits";
import PilotBanner from "../components/PilotBanner";
import "../styles/home.css";

function HomePage() {
  return (
    <div className="home-page">
      <Header />

      <main className="home-main">
        <Hero />
        <Benefits />
        <PilotBanner />
      </main>
    </div>
  );
}

export default HomePage;