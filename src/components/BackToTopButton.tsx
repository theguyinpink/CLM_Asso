import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 400);
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <button
      type="button"
      className={`back-to-top-button ${isVisible ? "is-visible" : ""}`}
      onClick={scrollToTop}
      aria-label="Revenir en haut de la page"
    >
      <ArrowUp size={22} strokeWidth={2.4} />
    </button>
  );
}

export default BackToTopButton;