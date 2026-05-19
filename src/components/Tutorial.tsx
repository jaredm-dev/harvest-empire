import { useState } from 'react';
import { useGameStore } from '../store';

const STEPS = [
  {
    emoji: '🌱',
    title: 'Welcome to Harvest Empire!',
    body: 'Tap your starter field to plant and harvest crops. Crops grow over time — bigger fields hold more.',
  },
  {
    emoji: '🚜',
    title: 'Buy a Harvester',
    body: 'Open the Shop (bottom-left), then the Machines tab. Harvesters auto-collect your crops and send them to storage.',
  },
  {
    emoji: '🚛',
    title: 'Send Trucks to Market',
    body: 'Buy a Truck in the Shop. Trucks pull from your warehouse and deliver to market for big bonus profits.',
  },
  {
    emoji: '⭐',
    title: 'Prestige & Grow!',
    body: 'Hit prestige milestones to unlock new crops, fields, and a permanent income multiplier. Daily logins give bonus gems. Good luck, farmer!',
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
        background: 'linear-gradient(145deg, #1a2744, #0f172a)',
        border: '2px solid #16a34a',
        borderRadius: 20, padding: '24px 28px',
        width: 'min(440px, 90vw)', zIndex: 700,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{cur.emoji}</div>
          <div style={{ color: 'white', fontSize: 20, fontWeight: 900, marginBottom: 8 }}>{cur.title}</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.5 }}>{cur.body}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? '#16a34a' : '#334155',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button
            onClick={skip}
            style={{
              background: 'transparent', border: '1px solid #334155',
              color: '#94a3b8', fontSize: 13, fontWeight: 800,
              padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
            }}
          >
            Skip
          </button>
          <button
            onClick={next}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg,#16a34a,#15803d)',
              color: 'white', border: 'none', fontSize: 14, fontWeight: 900,
              padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
            }}
          >
            {step === STEPS.length - 1 ? "Let's Farm! 🌾" : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
}
