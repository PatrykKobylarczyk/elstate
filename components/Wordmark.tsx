// Napis „elstate” złożony krojem strony. Nie używa logo z identyfikacji.
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold lowercase ${className}`}>
      elstate<span className="text-gold-500">.</span>
    </span>
  );
}
