'use client';

import React from 'react';

export function CheckersIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes checkerJump {
          0%, 100% { transform: translate(0, 0); }
          40% { transform: translate(20px, -24px); }
          60% { transform: translate(20px, -24px); }
          80% { transform: translate(20px, 0); }
        }
        .checker-jump { animation: checkerJump 2.5s ease-in-out infinite; }
      `}</style>
      {/* Board squares */}
      <rect x="10" y="30" width="15" height="15" fill="#8b5a2b" rx="2" />
      <rect x="25" y="30" width="15" height="15" fill="#e8cba0" rx="2" />
      <rect x="40" y="30" width="15" height="15" fill="#8b5a2b" rx="2" />
      <rect x="55" y="30" width="15" height="15" fill="#e8cba0" rx="2" />
      <rect x="10" y="45" width="15" height="15" fill="#e8cba0" rx="2" />
      <rect x="25" y="45" width="15" height="15" fill="#8b5a2b" rx="2" />
      <rect x="40" y="45" width="15" height="15" fill="#e8cba0" rx="2" />
      <rect x="55" y="45" width="15" height="15" fill="#8b5a2b" rx="2" />
      {/* Static black piece */}
      <circle cx="47.5" cy="52.5" r="6" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
      {/* Jumping red piece */}
      <g className="checker-jump">
        <circle cx="17.5" cy="52.5" r="6" fill="#dc2626" stroke="#ef4444" strokeWidth="1" />
        <circle cx="17.5" cy="52.5" r="3" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.5" />
      </g>
    </svg>
  );
}

export function ChessIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes knightSlide {
          0%, 100% { transform: translateX(0); opacity: 1; }
          45% { transform: translateX(16px); opacity: 1; }
          50% { transform: translateX(16px); opacity: 0.7; }
          55% { transform: translateX(16px); opacity: 1; }
          100% { transform: translateX(0); }
        }
        @keyframes pawnFade {
          0%, 40% { opacity: 1; }
          50% { opacity: 0.2; }
          60%, 100% { opacity: 0; }
        }
        .knight-slide { animation: knightSlide 3s ease-in-out infinite; }
        .pawn-fade { animation: pawnFade 3s ease-in-out infinite; }
      `}</style>
      {/* Board */}
      <rect x="15" y="30" width="12" height="12" fill="#e8cba0" rx="1" />
      <rect x="27" y="30" width="12" height="12" fill="#8b5a2b" rx="1" />
      <rect x="39" y="30" width="12" height="12" fill="#e8cba0" rx="1" />
      <rect x="51" y="30" width="12" height="12" fill="#8b5a2b" rx="1" />
      <rect x="15" y="42" width="12" height="12" fill="#8b5a2b" rx="1" />
      <rect x="27" y="42" width="12" height="12" fill="#e8cba0" rx="1" />
      <rect x="39" y="42" width="12" height="12" fill="#8b5a2b" rx="1" />
      <rect x="51" y="42" width="12" height="12" fill="#e8cba0" rx="1" />
      {/* Pawn being captured */}
      <g className="pawn-fade">
        <text x="45" y="52" fontSize="14" textAnchor="middle" fill="#1a1a1a">&#9823;</text>
      </g>
      {/* Knight moving */}
      <g className="knight-slide">
        <text x="21" y="52" fontSize="16" textAnchor="middle" fill="#f5f5f5" stroke="#333" strokeWidth="0.3">&#9816;</text>
      </g>
    </svg>
  );
}

