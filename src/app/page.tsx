import { UploadSection } from '@/components/upload/UploadSection';
import { ChatSection } from '@/components/chat/ChatSection';
import { DocumentsSection } from '@/components/documents/DocumentsSection';
import { StatsSection } from '@/components/stats/StatsSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-orange-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">AI</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Assistant IA
                  </h1>
                  <p className="text-xs text-orange-600 font-medium">
                    Powered by Ryless 💪🏼
                  </p>
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="text-sm text-slate-500 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                  Analyse de données intelligente
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <StatsSection />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
          
          {/* Left Column - Upload & Documents */}
          <div className="lg:col-span-4 space-y-6 overflow-y-auto">
            {/* Upload Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-orange-200/50 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Upload & Analyse
                </h2>
              </div>
              <UploadSection />
            </div>

            {/* Documents Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-orange-200/50 p-6 flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Mes Documents
                </h2>
              </div>
              <DocumentsSection />
            </div>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-8 h-full">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-orange-200/50 h-full flex flex-col overflow-hidden">
              <div className="flex items-center space-x-3 p-6 border-b border-orange-200/50 flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Assistant IA
                </h2>
                <div className="flex-1" />
                <span className="text-xs text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                  Posez vos questions sur vos données
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <ChatSection />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}