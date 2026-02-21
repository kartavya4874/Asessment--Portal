import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

export default function FileUpload({ onFilesSelected, maxFiles = 10, accept, label = 'Upload Files' }) {
    const onDrop = useCallback((acceptedFiles) => {
        onFilesSelected(acceptedFiles);
    }, [onFilesSelected]);

    const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
        onDrop,
        maxFiles,
        accept,
    });

    return (
        <div>
            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
            }}>
                {label}
            </label>
            <motion.div
                {...getRootProps()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{
                    border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border)'}`,
                    borderRadius: '12px',
                    padding: '40px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragActive ? 'rgba(108, 92, 231, 0.05)' : 'var(--surface)',
                    transition: 'all 0.2s',
                }}
            >
                <input {...getInputProps()} />
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                    {isDragActive ? '📂' : '📁'}
                </div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>
                    {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    or click to browse
                </p>
            </motion.div>

            {acceptedFiles.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {acceptedFiles.map((file, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                fontSize: '13px',
                            }}
                        >
                            <span>📄</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name}
                            </span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                {(file.size / 1024).toFixed(1)} KB
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