export function Connect4Icon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes discDrop {
          0% { transform: translateY(-30px); opacity: 0; }
          15% { opacity: 1; }
          70% { transform: translateY(0px); }
          80% { transform: translateY(-4px); }
          90% { transform: translateY(0px); }
          100% { transform: translateY(0px); opacity: 1; }
        }
        .disc-drop-1 { animation: discDrop 2s ease-in infinite; }
        .disc-drop-2 { animation: discDrop 2s ease-in 0.7s infinite; }
        .disc-drop-3 { animation: discDrop 2s ease-in 1.4s infinite; }
      `}</style>
      {/* Board frame */}
      <rect x="10" y="25" width="60" height="40" rx="4" fill="#1e40af" />
      {/* Holes */}
      <circle cx="22" cy="37" r="5" fill="#0f172a" />
      <circle cx="35" cy="37" r="5" fill="#0f172a" />
      <circle cx="48" cy="37" r="5" fill="#0f172a" />
      <circle cx="61" cy="37" r="5" fill="#0f172a" />
      <circle cx="22" cy="52" r="5" fill="#0f172a" />
      <circle cx="35" cy="52" r="5" fill="#0f172a" />
      <circle cx="48" cy="52" r="5" fill="#0f172a" />
      <circle cx="61" cy="52" r="5" fill="#0f172a" />
      {/* Static pieces */}
      <circle cx="22" cy="52" r="5" fill="#dc2626" />
      <circle cx="35" cy="52" r="5" fill="#eab308" />
      <circle cx="48" cy="52" r="5" fill="#dc2626" />
      {/* Dropping pieces */}
      <g className="disc-drop-1">
        <circle cx="35" cy="37" r="5" fill="#dc2626" />
      </g>
      <g className="disc-drop-2">
        <circle cx="61" cy="52" r="5" fill="#eab308" />
      </g>
      <g className="disc-drop-3">
        <circle cx="61" cy="37" r="5" fill="#dc2626" />
      </g>
    </svg>
  );
}

export function ReversiIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes flipDisc {
          0%, 40% { transform: scaleX(1); fill: #1a1a1a; }
          50% { transform: scaleX(0); }
          60%, 100% { transform: scaleX(1); fill: #f5f5f5; }
        }
        .flip-disc { animation: flipDisc 2.5s ease-in-out infinite; transform-origin: center; }
      `}</style>
      {/* Board */}
      <rect x="12" y="18" width="56" height="48" rx="4" fill="#166534" />
      {/* Grid lines */}
      <line x1="26" y1="18" x2="26" y2="66" stroke="#15803d" strokeWidth="0.5" />
      <line x1="40" y1="18" x2="40" y2="66" stroke="#15803d" strokeWidth="0.5" />
      <line x1="54" y1="18" x2="54" y2="66" stroke="#15803d" strokeWidth="0.5" />
      <line x1="12" y1="34" x2="68" y2="34" stroke="#15803d" strokeWidth="0.5" />
      <line x1="12" y1="50" x2="68" y2="50" stroke="#15803d" strokeWidth="0.5" />
      {/* Static pieces */}
      <circle cx="33" cy="42" r="5" fill="#f5f5f5" />
      <circle cx="47" cy="26" r="5" fill="#f5f5f5" />
      <circle cx="47" cy="42" r="5" fill="#1a1a1a" />
      <circle cx="33" cy="58" r="5" fill="#1a1a1a" />
      <circle cx="19" cy="42" r="5" fill="#1a1a1a" />
      {/* Flipping piece */}
      <circle cx="33" cy="26" r="5" className="flip-disc" fill="#1a1a1a" />
      {/* New piece appearing */}
      <circle cx="61" cy="42" r="5" fill="#f5f5f5" opacity="0.8" />
    </svg>
  );
}

