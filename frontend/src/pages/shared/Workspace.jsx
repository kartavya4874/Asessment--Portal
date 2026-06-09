import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

export default function Workspace() {
    const { domainId } = useParams();
    const { user } = useAuth();
    const [domain, setDomain] = useState(null);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form states
    const [showForm, setShowForm] = useState(false);
    const [resourceType, setResourceType] = useState('url'); // 'url', 'text', 'file'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const fetchData = async () => {
        try {
            // We can fetch the domain name from the domains list or a direct endpoint if we had one.
            // For now, we'll fetch all domains and find this one.
            const domainsRes = await client.get('/domains');
            const currentDomain = domainsRes.data.find(d => d.id === domainId);
            setDomain(currentDomain);
            
            const resourcesRes = await client.get(`/workspaces/${domainId}/resources`);
            setResources(resourcesRes.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to load workspace');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [domainId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('Title is required');
        
        setUploading(true);
        try {
            if (resourceType === 'file') {
                if (!file) return toast.error('File is required');
                const formData = new FormData();
                formData.append('title', title);
                formData.append('file', file);
                
                await client.post(`/workspaces/${domainId}/files`, formData);
            } else {
                if (!content.trim()) return toast.error('Content/URL is required');
                await client.post(`/workspaces/${domainId}/resources`, {
                    title,
                    resourceType,
                    content
                });
            }
            toast.success('Resource added successfully!');
            setTitle('');
            setContent('');
            setFile(null);
            setShowForm(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add resource');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        try {
            await client.delete(`/workspaces/${domainId}/resources/${id}`);
            toast.success('Resource deleted');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete resource');
        }
    };

    const inputStyle = {
        width: '100%',
        background: 'rgba(124,108,240,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '13px 16px',
        fontSize: '14px',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'all 0.3s',
    };

    if (loading) {
        return (
            <PageTransition>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '28px' }}>
                        <SkeletonCard />
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                    <div>
                        <Link to={user?.role === 'admin' ? '/admin/domains' : '/student/domains'} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            ← Back to Subjects
                        </Link>
                        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>
                            <span className="gradient-text">{domain?.name || 'Workspace'}</span> Workspace
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                            Share URLs, dependencies, and files with everyone enrolled in this track.
                        </p>
                    </div>
                    <motion.button
                        className="btn-primary"
                        onClick={() => setShowForm(!showForm)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {showForm ? 'Cancel' : '➕ Add Resource'}
                    </motion.button>
                </div>

                {/* Create Form */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden', marginBottom: '32px' }}
                        >
                            <div className="card-glow" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Type</label>
                                            <select value={resourceType} onChange={e => setResourceType(e.target.value)} style={inputStyle}>
                                                <option value="url">Link / URL</option>
                                                <option value="text">Text / Dependency Note</option>
                                                <option value="file">File Upload</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Title</label>
                                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Required Python Packages" style={inputStyle} required />
                                        </div>
                                    </div>

                                    {resourceType === 'file' ? (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>File</label>
                                            <input type="file" onChange={e => setFile(e.target.files[0])} style={inputStyle} required />
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                                {resourceType === 'url' ? 'URL Link' : 'Content'}
                                            </label>
                                            {resourceType === 'url' ? (
                                                <input value={content} onChange={e => setContent(e.target.value)} placeholder="https://..." style={inputStyle} required />
                                            ) : (
                                                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="e.g., pip install fastapi uvicorn" style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} required />
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                        <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                        <button type="submit" disabled={uploading} className="btn-primary" style={{ padding: '10px 24px' }}>
                                            {uploading ? 'Uploading...' : 'Publish'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Resources List */}
                {resources.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Workspace is empty</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>No resources have been shared in this track yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        {resources.map(resource => (
                            <motion.div
                                key={resource.id}
                                className="card"
                                whileHover={{ scale: 1.005 }}
                                style={{
                                    display: 'flex',
                                    gap: '20px',
                                    alignItems: 'center',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '12px',
                                    background: 'var(--surface)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '24px',
                                    border: '1px solid var(--border)'
                                }}>
                                    {resource.resourceType === 'url' && '🔗'}
                                    {resource.resourceType === 'text' && '📝'}
                                    {resource.resourceType === 'file' && '📄'}
                                </div>
                                
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {resource.title}
                                        <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                            {new Date(resource.createdAt).toLocaleDateString()}
                                        </span>
                                    </h3>
                                    
                                    {resource.resourceType === 'url' && (
                                        <a href={resource.content} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontSize: '14px', textDecoration: 'none' }}>
                                            {resource.content}
                                        </a>
                                    )}
                                    {resource.resourceType === 'text' && (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>
                                            {resource.content}
                                        </p>
                                    )}
                                    {resource.resourceType === 'file' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{resource.fileName}</span>
                                            <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                                Download
                                            </a>
                                        </div>
                                    )}
                                    
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                        Shared by {resource.uploadedByName} ({resource.uploaderRole})
                                    </div>
                                </div>
                                
                                {(user?.role === 'admin' || user?.id === resource.uploadedBy) && (
                                    <button
                                        onClick={() => handleDelete(resource.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--error)',
                                            fontSize: '18px',
                                            cursor: 'pointer',
                                            padding: '8px',
                                            opacity: 0.7,
                                            transition: 'opacity 0.2s'
                                        }}
                                        onMouseEnter={e => e.target.style.opacity = 1}
                                        onMouseLeave={e => e.target.style.opacity = 0.7}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
