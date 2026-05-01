import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FolderOpen, Loader2, ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ACCEPTED_TYPES = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
const ACCEPTED_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

function isValidImageFile(file) {
  return ACCEPTED_TYPES.includes(file.type) ||
    ACCEPTED_EXTS.some(ext => file.name.toLowerCase().endsWith(ext));
}

export default function ImageStimulusEditor({ stimuli, onChange }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const uploadFiles = async (files) => {
    const validFiles = Array.from(files).filter(isValidImageFile);
    const invalidCount = files.length - validFiles.length;

    if (validFiles.length === 0) {
      toast.error('No valid image files found. Accepted: .png, .jpg, .jpeg, .webp');
      return;
    }

    if (invalidCount > 0) {
      toast.info(`${invalidCount} invalid file${invalidCount > 1 ? 's' : ''} were ignored`);
    }

    setUploading(true);
    const newStimuli = [];
    let failCount = 0;

    for (const file of validFiles) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) {
        newStimuli.push({ type: 'image', value: file_url, name: file.name });
      } else {
        failCount++;
      }
    }

    setUploading(false);

    if (newStimuli.length > 0) {
      onChange([...stimuli, ...newStimuli]);
      toast.success(`${newStimuli.length} valid image${newStimuli.length > 1 ? 's' : ''} uploaded`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} image${failCount > 1 ? 's' : ''} failed to upload`);
    }
  };

  const removeImage = (index) => {
    onChange(stimuli.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div className="space-y-4">
      {/* Upload controls */}
      <div
        className="border-2 border-dashed rounded-xl p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading images…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drag & drop images here, or click to browse</p>
            <p className="text-xs text-muted-foreground">Upload images one by one, many at once, or upload a folder</p>
            <p className="text-xs text-muted-foreground">Accepted: .png, .jpg, .jpeg, .webp</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 flex-1"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4" />
          Upload Images
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 flex-1"
          disabled={uploading}
          onClick={() => folderInputRef.current?.click()}
        >
          <FolderOpen className="w-4 h-4" />
          Upload Folder
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp"
        webkitdirectory=""
        className="hidden"
        onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Image grid */}
      {stimuli.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {stimuli.map((s, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
              <img
                src={s.value}
                alt={s.name || `Stimulus ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {stimuli.length === 0 && !uploading && (
        <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
          <ImageIcon className="w-4 h-4 shrink-0" />
          No images uploaded yet
        </div>
      )}

      {/* Count & validation */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{stimuli.length} image{stimuli.length !== 1 ? 's' : ''} uploaded</span>
        {stimuli.length > 0 && stimuli.length < 6 && (
          <span className="text-destructive font-medium">Minimum 6 required · need {6 - stimuli.length} more</span>
        )}
        {stimuli.length >= 6 && stimuli.length < 8 && (
          <span className="text-amber-500">8–10+ recommended for better N-back quality</span>
        )}
        {stimuli.length >= 8 && (
          <span className="text-green-600">Good variety for N-back tasks</span>
        )}
      </div>
    </div>
  );
}