export function TicTacToeIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes drawX {
          0%, 60% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes drawO {
          0%, 30% { stroke-dashoffset: 32; }
          70% { stroke-dashoffset: 0; }
        }
        .draw-x line { stroke-dasharray: 20; animation: drawX 2.5s ease-out infinite; }
        .draw-o circle { stroke-dasharray: 32; animation: drawO 2.5s ease-out infinite; }
      `}</style>
      {/* Grid */}
      <line x1="33" y1="20" x2="33" y2="64" stroke="#8b5a2b" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="20" x2="50" y2="64" stroke="#8b5a2b" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="35" x2="66" y2="35" stroke="#8b5a2b" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="50" x2="66" y2="50" stroke="#8b5a2b" strokeWidth="2" strokeLinecap="round" />
      {/* Static X */}
      <g>
        <line x1="20" y1="24" x2="29" y2="32" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="29" y1="24" x2="20" y2="32" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* Static O */}
      <circle cx="41.5" cy="27.5" r="5" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      {/* Static X */}
      <g>
        <line x1="37" y1="39" x2="46" y2="47" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="46" y1="39" x2="37" y2="47" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* Animated O drawing */}
      <g className="draw-o">
        <circle cx="24.5" cy="57" r="5" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      </g>
      {/* Animated X drawing */}
      <g className="draw-x">
        <line x1="53" y1="24" x2="63" y2="32" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="63" y1="24" x2="53" y2="32" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function GomokuIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes stoneDrop {
          0%, 70% { transform: scale(0); opacity: 0; }
          85% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .stone-drop { animation: stoneDrop 3s ease-out infinite; transform-origin: center; }
        @keyframes stoneDropDelay {
          0%, 85% { transform: scale(0); opacity: 0; }
          95% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .stone-drop-2 { animation: stoneDropDelay 3s ease-out infinite; transform-origin: center; }
      `}</style>
      {/* Board */}
      <rect x="10" y="16" width="60" height="52" rx="3" fill="#dcb76a" />
      {/* Grid lines */}
      {[24, 32, 40, 48, 56].map(y => (
        <line key={`h${y}`} x1="16" y1={y} x2="64" y2={y} stroke="#b8943f" strokeWidth="0.7" />
      ))}
      {[20, 28, 36, 44, 52, 60].map(x => (
        <line key={`v${x}`} x1={x} y1="20" x2={x} y2="60" stroke="#b8943f" strokeWidth="0.7" />
      ))}
      {/* Star point */}
      <circle cx="40" cy="40" r="1.5" fill="#b8943f" />
      {/* Existing stones */}
      <circle cx="36" cy="40" r="4.5" fill="#1a1a1a" />
      <circle cx="44" cy="40" r="4.5" fill="#1a1a1a" />
      <circle cx="28" cy="40" r="4.5" fill="#1a1a1a" />
      <circle cx="40" cy="32" r="4.5" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      <circle cx="36" cy="48" r="4.5" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      <circle cx="44" cy="32" r="4.5" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      {/* Animated stone placement */}
      <g className="stone-drop">
        <circle cx="52" cy="40" r="4.5" fill="#1a1a1a" />
      </g>
      <g className="stone-drop-2">
        <circle cx="36" cy="32" r="4.5" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

