import React, { useState, useEffect, useRef } from 'react';

const BirthdayCandleApp = () => {
    // State variables for controlling behavior
    const [blown, setBlown] = useState(false); // Tracks if the candle is blown out
    const [showMessage, setShowMessage] = useState(false); // Controls final birthday message display
    const [currentImage, setCurrentImage] = useState(0); // Tracks which image is showing in slideshow
    const [micError, setMicError] = useState(false); // Handles mic permission or access issues

    // Array of slideshow image paths (respect Vite base path)
    const base = import.meta.env.BASE_URL || '/';
    const IMAGES = [
        `${base}images/image1.jpg`, `${base}images/image2.jpg`, `${base}images/image3.jpg`, `${base}images/image4.jpg`, `${base}images/image5.jpg`,
        `${base}images/image6.jpg`, `${base}images/image7.jpg`, `${base}images/image8.jpg`, `${base}images/image9.jpg`, `${base}images/image10.jpg`
    ];

    // Matching quotes for each image (10 total)
    const QUOTES = [
        "Another year older, wiser, and even more amazing.💖",
        "Your smile is my favorite view in every season.💕",
        "May your dreams be as bright as your beautiful heart.💖",
        "Small moments with you are my biggest treasures.💕",
        "You deserve all the love the world can hold.💖",
        "Here’s to laughter, love, and endless adventures together.💕",
        "You light up my world more than any candle ever could.💖",
        "Every day with you is a gift I’m grateful for.💕",
        "Keep shining, keep smiling today and always.💖",
        "Happy Birthday, my love this story is our favorite chapter.💕"
    ];

    // Refs for audio analysis and cleanup
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const rafRef = useRef(null);
    const audioContextRef = useRef(null);
    const streamRef = useRef(null);

    // Audio for birthday melody during slideshow
    const slideCtxRef = useRef(null);
    const slideNodesRef = useRef(null);

    // --- Microphone setup & blow detection logic ---
    useEffect(() => {
        if (!blown) {
            // Request microphone access
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    // Store stream & initialize Web Audio API context
                    streamRef.current = stream;
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioContextRef.current.createMediaStreamSource(stream);

                    // Create analyser to get audio data from the mic
                    const analyser = audioContextRef.current.createAnalyser();
                    analyser.fftSize = 1024; // Resolution of the audio data
                    analyserRef.current = analyser;

                    const bufferLength = analyser.fftSize;
                    const dataArray = new Uint8Array(bufferLength);
                    dataArrayRef.current = dataArray;
                    source.connect(analyser);

                    // Function to continuously monitor mic input
                    const THRESHOLD = 0.08;
                    const REQUIRED_FRAMES = 4;
                    let consecutiveAbove = 0;
                    const detectBlow = () => {
                        analyser.getByteTimeDomainData(dataArray);

                        // Calculate RMS (Root Mean Square) volume to detect a strong breath
                        let rms = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            const normalized = (dataArray[i] - 128) / 128;
                            rms += normalized * normalized;
                        }
                        rms = Math.sqrt(rms / bufferLength);

                        // Debounce: require consecutive frames above threshold
                        if (rms > THRESHOLD) {
                            consecutiveAbove++;
                            if (consecutiveAbove >= REQUIRED_FRAMES) {
                                setBlown(true);
                                stopMic(); // stop listening
                                return;
                            }
                        } else {
                            consecutiveAbove = 0;
                        }

                        // Continue checking mic input
                        rafRef.current = requestAnimationFrame(detectBlow);
                    };

                    detectBlow(); // Start listening
                })
                .catch(err => {
                    // Handle permission denial or mic not supported
                    console.error('Microphone access denied or not available:', err);
                    setMicError(true);
                });
        }

        // Cleanup function to stop mic when component unmounts or blow detected
        return () => stopMic();
    }, [blown]);

    // --- Stop and cleanup microphone resources ---
    const stopMic = () => {
        cancelAnimationFrame(rafRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    // Unlock Web Audio on first user gesture (iOS/Chrome autoplay policies)
    useEffect(() => {
        const handler = () => {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            // If there is no context yet, create it here so it's born from a user gesture
            if (!slideCtxRef.current) {
                slideCtxRef.current = new AudioCtx();
            }
            // Resume if suspended
            if (slideCtxRef.current.state === 'suspended') {
                slideCtxRef.current.resume().catch(() => {});
            }
            // Play a 1-frame silent buffer to fully unlock audio on iOS
            try {
                const buf = slideCtxRef.current.createBuffer(1, 1, 22050);
                const src = slideCtxRef.current.createBufferSource();
                src.buffer = buf;
                src.connect(slideCtxRef.current.destination);
                src.start(0);
            } catch {}
        };

        window.addEventListener('pointerdown', handler, { once: true });
        return () => window.removeEventListener('pointerdown', handler);
    }, []);


    // --- Sound: birthday melody during slideshow ---
    const startBirthdayMelody = async () => {
        // if (slideCtxRef.current) return; // already running
        // const AudioCtx = window.AudioContext || window.webkitAudioContext;
        // const ctx = new AudioCtx();
        // slideCtxRef.current = ctx;
        //
        // const masterGain = ctx.createGain();
        // masterGain.gain.value = 0.06; // soft but audible
        // masterGain.connect(ctx.destination);

        if (slideNodesRef.current?.timeoutId) return;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = slideCtxRef.current || new AudioCtx(); // reuse unlocked context if present
        slideCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.06;
        masterGain.connect(ctx.destination);


        // Frequencies for notes
        const N = {
          'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
          'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99
        };

        // Happy Birthday melody in C
        const bpm = 108;
        const beat = 60 / bpm; // seconds per beat
        const seq = [
          { n: 'G4', b: 1 }, { n: 'G4', b: 1 }, { n: 'A4', b: 2 }, { n: 'G4', b: 2 }, { n: 'C5', b: 2 }, { n: 'B4', b: 4 },
          { n: 'G4', b: 1 }, { n: 'G4', b: 1 }, { n: 'A4', b: 2 }, { n: 'G4', b: 2 }, { n: 'D5', b: 2 }, { n: 'C5', b: 4 },
          { n: 'G4', b: 1 }, { n: 'G4', b: 1 }, { n: 'G5', b: 2 }, { n: 'E5', b: 2 }, { n: 'C5', b: 2 }, { n: 'B4', b: 2 }, { n: 'A4', b: 3 },
          { n: 'F5', b: 1 }, { n: 'F5', b: 1 }, { n: 'E5', b: 2 }, { n: 'C5', b: 2 }, { n: 'D5', b: 2 }, { n: 'C5', b: 4 },
        ];

        let idx = 0;
        let timeoutId = null;

        try { if (ctx.state === 'suspended') await ctx.resume(); } catch {}

        const playNext = () => {
          const note = seq[idx];
          const freq = N[note.n] || 0;
          const now = ctx.currentTime;
          const dur = Math.max(0.18, note.b * beat);

          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;

          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.16, now + 0.025);
          g.gain.linearRampToValueAtTime(0.12, now + Math.min(0.12, dur * 0.35));
          g.gain.linearRampToValueAtTime(0.0, now + Math.max(0.05, dur - 0.04));

          osc.connect(g).connect(masterGain);

          try { if (ctx.state === 'suspended') ctx.resume(); } catch {}

          osc.start(now);
          osc.stop(now + dur);

          idx = (idx + 1) % seq.length;
          timeoutId = setTimeout(playNext, dur * 1000);
          slideNodesRef.current = { masterGain, timeoutId };
        };

        playNext();
    };

    const stopBirthdayMelody = async () => {
        const ctx = slideCtxRef.current;
        const nodes = slideNodesRef.current;
        try { if (nodes?.timeoutId) clearTimeout(nodes.timeoutId); } catch {}
        slideNodesRef.current = null;
        if (ctx) { try { await ctx.close(); } catch {} }
        slideCtxRef.current = null;
    };

    // Start/stop slideshow music based on state
    useEffect(() => {
        if (blown && !showMessage) {
            startBirthdayMelody();
        } else {
            stopBirthdayMelody();
        }
        return () => { stopBirthdayMelody(); };
    }, [blown, showMessage]);

    // --- Slideshow logic ---
    useEffect(() => {
        if (blown && currentImage < IMAGES.length) {
            // Show next image every 2 seconds
            const timer = setTimeout(() => setCurrentImage(i => i + 1), 2000);
            return () => clearTimeout(timer);
        } else if (currentImage >= IMAGES.length) {
            // When slideshow completes, show final birthday message
            setShowMessage(true);
        }
    }, [blown, currentImage]);

    return (
        <div className="relative w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
            {/* Candle visible until blown */}
            {!blown ? (
                <div className="flex flex-col items-center justify-center h-full">
                    {/* Candle body */}
                    <div className="relative h-[320px] w-[70px] bg-gradient-to-b from-yellow-50 via-yellow-200 to-yellow-700 rounded-2xl shadow-[0_0_40px_rgba(255,180,50,0.8)]">
                        {/* Flame positioned above candle */}
                        <div className="absolute top-[-140px] left-1/2 -translate-x-1/2">
                            <div className="relative w-[60px] h-[120px]">
                                {/* Flame gradient for realistic effect */}
                                <div className="flame absolute w-full h-full rounded-full bg-gradient-to-t from-orange-600 via-yellow-300 to-white animate-flicker"></div>
                                {/* Wick */}
                                <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 w-[10px] h-[25px] bg-gray-900 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                    {/* Mic permission or blow prompt */}
                    {micError ? (
                        <p className="text-red-400 text-sm mt-10">Microphone blocked. Please allow mic access and refresh.</p>
                    ) : (
                        <p className="text-gray-400 text-lg mt-10 animate-pulse">Close your eyes, make a wish, and Blow! 🎂</p>
                    )}
                </div>
            ) : !showMessage ? (
                // Slideshow display after blowing candle
                <div className="absolute inset-0">
                    <img src={IMAGES[currentImage]} alt="slideshow" className="object-cover w-full h-full animate-fade" />
                    {/* Glass quote overlay - mobile friendly */}
                    <div className="pointer-events-none absolute inset-x-2 sm:inset-x-auto bottom-3 sm:bottom-6 left-auto sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-[92%] max-w-none sm:max-w-3xl">
                        <div className="bg-black/35 sm:bg-white/12 backdrop-blur-md border border-white/20 sm:border-white/25 shadow-[0_10px_30px_rgba(0,0,0,0.45)] rounded-lg sm:rounded-xl px-3 sm:px-6 py-2.5 sm:py-4">
                            <p className="text-center text-[13px] leading-tight sm:text-base sm:leading-snug md:text-lg text-white/95">
                                {QUOTES[currentImage]}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                // Final birthday message popup
                <div className="absolute inset-0 overflow-hidden">
                  {/* Background image with subtle zoom */}
                  <div
                    className="absolute inset-0 bg-cover bg-center will-change-transform "
                    style={{ backgroundImage: `url('${base}images/imagebg.jpg')` }}
                  />
                  {/* Colorful soft glows */}
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(255,182,193,0.35),transparent_60%),radial-gradient(circle_at_80%_30%,rgba(147,197,253,0.25),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(255,221,110,0.25),transparent_50%)]" />
                  {/* Dark overlay for readability */}
                  <div className="absolute inset-0 bg-black/60" />

                  {/* Confetti */}
                  <div className="pointer-events-none absolute inset-0 z-20">
                    {Array.from({ length: 36 }).map((_, i) => {
                      const left = Math.random() * 100;
                      const delay = Math.random() * 1.5;
                      const duration = 3.5 + Math.random() * 2;
                      const hue = Math.floor(Math.random() * 360);
                      const rotate = Math.floor(Math.random() * 360);
                      return (
                        <span
                          key={i}
                          className="confetti"
                          style={{
                            left: `${left}%`,
                            animationDelay: `${delay}s`,
                            ['--dur']: `${duration}s`,
                            ['--h']: hue,
                            ['--r']: `${rotate}deg`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Floating hearts */}
                  <div className="pointer-events-none absolute inset-0 z-20">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const left = Math.random() * 100;
                      const delay = Math.random() * 2;
                      const duration = 5 + Math.random() * 3;
                      const size = 18 + Math.random() * 16;
                      return (
                        <span
                          key={i}
                          className="heart"
                          style={{
                            left: `${left}%`,
                            animationDelay: `${delay}s`,
                            ['--dur']: `${duration}s`,
                            fontSize: `${size}px`,
                          }}
                        >
                          💖
                        </span>
                      );
                    })}
                  </div>

                  {/* Content */}
                  {/*  For blur background*/}
                    <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md shadow-lg border border-white/20 items-center justify-center h-full text-center">

                  <div className="relative z-30 flex flex-col items-center justify-center h-full text-center px-6 animate-popup-3d">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-pink-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,105,180,0.5)] animate-shine">
                      Happy Birthday, My Love
                    </h1>
                    <p className="text-base md:text-2xl text-gray-100/90 max-w-2xl leading-relaxed animate-fade-up">
                      You light up my life brighter than any flame. May your day be filled with magic, laughter, and all the love your heart can hold.
                    </p>
                  </div>
                    </div>

                </div>
            )}

            {/* --- Inline CSS animations for candle, slideshow, and popup --- */}
            <style jsx>{`
        .flame { filter: blur(2px); }
        .animate-flicker { animation: flicker 0.18s infinite alternate; }
        @keyframes flicker {
          from { transform: scaleY(1); opacity: 1; }
          to { transform: scaleY(1.1); opacity: 0.85; }
        }

        .animate-fade { animation: fadeInOut 2s ease-in-out; }
        @keyframes fadeInOut {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }

        .animate-popup { animation: popUp 1s ease-out; }
        @keyframes popUp {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        /* Enhanced final popup styles */
        .animate-zoom-bg { transform: scale(1.1); animation: zoomBg 10s ease-out both; }
        @keyframes zoomBg { to { transform: scale(1); } }

        .animate-popup-3d { animation: popUp3d 800ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes popUp3d {
          0% { transform: perspective(1000px) rotateX(15deg) translateY(20px) scale(0.85); opacity: 0; }
          60% { transform: perspective(1000px) rotateX(0deg) translateY(0) scale(1.03); opacity: 1; }
          100% { transform: perspective(1000px) rotateX(0deg) translateY(0) scale(1); }
        }

        .animate-shine { background-size: 200% auto; animation: shine 3.5s linear infinite; }
        @keyframes shine { to { background-position: 200% 50%; } }

        .animate-fade-up { animation: fadeUp 900ms ease-out 200ms both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .confetti { position: absolute; top: -5%; width: 8px; height: 14px; border-radius: 2px; opacity: 0.9; background: hsl(var(--h), 80%, 60%); transform: rotate(var(--r));
          animation: confettiFall var(--dur, 4s) linear infinite, confettiSpin 1.2s ease-in-out infinite; }
        @keyframes confettiFall {
          0% { transform: translateY(-10%) rotate(var(--r)); }
          100% { transform: translateY(120vh) rotate(calc(var(--r) + 120deg)); }
        }
        @keyframes confettiSpin {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.4); }
        }

        .heart { position: absolute; bottom: -40px; opacity: 0.95; text-shadow: 0 0 12px rgba(255, 105, 180, 0.6);
          animation: floatUp var(--dur, 6s) ease-in infinite; }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-110vh) scale(1.2); opacity: 0; }
        }
      `}</style>
        </div>
    );
};

export default BirthdayCandleApp;
