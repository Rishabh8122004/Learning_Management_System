// A short burst of soft confetti dots from the middle of the parent (which must be positioned).
// Purely decorative; it plays once when it appears.
const PARTICLES = Array.from({ length: 16 }, (_, index) => ({
  angle: index * (360 / 16) + (index % 2 ? 9 : 0),
  distance: 40 + (index % 3) * 14,
  tone: index % 4,
  square: index % 3 === 0,
}));

function Burst({ big }) {
  return (
    <span className={`burst${big ? " burst-big" : ""}`} aria-hidden="true">
      {PARTICLES.map((particle, index) => (
        <i
          key={index}
          className={particle.square ? "is-square" : ""}
          style={{
            "--a": `${particle.angle}deg`,
            "--d": `${particle.distance * (big ? 1.6 : 1)}px`,
            "--c": particle.tone,
          }}
        />
      ))}
    </span>
  );
}

export default Burst;