export function MancalaIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes seedMove {
          0%, 20% { transform: translate(0, 0); opacity: 1; }
          40% { transform: translate(0, -15px); opacity: 0.8; }
          60% { transform: translate(14px, -8px); opacity: 0.8; }
          80%, 100% { transform: translate(14px, 0); opacity: 1; }
        }
        .seed-move { animation: seedMove 2s ease-in-out infinite; }
      `}</style>
      {/* Board */}
      <rect x="5" y="22" width="70" height="40" rx="20" fill="#8b5a2b" stroke="#6b4226" strokeWidth="1.5" />
      {/* Stores */}
      <ellipse cx="12" cy="42" rx="5" ry="14" fill="#5a3520" />
      <ellipse cx="68" cy="42" rx="5" ry="14" fill="#5a3520" />
      {/* Top pits */}
      <circle cx="24" cy="32" r="5" fill="#5a3520" />
      <circle cx="36" cy="32" r="5" fill="#5a3520" />
      <circle cx="48" cy="32" r="5" fill="#5a3520" />
      <circle cx="60" cy="32" r="5" fill="#5a3520" />
      {/* Bottom pits */}
      <circle cx="24" cy="52" r="5" fill="#5a3520" />
      <circle cx="36" cy="52" r="5" fill="#5a3520" />
      <circle cx="48" cy="52" r="5" fill="#5a3520" />
      <circle cx="60" cy="52" r="5" fill="#5a3520" />
      {/* Seeds in pits */}
      <circle cx="23" cy="51" r="1.5" fill="#d4a86a" />
      <circle cx="25" cy="53" r="1.5" fill="#d4a86a" />
      <circle cx="24" cy="50" r="1.5" fill="#c48d42" />
      <circle cx="37" cy="52" r="1.5" fill="#d4a86a" />
      <circle cx="35" cy="51" r="1.5" fill="#c48d42" />
      <circle cx="49" cy="53" r="1.5" fill="#d4a86a" />
      <circle cx="47" cy="51" r="1.5" fill="#c48d42" />
      <circle cx="48" cy="54" r="1.5" fill="#d4a86a" />
      {/* Animated seed */}
      <g className="seed-move">
        <circle cx="36" cy="52" r="1.8" fill="#eab308" />
      </g>
    </svg>
  );
}

export function DotsBoxesIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes drawLine {
          0%, 30% { stroke-dashoffset: 16; }
          70%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes boxFill {
          0%, 70% { opacity: 0; }
          85%, 100% { opacity: 0.3; }
        }
        .draw-line { stroke-dasharray: 16; animation: drawLine 2.5s ease-out infinite; }
        .box-fill { animation: boxFill 2.5s ease-out infinite; }
      `}</style>
      {/* Dots grid 4x4 */}
      {[22, 38, 54, 70].map(x =>
        [22, 38, 54].map(y => (
          <circle key={`${x}-${y}`} cx={x - 4} cy={y - 2} r="2.5" fill="#d4a86a" />
        ))
      )}
      {/* Existing lines */}
      <line x1="18" y1="20" x2="34" y2="20" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="20" x2="18" y2="36" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="36" x2="34" y2="36" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="20" x2="34" y2="36" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      {/* Completed box */}
      <rect x="18" y="20" width="16" height="16" fill="#3b82f6" opacity="0.2" rx="1" />
      {/* More lines */}
      <line x1="34" y1="20" x2="50" y2="20" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="36" x2="50" y2="36" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="36" x2="18" y2="52" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      {/* Animated line being drawn */}
      <line x1="50" y1="20" x2="50" y2="36" className="draw-line" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      {/* Box filling in */}
      <rect x="34" y="20" width="16" height="16" className="box-fill" fill="#ef4444" rx="1" />
    </svg>
  );
}

