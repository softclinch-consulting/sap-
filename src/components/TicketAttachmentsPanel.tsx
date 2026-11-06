import React, { useState, useRef } from 'react';
import { TicketAttachment } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  FileCode,
  Download,
  Eye,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface TicketAttachmentsPanelProps {
  ticketId: string;
  attachments?: TicketAttachment[];
  onAttachmentUploaded?: () => void;
  canUpload?: boolean;
  currentUser?: any;
}

export const TicketAttachmentsPanel: React.FC<TicketAttachmentsPanelProps> = ({
  ticketId,
  attachments = [],
  onAttachmentUploaded,
  canUpload = true
}) => {
  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (fileType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (['log', 'txt', 'st22', 'dump'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await readFileAsDataUrl(file);

        await api.uploadAttachment(ticketId, {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          dataUrl
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onAttachmentUploaded) onAttachmentUploaded();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDownload = (att: TicketAttachment) => {
    if (att.dataUrl) {
      const link = document.createElement('a');
      link.href = att.dataUrl;
      link.download = att.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback: create blob download
      const blob = new Blob([`SoftClinch SAP Support Desk\nFile: ${att.fileName}\nUploaded: ${att.uploadedAt}`], { type: att.fileType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePreview = (att: TicketAttachment) => {
    setPreviewAttachment(att);
    if (att.dataUrl && (att.fileName.endsWith('.txt') || att.fileName.endsWith('.log') || att.fileType.includes('text'))) {
      if (att.dataUrl.includes('base64,')) {
        try {
          const raw = atob(att.dataUrl.split('base64,')[1]);
          setPreviewContent(raw);
        } catch (_) {
          setPreviewContent('Unable to decode text log content.');
        }
      } else {
        setPreviewContent(decodeURIComponent(att.dataUrl));
      }
    } else {
      setPreviewContent(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800 text-xs">
            Attachments &amp; Diagnostics ({safeAttachments.length})
          </span>
        </div>

        {canUpload && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
              accept=".png,.jpg,.jpeg,.svg,.txt,.log,.pdf,.xlsx,.csv,.doc,.docx"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              {uploading ? 'Uploading...' : 'Attach Files'}
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {safeAttachments.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded text-center text-slate-400 text-xs">
          No diagnostic files or screenshots attached yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {safeAttachments.map(att => (
            <div
              key={att.id}
              className="p-2.5 bg-white border border-[#E5EAF0] rounded-md hover:border-blue-400 transition-colors flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(att.fileType, att.fileName)}
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-[11px] truncate" title={att.fileName}>
                    {att.fileName}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatFileSize(att.fileSize)} • {att.uploadedByName || 'User'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePreview(att)}
                  title="Preview"
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  title="Download File"
                  className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                {getFileIcon(previewAttachment.fileType, previewAttachment.fileName)}
                <span className="truncate">{previewAttachment.fileName}</span>
                <span className="text-slate-400 font-normal">({formatFileSize(previewAttachment.fileSize)})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewAttachment(null);
                  setPreviewContent(null);
                }}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-[#F8FAFC]">
              {previewAttachment.fileType.startsWith('image/') || previewAttachment.fileName.endsWith('.svg') || previewAttachment.fileName.endsWith('.png') || previewAttachment.fileName.endsWith('.jpg') ? (
                <div className="flex justify-center">
                  <img
                    src={previewAttachment.dataUrl || ''}
                    alt={previewAttachment.fileName}
                    className="max-h-[60vh] object-contain rounded border border-slate-200 shadow-sm"
                  />
                </div>
              ) : previewContent ? (
                <pre className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded border border-slate-700 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-auto">
                  {previewContent}
                </pre>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-700">Preview not supported for this file type</div>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewAttachment)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download File
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs">
              <div className="text-slate-500 text-[11px]">
                Uploaded by {previewAttachment.uploadedByName} on {new Date(previewAttachment.uploadedAt).toLocaleString()}
              </div>
              <button
                type="button"
                onClick={() => handleDownload(previewAttachment)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded border border-slate-300 flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
