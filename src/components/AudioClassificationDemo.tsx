/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity */

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

import { AudioClassifier } from "@mediapipe/tasks-audio";
import { FilesetResolver } from "@mediapipe/tasks-vision";

export default function AudioClassificationDemo() {
  const [isListening, setIsListening] = useState(false);
  const [currentLabel, setCurrentLabel] = useState("Silence");
  const [confidence, setConfidence] = useState(0);
  const [glowing, setGlowing] = useState(false);
  const [topCategories, setTopCategories] = useState<
    Array<{ name: string; score: string }>
  >([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const classifierRef = useRef<AudioClassifier | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const handleStartListening = async () => {
    try {
      setIsListening(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Create AudioContext with 16000 sample rate for better classification
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({
          sampleRate: 16000,
        });
      }

      const audioCtx = audioContextRef.current;
      await audioCtx.resume();

      // Initialize AudioClassifier if not already done
      if (!classifierRef.current) {
        const fileset = await FilesetResolver.forAudioTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.0/wasm",
        );

        classifierRef.current = await AudioClassifier.createFromOptions(
          fileset,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite",
            },
            maxResults: 3,
          },
        );
      }

      // Create source from media stream
      sourceRef.current = audioCtx.createMediaStreamSource(stream);

      // Create script processor node
      scriptNodeRef.current = audioCtx.createScriptProcessor(16384, 1, 1);

      scriptNodeRef.current.onaudioprocess = (event) => {
        if (!classifierRef.current) return;

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);

        // Classify the audio
        const result = classifierRef.current.classify(inputData);

        if (!result || result.length === 0) return;

        const categories = result[0]?.classifications[0]?.categories || [];

        if (categories.length === 0) return;

        // Get top category
        const topCategory = categories[0];
        const label = topCategory.categoryName;
        const score = Math.round(topCategory.score * 100);

        setCurrentLabel(label);
        setConfidence(score);
        setGlowing(score > 70);

        // Set top 3 categories
        const top3 = categories.slice(0, 3).map((cat: any) => ({
          name: cat.categoryName,
          score: (cat.score * 100).toFixed(1),
        }));
        setTopCategories(top3);

        console.log(`${label} (${score}%)`);
      };

      sourceRef.current.connect(scriptNodeRef.current);
      scriptNodeRef.current.connect(audioCtx.destination);

      console.log("✅ Audio classification started");
    } catch (err) {
      console.error("❌ Error starting audio classification:", err);
      alert("Microphone access denied or not available");
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    setIsListening(false);
    setCurrentLabel("Silence");
    setConfidence(0);
    setGlowing(false);
    setTopCategories([]);

    scriptNodeRef.current?.disconnect();
    sourceRef.current?.disconnect();

    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    console.log("🎥 Audio classification stopped");
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Main Card */}
      <Card
        className={`relative w-full max-w-md aspect-square flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 ${
          glowing
            ? "border-cyan-400/60 bg-slate-900/60 shadow-lg shadow-cyan-400/20"
            : "border-slate-700/30 bg-slate-900/40"
        }`}
      >
        {glowing && (
          <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-cyan-500/10 to-purple-500/10 animate-pulse" />
        )}

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Waveform */}
          <div className="flex items-end gap-1 h-16">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-2 rounded-full transition-all duration-200 ${
                  isListening
                    ? "bg-linear-to-t from-cyan-400 to-purple-400 animate-pulse"
                    : "bg-slate-600 h-4"
                }`}
                style={{
                  height: isListening ? `${20 + Math.random() * 40}px` : "16px",
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>

          {/* Label */}
          <div className="text-center">
            <div
              className={`text-5xl font-bold tracking-tight transition-all duration-300 ${
                glowing
                  ? "text-cyan-300 drop-shadow-lg drop-shadow-cyan-400/50"
                  : "text-slate-200"
              }`}
            >
              {currentLabel}
            </div>

            {isListening && (
              <>
                <div className="text-sm text-slate-400 mt-4">
                  Confidence:{" "}
                  <span className="text-cyan-300 font-semibold">
                    {confidence}%
                  </span>
                </div>

                {/* Top 3 Categories */}
                <div className="mt-6 space-y-2 text-left">
                  {topCategories.map((cat, idx) => (
                    <div key={idx} className="text-xs text-slate-400">
                      <span className="text-purple-300">{idx + 1}.</span>{" "}
                      {cat.name}{" "}
                      <span className="text-cyan-300">{cat.score}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Button */}
      <Button
        onClick={isListening ? handleStopListening : handleStartListening}
        className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 ${
          isListening
            ? "bg-red-500/80 hover:bg-red-600 text-white"
            : "bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
        }`}
      >
        {isListening ? (
          <>
            <MicOff className="w-5 h-5 mr-2 inline" />
            Stop Listening
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 mr-2 inline" />
            Start Listening
          </>
        )}
      </Button>
    </div>
  );
}