export function NavalBattleIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes wave {
          0%, 100% { d: path("M 5 55 Q 15 50, 25 55 Q 35 60, 45 55 Q 55 50, 65 55 Q 75 60, 80 55"); }
          50% { d: path("M 5 55 Q 15 60, 25 55 Q 35 50, 45 55 Q 55 60, 65 55 Q 75 50, 80 55"); }
        }
        @keyframes splash {
          0%, 60% { transform: translateY(0) scale(0); opacity: 0; }
          70% { transform: translateY(-6px) scale(1); opacity: 1; }
          100% { transform: translateY(-14px) scale(0.3); opacity: 0; }
        }
        @keyframes crosshairPulse {
          0%, 100% { opacity: 0.4; r: 6; }
          50% { opacity: 0.9; r: 7; }
        }
        .wave1 { animation: wave 3s ease-in-out infinite; }
        .wave2 { animation: wave 3s ease-in-out 0.5s infinite; }
        .splash { animation: splash 2.5s ease-out infinite; transform-origin: center bottom; }
        .crosshair-pulse circle { animation: crosshairPulse 1.5s ease-in-out infinite; }
      `}</style>
      {/* Sky */}
      <rect x="0" y="0" width="80" height="55" fill="#0f172a" />
      {/* Water */}
      <rect x="0" y="50" width="80" height="30" fill="#1e3a5f" />
      {/* Waves */}
      <path d="M 5 55 Q 15 50, 25 55 Q 35 60, 45 55 Q 55 50, 65 55 Q 75 60, 80 55 L 80 80 L 0 80 Z" fill="#1e40af" opacity="0.5" className="wave1" />
      <path d="M 0 58 Q 10 63, 20 58 Q 30 53, 40 58 Q 50 63, 60 58 Q 70 53, 80 58 L 80 80 L 0 80 Z" fill="#1e3a8a" opacity="0.4" className="wave2" />
      {/* Ship hull */}
      <polygon points="18,50 62,50 56,58 24,58" fill="#6b7280" />
      <rect x="28" y="42" width="24" height="8" fill="#9ca3af" rx="1" />
      {/* Ship details */}
      <rect x="38" y="34" width="3" height="8" fill="#d1d5db" />
      <rect x="32" y="38" width="4" height="4" fill="#4b5563" rx="1" />
      <rect x="44" y="38" width="4" height="4" fill="#4b5563" rx="1" />
      {/* Crosshair targeting */}
      <g className="crosshair-pulse">
        <circle cx="40" cy="48" r="6" fill="none" stroke="#ef4444" strokeWidth="1" />
      </g>
      <line x1="40" y1="42" x2="40" y2="54" stroke="#ef4444" strokeWidth="0.5" opacity="0.6" />
      <line x1="34" y1="48" x2="46" y2="48" stroke="#ef4444" strokeWidth="0.5" opacity="0.6" />
      {/* Splash */}
      <g className="splash">
        <circle cx="58" cy="52" r="2" fill="#93c5fd" opacity="0.8" />
        <circle cx="56" cy="52" r="1" fill="#bfdbfe" />
        <circle cx="60" cy="53" r="1" fill="#bfdbfe" />
      </g>
    </svg>
  );
}

export function GoIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes goStoneDrop {
          0%, 70% { transform: scale(0); opacity: 0; }
          85% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .go-stone-drop { animation: goStoneDrop 3s ease-out infinite; transform-origin: center; }
      `}</style>
      {/* Board */}
      <rect x="10" y="16" width="60" height="52" rx="3" fill="#dcb76a" />
      {/* Grid lines */}
      {[24, 32, 40, 48, 56].map(y => (
        <line key={`h${y}`} x1="16" y1={y} x2="64" y2={y} stroke="#b8943f" strokeWidth="0.7" />
      ))}
      {[20, 28, 36, 44, 52, 60].map(x => (
        <line key={`v${x}`} x1={x} y1="20" x2={x} y2="60" stroke="#b8943f" strokeWidth="0.7" />
      ))}
      {/* Star points */}
      <circle cx="28" cy="32" r="1.5" fill="#b8943f" />
      <circle cx="52" cy="32" r="1.5" fill="#b8943f" />
      <circle cx="40" cy="40" r="1.5" fill="#b8943f" />
      <circle cx="28" cy="48" r="1.5" fill="#b8943f" />
      <circle cx="52" cy="48" r="1.5" fill="#b8943f" />
      {/* Black stones */}
      <circle cx="36" cy="32" r="4.5" fill="#1a1a1a" />
      <circle cx="28" cy="40" r="4.5" fill="#1a1a1a" />
      <circle cx="36" cy="40" r="4.5" fill="#1a1a1a" />
      <circle cx="44" cy="48" r="4.5" fill="#1a1a1a" />
      {/* White stones */}
      <circle cx="44" cy="32" r="4.5" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      <circle cx="44" cy="40" r="4.5" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      <circle cx="52" cy="40" r="4.5" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      <circle cx="36" cy="48" r="4.5" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      {/* Animated stone placement */}
      <g className="go-stone-drop">
        <circle cx="28" cy="48" r="4.5" fill="#1a1a1a" />
      </g>
    </svg>
  );
}

