import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GestureWhiteboardDemo from "./components/GestureWhiteboardDemo";
import AudioClassificationDemo from "./components/AudioClassificationDemo";



function App() {
const [activeTab, setActiveTab] = useState<string>("hear");
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="border-b border-slate-800/50 backdrop-blur-sm py-6 px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-cyan-300 to-purple-400 tracking-tight">
              ML Experiences in the Browser
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Powered by MediaPipe • Runs fully in your browser
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Brought you by{" "}
              <a
                href="https://atharvamulgund.web.app"
                className="underline underline-offset-4"
              >
                Atharva Mulgund
              </a>
            </p>
          </div>
        </header>

        {/* Tabs Container */}
        <div className="flex-1 flex items-center justify-center px-8 py-12 ">
          <div className="w-full max-w-6xl">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              {/* Tab Navigation */}
              <div className="flex justify-center mb-8 text-white">
                <TabsList className="bg-slate-800/50 border border-slate-700/50 backdrop-blur">
                  <TabsTrigger
                    value="hear"
                    className="data-[state=active]:bg-linear-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500  transition-all duration-300 cursor-pointer text-white!"
                  >
                    <span className="mr-2">🎵</span>
                    Hear
                  </TabsTrigger>
                  <TabsTrigger
                    value="see"
                    className="data-[state=active]:bg-linear-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500 text-white! transition-all duration-300 cursor-pointer"
                  >
                    <span className="mr-2">✋</span>
                    See
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Contents with smooth transitions */}
              <div className="relative h-screen">
                <TabsContent
                  value="hear"
                  className="animate-in fade-in-0 duration-300 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 h-full"
                >
                  <AudioClassificationDemo />
                </TabsContent>

                <TabsContent
                  value="see"
                  className="animate-in fade-in-0 duration-300 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 h-full"
                >
                  <GestureWhiteboardDemo />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App
