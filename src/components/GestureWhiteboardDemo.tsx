/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, VideoOff } from "lucide-react";

import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export default function GestureWhiteboardDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // whiteboard
  const overlayRef = useRef<HTMLCanvasElement>(null); // landmarks

  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const prevPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastColorChangeRef = useRef<number>(0);
  const lastClearRef = useRef<number>(0);
  // const lastSaveRef = useRef<number>(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [activeGesture, setActiveGesture] = useState<string | null>(null);
  const [color, setColor] = useState("#06b6d4");
  const [drawingExists, setDrawingExists] = useState(false);

  const colors = ["#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current = null;
      }
      console.log("🎥 Camera closed on component unmount");
    };
  }, []);

  /* ---------------- Canvas setup ---------------- */
  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current || !overlayRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();

      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;

      overlayRef.current.width = rect.width;
      overlayRef.current.height = rect.height;

      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, rect.width, rect.height);
      }

      console.log("🖼 Canvas resized:", rect.width, rect.height);
    };

    // wait for layout
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ---------------- Draw landmarks ---------------- */
  const drawLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    w: number,
    h: number,
  ) => {
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    HAND_CONNECTIONS.forEach(([s, e]) => {
      const a = landmarks[s];
      const b = landmarks[e];
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    });

    ctx.fillStyle = "#a5f3fc";
    landmarks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  /* ---------------- MediaPipe results ---------------- */
  const handleResults = useCallback(
    (results: any) => {
      console.log("📦 onResults called", results);
      if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0 ||
        !canvasRef.current ||
        !overlayRef.current
      ) {
        prevPosRef.current = null;
        setActiveGesture(null);
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const overlayCtx = overlayRef.current.getContext("2d");

      if (!ctx || !overlayCtx) return;

      drawLandmarks(overlayCtx, landmarks, canvas.width, canvas.height);

      const indexTip = landmarks[8];
      const indexPip = landmarks[6];
      const middleTip = landmarks[12];
      const middlePip = landmarks[10];
      const ringTip = landmarks[16];
      const ringPip = landmarks[14];
      const pinkyTip = landmarks[20];
      const pinkyPip = landmarks[18];

      const indexUp = indexTip.y < indexPip.y;
      const middleUp = middleTip.y < middlePip.y;
      const ringDown = ringTip.y > ringPip.y;
      const pinkyDown = pinkyTip.y > pinkyPip.y;

      const thumbTip = landmarks[4];
      const thumbIp = landmarks[3];
      const thumbUp = thumbTip.y < thumbIp.y;

      const x = indexTip.x * canvas.width;
      const y = indexTip.y * canvas.height;

      /* ☝️ DRAW - Index up, middle down */
      if (indexUp && !middleUp) {
        setActiveGesture("Draw");

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";

        if (!prevPosRef.current) {
          prevPosRef.current = { x, y };
          setDrawingExists(true);
          return;
        }

        ctx.beginPath();
        ctx.moveTo(prevPosRef.current.x, prevPosRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        prevPosRef.current = { x, y };
        return;
      }

      /* ✌️ CHANGE COLOR - Index and Middle up, Ring and Pinky down */
      if (indexUp && middleUp && ringDown && pinkyDown) {
        const now = Date.now();
        if (now - lastColorChangeRef.current > 500) {
          setActiveGesture("Change Color");
          const newColor = colors[Math.floor(Math.random() * colors.length)];
          setColor(newColor);
          console.log("🎨 Color changed to:", newColor);
          lastColorChangeRef.current = now;
        }
        prevPosRef.current = null;
        return;
      }

      /* ✋ CLEAR - All fingers up (open palm) */
      if (indexUp && middleUp && thumbUp && !ringDown && !pinkyDown) {
        const now = Date.now();
        if (now - lastClearRef.current > 500) {
          setActiveGesture("Clear");
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          setDrawingExists(false);
          console.log("🗑️ Canvas cleared");
          lastClearRef.current = now;
        }
        prevPosRef.current = null;
        return;
      }

      /* 👍 SAVE - Thumbs up (thumb up, other fingers down) */
      // if (thumbUp && !indexUp && !middleUp && ringDown && pinkyDown) {
      //   if (!drawingExists) {
      //     console.log("⚠️ Canvas is empty, cannot save");
      //     return;
      //   }

      //   const now = Date.now();
      //   if (now - lastSaveRef.current > 500) {
      //     setActiveGesture("Save");
      //     const link = document.createElement("a");
      //     link.href = canvas.toDataURL("image/png");
      //     link.download = `whiteboard-${Date.now()}.png`;
      //     link.click();
      //     console.log("💾 Canvas saved");
      //     lastSaveRef.current = now;
      //   }
      //   prevPosRef.current = null;
      //   return;
      // }

      prevPosRef.current = null;
      setActiveGesture(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, drawingExists],
  );

  useEffect(() => {
    if (handsRef.current) {
      handsRef.current.onResults(handleResults);
    }
  }, [handleResults]);

  /* ---------------- Camera controls ---------------- */
  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      handsRef.current = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        selfieMode: true,
      });

      handsRef.current.onResults(handleResults);

      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (
            videoRef.current &&
            videoRef.current.videoWidth > 0 &&
            videoRef.current.videoHeight > 0
          ) {
            try {
              await handsRef.current?.send({ image: videoRef.current });
            } catch (err) {
              console.error("❌ Error sending frame to Hands:", err);
            }
          }
        },
        width: 1280,
        height: 720,
      });

      await cameraRef.current.start();

      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (
            videoRef.current &&
            videoRef.current.videoWidth > 0 &&
            videoRef.current.videoHeight > 0
          ) {
            resolve();
          } else {
            requestAnimationFrame(checkReady);
          }
        };
        checkReady();
      });

      console.log("✅ Camera started. Video:", {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });

      setCameraOn(true);
    } catch (err) {
      console.error("❌ Camera error:", err);
      alert("Camera permission denied or not available");
    }
  };

  const stopCamera = () => {
    cameraRef.current?.stop();
    cameraRef.current = null;
    handsRef.current = null;
    setCameraOn(false);
    setActiveGesture(null);
    console.log("🎥 Camera stopped");
  };

  // const handleColorChange = () => {
  //   const newColor = colors[Math.floor(Math.random() * colors.length)];
  //   setColor(newColor);
  //   setActiveGesture("Color Changed");
  //   setTimeout(() => setActiveGesture(null), 1000);
  // };

  const handleSaveCanvas = () => {
    if (!drawingExists) {
      alert("Canvas is empty, cannot save");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `whiteboard-${Date.now()}.png`;
    link.click();
    setActiveGesture("Save");
    setTimeout(() => setActiveGesture(null), 1000);
    console.log("💾 Canvas saved");
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="flex flex-col gap-6 h-screen">
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={cameraOn ? stopCamera : startCamera}
        >
          {cameraOn ? (
            <VideoOff className="mr-2" />
          ) : (
            <Video className="mr-2" />
          )}
          {cameraOn ? "Stop Camera" : "Start Camera"}
        </Button>
        <Button
          variant="outline"
          className=" cursor-pointer "
          onClick={handleSaveCanvas}
          disabled={!drawingExists}
        >
          👍 Save Canvas
        </Button>
      </div>

      <div className="flex justify-center gap-3">
        <Badge variant="outline" className="text-white">
          ☝️ Draw
        </Badge>
        <Badge variant="outline" className="text-white">
          ✌️ Color
        </Badge>
        <Badge variant="outline" className="text-white">
          ✋ Clear
        </Badge>
        <Badge variant="outline" className="text-white">
          ✊ Stop
        </Badge>
        <Badge variant="outline" className="text-white">
          👍 Save
        </Badge>
      </div>

      {/* Current Color Display */}
      <div className="flex justify-center items-center gap-2">
        <span className="text-sm text-slate-300">Current Color:</span>
        <div
          className="w-8 h-8 rounded-lg border-2 border-slate-400"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-slate-400">{color}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[55vh]">
        {/* Camera */}
        <div className="hidden lg:flex">
          <Card className="relative w-full overflow-hidden bg-slate-900/40 border-slate-700/30">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
          </Card>
        </div>

        {/* Whiteboard */}
        <div className="lg:col-span-2 flex">
          <Card className="relative flex-1 bg-slate-900/40 border-slate-700/30 overflow-hidden">
            {activeGesture && (
              <Badge className="absolute top-4 left-1/2 -translate-x-1/2 bg-linear-to-r from-cyan-500 to-purple-500 text-white animate-pulse z-30">
                {activeGesture}
              </Badge>
            )}

            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
