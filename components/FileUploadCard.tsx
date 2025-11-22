import React, { useRef, useState } from 'react';
import { DocType, UploadedFile } from '../types';
import { fileToBase64 } from '../utils/fileHelpers';

interface Props {
  config: {
    type: DocType;
    description: string;
    required: boolean;
    icon: string;
  };
  uploadedFiles: UploadedFile[];
  onUpload: (files: UploadedFile[]) => void;
  onRemove: (fileId: string) => void;
}

const FileUploadCard: React.FC<Props> = ({ config, uploadedFiles, onUpload, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    const newUploadedFiles: UploadedFile[] = [];

    try {
      await Promise.all(files.map(async (file: File) => {
        if (file.type !== 'application/pdf') {
          return; // Skip non-PDFs silently or handle if needed
        }
        
        try {
          const base64 = await fileToBase64(file);
          newUploadedFiles.push({
            id: crypto.randomUUID(),
            type: config.type,
            name: file.name,
            base64: base64,
            mimeType: file.type
          });
        } catch (err) {
          console.error(`Failed to process ${file.name}`, err);
        }
      }));

      if (newUploadedFiles.length > 0) {
        onUpload(newUploadedFiles);
      } else if (files.some(f => f.type !== 'application/pdf')) {
          alert("Only PDF files are accepted.");
      }
    } catch (error) {
      console.error("Batch upload error:", error);
      alert("An error occurred while processing files.");
    } finally {
      setIsProcessing(false);
      // Reset input
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const hasFiles = uploadedFiles.length > 0;

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
      relative flex flex-col items-center p-8 rounded-xl border-2 transition-all min-h-[350px]
      ${isDragging 
          ? 'border-upsc-500 bg-upsc-100 scale-[1.02] border-solid' 
          : (hasFiles 
              ? 'border-upsc-500 bg-upsc-50 shadow-sm border-solid' 
              : 'border-dashed border-upsc-300 hover:border-upsc-500 hover:bg-white bg-slate-50 justify-center'
            )
      }
    `}>
      
      {/* Visual Overlay when Dragging */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-upsc-100 bg-opacity-90 z-10 rounded-xl pointer-events-none">
            <p className="text-upsc-700 font-bold text-2xl animate-bounce">Drop PDFs Here</p>
        </div>
      )}

      <div className="text-5xl mb-4">{config.icon}</div>
      <h3 className="font-serif font-bold text-slate-700 text-lg text-center mb-2">{config.type}</h3>
      
      {!hasFiles && (
        <p className="text-sm text-slate-500 mb-6 px-4 text-center leading-relaxed max-w-[300px]">
            {config.description}
            {config.required && <span className="text-red-400 ml-1">*</span>}
        </p>
      )}

      <div className="w-full mb-6 space-y-2 max-h-48 overflow-y-auto custom-scrollbar z-0">
        {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-upsc-200 shadow-sm text-sm">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="text-xl">📄</span>
                    <span className="truncate text-slate-700 font-medium max-w-[180px]" title={file.name}>{file.name}</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
                    className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                    title="Remove file"
                >
                    ✕
                </button>
            </div>
        ))}
      </div>

      <button 
        onClick={() => inputRef.current?.click()}
        disabled={isProcessing}
        className={`
            px-6 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center z-0
            ${hasFiles ? 'bg-white border border-upsc-300 text-upsc-700 hover:bg-upsc-50' : 'bg-upsc-600 text-white hover:bg-upsc-700'}
            ${isProcessing ? 'opacity-70 cursor-wait' : ''}
        `}
      >
        {isProcessing ? 'Processing...' : (hasFiles ? '+ Add PDFs' : 'Select or Drop PDFs')}
      </button>

      <input 
        type="file" 
        accept="application/pdf"
        multiple
        ref={inputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />
      
      {hasFiles && (
        <div className="absolute top-3 right-3 text-upsc-600">
             <div className="bg-upsc-100 text-upsc-800 text-xs font-bold px-3 py-1.5 rounded-full">
                {uploadedFiles.length} {uploadedFiles.length === 1 ? 'File' : 'Files'}
             </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadCard;