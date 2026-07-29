export type UploadMediaType = 'image' | 'video' | 'audio';

const ALLOWED_UPLOAD_FORMATS: Record<UploadMediaType, { extensions: string[]; mimeTypes: string[] }> = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  video: {
    extensions: ['mp4', 'webm', 'mov'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  },
  audio: {
    extensions: ['mp3', 'wav', 'webm', 'ogg', 'm4a', 'mp4'],
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'audio/x-mp3', 'audio/mpeg3', 'audio/x-mpeg3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'video/mp4'],
  },
};

function fileExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

export function isAllowedUploadFile(file: File, mediaType: UploadMediaType) {
  const formats = ALLOWED_UPLOAD_FORMATS[mediaType];
  const mimeType = file.type.toLowerCase().split(';', 1)[0];
  const genericAudioType =
    mediaType === 'audio' && (!mimeType || mimeType === 'application/octet-stream');
  return formats.extensions.includes(fileExtension(file)) &&
    (formats.mimeTypes.includes(mimeType) || genericAudioType);
}

export function allowedUploadFormats(mediaType: UploadMediaType) {
  return ALLOWED_UPLOAD_FORMATS[mediaType].extensions.map((extension) => `.${extension.toUpperCase()}`).join(', ');
}

export function uploadFormatError(mediaType: UploadMediaType) {
  const label = mediaType === 'audio' ? 'audio' : mediaType;
  return `Only these ${label} file formats are allowed: ${allowedUploadFormats(mediaType)}.`;
}
