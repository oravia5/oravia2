import React, { createContext, useState, useRef, useContext, useCallback } from 'react';

const UploadContext = createContext(null);

export const UploadProvider = ({ children }) => {
  const [uploads, setUploads] = useState([]);
  const uploadRef = useRef([]);

  const startUpload = useCallback((id, filename) => {
    const upload = { id, filename, progress: 0, status: 'uploading' };
    uploadRef.current = [...uploadRef.current, upload];
    setUploads([...uploadRef.current]);
  }, []);

  const updateProgress = useCallback((id, progress) => {
    uploadRef.current = uploadRef.current.map(u =>
      u.id === id ? { ...u, progress } : u
    );
    setUploads([...uploadRef.current]);
  }, []);

  const finishUpload = useCallback((id, success = true) => {
    uploadRef.current = uploadRef.current.map(u =>
      u.id === id ? { ...u, progress: 100, status: success ? 'done' : 'error' } : u
    );
    setUploads([...uploadRef.current]);
    setTimeout(() => {
      uploadRef.current = uploadRef.current.filter(u => u.id !== id);
      setUploads([...uploadRef.current]);
    }, success ? 1500 : 3000);
  }, []);

  const value = {
    uploads,
    startUpload,
    updateProgress,
    finishUpload,
    isUploading: uploadRef.current.some(u => u.status === 'uploading'),
  };

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
};

export const useUpload = () => {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
};
