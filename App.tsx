import React, { useState, useEffect } from 'react';
import { DocType, UploadedFile, ViewState, Topic } from './types';
import { DOC_TYPES_CONFIG, MOCK_LOADING_MSGS } from './constants';
import FileUploadCard from './components/FileUploadCard';
import { extractChaptersFromNotes, synthesizeTopic, findWebLinks, generateDiagram } from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import MermaidRenderer from './components/MermaidRenderer';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('UPLOAD');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicContent, setTopicContent] = useState<string>("");
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  
  // Diagram states
  const [diagramContent, setDiagramContent] = useState<string | null>(null);
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [noDiagramAvailable, setNoDiagramAvailable] = useState(false);

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Rotate loading messages
  useEffect(() => {
    let interval: any;
    if (isAnalyzing || isGeneratingContent) {
      interval = setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % MOCK_LOADING_MSGS.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, isGeneratingContent]);

  const handleUpload = (newFiles: UploadedFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const canAnalyze = () => {
    return files.some(f => f.type === DocType.MAIN);
  };

  const onAnalyzeClick = async () => {
    const mainFiles = files.filter(f => f.type === DocType.MAIN);
    if (mainFiles.length === 0) return;

    setIsAnalyzing(true);
    try {
      const result = await extractChaptersFromNotes(mainFiles);
      setTopics(result);
      setViewState('DASHBOARD');
    } catch (e) {
      console.error(e);
      alert("Failed to analyze notes. Please ensure your Main Notes PDF is readable.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onTopicSelect = async (topic: Topic) => {
    setSelectedTopicId(topic.id);
    setViewState('STUDY');
    setTopicContent(""); 
    setDiagramContent(null);
    setNoDiagramAvailable(false);
    setIsGeneratingContent(true);

    try {
      const markdown = await synthesizeTopic(topic.name, files);
      setTopicContent(markdown);
    } catch (e) {
      setTopicContent("Error loading content. Please try again.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleWebSearch = async () => {
    if (!selectedTopicId) return;
    const topic = topics.find(t => t.id === selectedTopicId);
    if (!topic) return;

    setIsSearchingWeb(true);
    try {
        const webResults = await findWebLinks(topic.name);
        setTopicContent(prev => prev + webResults);
    } catch (e) {
        console.error(e);
    } finally {
        setIsSearchingWeb(false);
    }
  };

  const handleDiagramGeneration = async () => {
    if (!selectedTopicId) return;
    const topic = topics.find(t => t.id === selectedTopicId);
    if (!topic) return;

    setIsGeneratingDiagram(true);
    setNoDiagramAvailable(false);
    try {
        const result = await generateDiagram(topic.name);
        if (result === "NO_DIAGRAM") {
            setNoDiagramAvailable(true);
        } else {
            setDiagramContent(result);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsGeneratingDiagram(false);
    }
  };

  const handleCopyContent = () => {
      navigator.clipboard.writeText(topicContent);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Render Helpers
  const renderUploadView = () => (
    <div className="max-w-5xl mx-auto px-4 py-12 h-full overflow-y-auto custom-scrollbar">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif text-upsc-900 mb-4 font-bold">Mrunal Notes Companion</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Upload your <strong>Main Notes (Mrunal)</strong>. We will extract the chapter list. 
          <br/>
          Upload <strong>PYQs</strong> to get verbatim questions in your reading guide.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {DOC_TYPES_CONFIG.map(config => (
          <FileUploadCard 
            key={config.type} 
            config={config} 
            uploadedFiles={files.filter(f => f.type === config.type)}
            onUpload={handleUpload}
            onRemove={handleRemoveFile}
          />
        ))}
      </div>

      <div className="flex justify-center pb-20">
        <button
          disabled={!canAnalyze() || isAnalyzing}
          onClick={onAnalyzeClick}
          className={`
            px-8 py-4 rounded-full text-lg font-bold shadow-lg transition-all transform hover:-translate-y-1
            ${canAnalyze() && !isAnalyzing
              ? 'bg-upsc-700 text-white hover:bg-upsc-800' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
          `}
        >
          {isAnalyzing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {MOCK_LOADING_MSGS[loadingMsgIndex]}
            </span>
          ) : "Extract Chapters & Start Reading"}
        </button>
      </div>
      {!canAnalyze() && (
        <p className="text-center text-sm text-red-400 -mt-16 mb-8">
          You must upload the Main Notes PDF to proceed.
        </p>
      )}
    </div>
  );

  const renderDashboardView = () => (
    <div className="h-full flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className={`w-full md:w-1/3 lg:w-1/4 bg-white border-r border-upsc-200 h-full overflow-y-auto p-6 ${selectedTopicId ? 'hidden md:block' : 'block'}`}>
        <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif font-bold text-xl text-upsc-800">Topics</h2>
            <button onClick={() => setViewState('UPLOAD')} className="text-xs text-slate-400 hover:text-upsc-600">Back</button>
        </div>
        <div className="space-y-3 pb-10">
          {topics.map(topic => (
            <div key={topic.id} className="flex flex-col">
                <button
                  onClick={() => onTopicSelect(topic)}
                  className={`
                    w-full text-left p-4 rounded-lg border transition-all group
                    ${selectedTopicId === topic.id 
                      ? 'bg-upsc-50 border-upsc-500 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-upsc-300 hover:bg-slate-50'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                      <h3 className={`font-bold text-base leading-tight ${selectedTopicId === topic.id ? 'text-upsc-900' : 'text-slate-700'}`}>
                        {topic.name}
                      </h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-2 shrink-0
                          ${topic.relevance === 'High' ? 'bg-red-100 text-red-700' : 
                            topic.relevance === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}
                      `}>
                          {topic.relevance}
                      </span>
                  </div>
                  
                  <div className="flex items-center mb-3">
                      <span className="text-xs text-slate-400 mr-2">Complexity:</span>
                      <span className={`text-xs font-medium ${
                          topic.complexity === 'Hard' ? 'text-red-500' : 
                          topic.complexity === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                          {topic.complexity}
                      </span>
                  </div>

                  {topic.subtopics && topic.subtopics.length > 0 && (
                      <div className="border-t border-slate-100 pt-2 mt-1">
                          <ul className="list-disc pl-4 space-y-1">
                              {topic.subtopics.map((sub, idx) => (
                                  <li key={idx} className="text-xs text-slate-500 line-clamp-1" title={sub}>
                                      {sub}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
                </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 bg-upsc-50 h-full overflow-y-auto relative ${selectedTopicId ? 'block' : 'hidden md:block'}`}>
        {/* Mobile back button */}
        {selectedTopicId && (
            <div className="md:hidden p-4 bg-white border-b border-upsc-200 sticky top-0 z-10">
                <button onClick={() => setSelectedTopicId(null)} className="flex items-center text-upsc-600 font-medium">
                    <span className="mr-1">←</span> Back to Topics
                </button>
            </div>
        )}

        {viewState === 'DASHBOARD' && !selectedTopicId && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                <div className="text-6xl mb-4">📖</div>
                <h3 className="text-2xl font-serif text-slate-600 mb-2">Reading Companion</h3>
                <p className="max-w-md">
                    Select a chapter from the sidebar to view the Reading Guide.
                </p>
            </div>
        )}

        {viewState === 'STUDY' && (
            <div className="max-w-4xl mx-auto p-8 md:p-12 min-h-full bg-white shadow-xl my-4 md:my-8 rounded-xl relative">
                {isGeneratingContent ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                         <svg className="animate-spin h-10 w-10 text-upsc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-upsc-600 font-medium animate-pulse">{MOCK_LOADING_MSGS[loadingMsgIndex]}</p>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        {/* Action Bar */}
                        <div className="flex justify-end mb-6 gap-3 sticky top-0 bg-white/95 backdrop-blur py-2 z-10 border-b border-slate-50">
                             <button
                                onClick={handleCopyContent}
                                className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-200 transition-colors flex items-center"
                             >
                                {copyFeedback ? (
                                    <span className="text-green-600 font-bold">✓ Copied</span>
                                ) : (
                                    <span>📋 Copy Text</span>
                                )}
                             </button>

                             {!diagramContent && !noDiagramAvailable && (
                                 <button
                                    onClick={handleDiagramGeneration}
                                    disabled={isGeneratingDiagram}
                                    className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                 >
                                    {isGeneratingDiagram ? "Thinking..." : "✨ Generate Concept Flowchart"}
                                 </button>
                             )}
                        </div>

                        {noDiagramAvailable && (
                            <div className="mb-6 p-3 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100 text-center">
                                No complex diagram available for this specific topic.
                            </div>
                        )}

                        {diagramContent && (
                            <MermaidRenderer chart={diagramContent} />
                        )}

                        <MarkdownRenderer content={topicContent} />
                        
                        <div className="mt-8 pt-6 border-t border-slate-100">
                           {!topicContent.includes('Live Web Resources') && (
                               <button 
                                 onClick={handleWebSearch}
                                 disabled={isSearchingWeb}
                                 className="flex items-center text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded hover:bg-blue-100 transition-colors font-medium"
                               >
                                  {isSearchingWeb ? (
                                    <>Searching Google...</>
                                  ) : (
                                    <>🌐 Find Live PIB/News Links for this Topic</>
                                  )}
                               </button>
                           )}
                        </div>

                        <div className="mt-4 flex justify-between items-center text-sm text-slate-400">
                             <span>Generated by Gemini 2.5 Flash</span>
                             <span>Files Used: {files.length}</span>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col">
       {/* Header */}
       <header className="bg-white border-b border-upsc-100 px-6 py-3 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-upsc-700 rounded-lg flex items-center justify-center text-white font-serif font-bold">
                M
            </div>
            <span className="font-serif font-bold text-slate-800">Mrunal Companion</span>
          </div>
          <div className="text-xs font-medium text-slate-500">
             {files.length} Files Loaded
          </div>
       </header>

       {/* Main Body */}
       <main className={`flex-1 relative ${viewState === 'UPLOAD' ? 'overflow-hidden' : 'overflow-hidden'}`}>
          {viewState === 'UPLOAD' ? renderUploadView() : renderDashboardView()}
       </main>
    </div>
  );
};

export default App;