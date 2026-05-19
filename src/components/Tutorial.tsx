import { useState } from 'react';
import { useGameStore } from '../store';

const STEPS = [
  {
    emoji: '🌱',
    title: "Howdy, farmer!",
    body: 'You inherited a plot of dirt and a dream. Tap your starter field to plant and harvest. Patience grows the empire.',
  },
  {
    emoji: '🚜',
    title: 'Hire the metal hands',
    body: 'Tapping crops gets old. Visit the Shop → Machines and buy a Harvester. It auto-collects so you can sip coffee instead.',
  },
  {
    emoji: '🚛',
    title: 'Get crops to market',
    body: 'Storage piles up fast. Grab a Truck from the Shop — they cart your goods to market for way more than the farm gate price.',
  },
  {
    emoji: '⭐',
    title: 'Then keep going',
    body: 'Daily missions, achievements, prestige, random events, gems for emergencies — there is a lot to find. Log in tomorrow for streak bonuses.',
  },
];

export default function Tutorial() {
  const completeTutorial = useGameStore(s => s.completeTutorial);
  const [step, setStep] = useState(0);

  const next = () => {
    if (step === STEPS.length - 1) {
      completeTutorial();
    } else {
      setStep(step + 1);
    }
  };

  const skip = () => completeTutorial();

  const cur = STEPS[step];

  return (
    <>
      <div className="backdrop" style={{ zIndex: 600 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(145deg, var(--surface-mid), var(--surface-deep))',
        border: '2px solid var(--gold)',
        borderRadius: 22, padding: '26px 28px',
        width: 'min(440px, 90vw)', zIndex: 700,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{cur.emoji}</div>
          <div className="display" style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 10 }}>{cur.title}</div>
          <div style={{ color: 'var(--ink-dim)', fontSize: 14, lineHeight: 1.55 }}>{cur.body}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              width: i === step ? 26 : 8, height: 8, borderRadius: 4,
              background: i === step ? 'var(--gold)' : 'var(--surface-line)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button
            onClick={skip}
            style={{
              background: 'transparent', border: '1.5px solid var(--surface-line)',
              color: 'var(--ink-mute)', fontSize: 13, fontWeight: 700,
              padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'Fredoka, sans-serif',
            }}
          >
            Skip
          </button>
          <button
            onClick={next}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, var(--terracotta), var(--gold))',
              color: 'var(--surface-deep)', border: 'none', fontSize: 15, fontWeight: 700,
              padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'Fredoka, sans-serif',
            }}
          >
            {step === STEPS.length - 1 ? "Let's farm! 🌾" : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
}