export function BackgammonIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <style>{`
        @keyframes diceRoll {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(12deg); }
          75% { transform: rotate(-12deg); }
        }
        @keyframes checkerSlide {
          0%, 30% { transform: translateX(0); }
          70%, 100% { transform: translateX(12px); }
        }
        .dice-roll { animation: diceRoll 1.5s ease-in-out infinite; transform-origin: center; }
        .checker-slide { animation: checkerSlide 2.5s ease-in-out infinite; }
      `}</style>
      {/* Board */}
      <rect x="8" y="16" width="64" height="52" rx="3" fill="#2d1a0e" stroke="#6b4226" strokeWidth="1" />
      {/* Bar */}
      <rect x="37" y="16" width="6" height="52" fill="#4a2d1a" />
      {/* Triangles - left side */}
      <polygon points="12,16 16,38 20,16" fill="#8b5a2b" />
      <polygon points="20,16 24,38 28,16" fill="#e8cba0" />
      <polygon points="28,16 32,38 36,16" fill="#8b5a2b" />
      <polygon points="12,68 16,46 20,68" fill="#e8cba0" />
      <polygon points="20,68 24,46 28,68" fill="#8b5a2b" />
      <polygon points="28,68 32,46 36,68" fill="#e8cba0" />
      {/* Triangles - right side */}
      <polygon points="44,16 48,38 52,16" fill="#e8cba0" />
      <polygon points="52,16 56,38 60,16" fill="#8b5a2b" />
      <polygon points="60,16 64,38 68,16" fill="#e8cba0" />
      <polygon points="44,68 48,46 52,68" fill="#8b5a2b" />
      <polygon points="52,68 56,46 60,68" fill="#e8cba0" />
      <polygon points="60,68 64,46 68,68" fill="#8b5a2b" />
      {/* Checkers */}
      <circle cx="16" cy="22" r="4" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
      <circle cx="16" cy="28" r="4" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
      <circle cx="48" cy="62" r="4" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      <circle cx="48" cy="56" r="4" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      <circle cx="56" cy="62" r="4" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
      {/* Moving checker */}
      <g className="checker-slide">
        <circle cx="24" cy="62" r="4" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.5" />
      </g>
      {/* Dice */}
      <g className="dice-roll">
        <rect x="38" y="38" width="10" height="10" rx="2" fill="#f5f5f5" stroke="#ccc" strokeWidth="0.5" />
        <circle cx="41" cy="41" r="1" fill="#1a1a1a" />
        <circle cx="45" cy="41" r="1" fill="#1a1a1a" />
        <circle cx="41" cy="45" r="1" fill="#1a1a1a" />
        <circle cx="45" cy="45" r="1" fill="#1a1a1a" />
        <circle cx="43" cy="43" r="1" fill="#1a1a1a" />
      </g>
    </svg>
  );
}

export function CribbageIcon() {
  // S-groove path for the icon (miniature version)
  const groove = 'M 14,30 L 62,30 A 7,7 0 0,1 62,44 L 14,44 A 7,7 0 0,0 14,58 L 62,58';
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
      <defs>
        <linearGradient id="cibW" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a06c" />
          <stop offset="50%" stopColor="#ba8d52" />
          <stop offset="100%" stopColor="#a07840" />
        </linearGradient>
        <radialGradient id="cibH">
          <stop offset="0%" stopColor="#2e1608" />
          <stop offset="100%" stopColor="#6b4a2a" />
        </radialGradient>
        <radialGradient id="cibB" cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </radialGradient>
        <radialGradient id="cibR" cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
      </defs>
      <style>{`
        @keyframes cibPeg1 {
          0%, 40% { transform: translateX(0); }
          60%, 100% { transform: translateX(5px); }
        }
        @keyframes cibPeg2 {
          0%, 50% { transform: translateX(0); }
          70%, 100% { transform: translateX(5px); }
        }
        .cib-peg1 { animation: cibPeg1 2.5s ease-in-out infinite; }
        .cib-peg2 { animation: cibPeg2 2.5s ease-in-out infinite; }
      `}</style>

      {/* Board body */}
      <rect x="4" y="16" width="72" height="52" rx="16" ry="16"
        fill="url(#cibW)" stroke="#8a6030" strokeWidth="1.5" />
      <rect x="7" y="19" width="66" height="46" rx="13" ry="13"
        fill="none" stroke="#d4a86a" strokeWidth="0.3" opacity="0.4" />

      {/* Wood grain */}
      <line x1="12" y1="28" x2="68" y2="28.3" stroke="#8a6535" strokeWidth="0.3" opacity="0.15" />
      <line x1="12" y1="44" x2="68" y2="43.7" stroke="#8a6535" strokeWidth="0.3" opacity="0.15" />
      <line x1="12" y1="56" x2="68" y2="56.3" stroke="#8a6535" strokeWidth="0.25" opacity="0.12" />

      {/* S-shaped groove */}
      <path d={groove} fill="none" stroke="#4a3018" strokeWidth="10"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d={groove} fill="none" stroke="#6b4a28" strokeWidth="8"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      <path d={groove} fill="none" stroke="#8a6838" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />

      {/* Holes along each street — top row */}
      {[18, 23, 28, 33, 38, 43, 48, 53, 58].map(x => (
        <g key={`t-${x}`}>
          <circle cx={x} cy={28.5} r="1.2" fill="url(#cibH)" />
          <circle cx={x} cy={31.5} r="1.2" fill="url(#cibH)" />
        </g>
      ))}
      {/* Middle row (right to left) */}
      {[18, 23, 28, 33, 38, 43, 48, 53, 58].map(x => (
        <g key={`m-${x}`}>
          <circle cx={x} cy={42.5} r="1.2" fill="url(#cibH)" />
          <circle cx={x} cy={45.5} r="1.2" fill="url(#cibH)" />
        </g>
      ))}
      {/* Bottom row */}
      {[18, 23, 28, 33, 38, 43, 48, 53, 58].map(x => (
        <g key={`b-${x}`}>
          <circle cx={x} cy={56.5} r="1.2" fill="url(#cibH)" />
          <circle cx={x} cy={59.5} r="1.2" fill="url(#cibH)" />
        </g>
      ))}

      {/* Blue peg on top street */}
      <g className="cib-peg1">
        <circle cx={33} cy={28.5} r="2" fill="url(#cibB)" stroke="#1e3a8a" strokeWidth="0.4" />
        <ellipse cx={32.3} cy={27.8} rx="0.8" ry="0.5" fill="white" opacity="0.45" />
      </g>
      {/* Red peg on top street */}
      <g className="cib-peg2">
        <circle cx={28} cy={31.5} r="2" fill="url(#cibR)" stroke="#7f1d1d" strokeWidth="0.4" />
        <ellipse cx={27.3} cy={30.8} rx="0.8" ry="0.5" fill="white" opacity="0.4" />
      </g>

      {/* Cards peeking from behind */}
      <g transform="translate(56, 60) rotate(12)">
        <rect x="0" y="0" width="11" height="15" rx="1.5" fill="#fefdfb" stroke="#ccc" strokeWidth="0.3" />
        <text x="2" y="6" fontSize="4.5" fill="#dc2626" fontWeight="bold">5</text>
        <text x="2" y="11" fontSize="4.5" fill="#dc2626">{'\u2665'}</text>
      </g>
      <g transform="translate(5, 60) rotate(-10)">
        <rect x="0" y="0" width="11" height="15" rx="1.5" fill="#fefdfb" stroke="#ccc" strokeWidth="0.3" />
        <text x="2" y="6" fontSize="4.5" fill="#1a1a1a" fontWeight="bold">J</text>
        <text x="2" y="11" fontSize="4.5" fill="#1a1a1a">{'\u2660'}</text>
      </g>
    </svg>
  );
}

const GAME_ICONS: Record<string, () => React.ReactElement> = {
  checkers: CheckersIcon,
  chess: ChessIcon,
  connect4: Connect4Icon,
  reversi: ReversiIcon,
  tictactoe: TicTacToeIcon,
  gomoku: GomokuIcon,
  mancala: MancalaIcon,
  dotsboxes: DotsBoxesIcon,
  navalbattle: NavalBattleIcon,
  go: GoIcon,
  backgammon: BackgammonIcon,
  cribbage: CribbageIcon,
};

export function GameIcon({ gameId }: { gameId: string }) {
  const Icon = GAME_ICONS[gameId];
  if (!Icon) return null;
  return <Icon />;
}
