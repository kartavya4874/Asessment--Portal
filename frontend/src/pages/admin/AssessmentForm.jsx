import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import FileUpload from '../../components/ui/FileUpload';

export default function AssessmentForm() {
    const { id } = useParams();
    const isEdit = !!id;
    const [programs, setPrograms] = useState([]);
    const [form, setForm] = useState({
        programId: '', title: '', description: '', startAt: '', deadline: '',
    });
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);
    const navigate = useNavigate();

    useEffect(() => {
        client.get('/programs')
            .then(res => setPrograms(res.data))
            .catch(() => { });

        if (isEdit) {
            client.get(`/assessments/${id}`)
                .then(res => {
                    const data = res.data;
                    setForm({
                        programId: data.programId,
                        title: data.title,
                        description: data.description,
                        startAt: new Date(data.startAt).toISOString().slice(0, 16),
                        deadline: new Date(data.deadline).toISOString().slice(0, 16),
                    });
                })
                .catch(() => toast.error('Failed to load assessment'))
                .finally(() => setFetchLoading(false));
        }
    }, [id, isEdit]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.programId || !form.title || !form.startAt || !form.deadline) {
            toast.error('Please fill in all required fields'); return;
        }

        setLoading(true);
        try {
            let assessmentId = id;
            if (isEdit) {
                await client.put(`/assessments/${id}`, {
                    ...form,
                    startAt: new Date(form.startAt).toISOString(),
                    deadline: new Date(form.deadline).toISOString(),
                });
                toast.success('Assessment updated!');
            } else {
                const { data: assessment } = await client.post('/assessments', {
                    ...form,
                    startAt: new Date(form.startAt).toISOString(),
                    deadline: new Date(form.deadline).toISOString(),
                });
                assessmentId = assessment.id;
                toast.success('Assessment created!');
            }

            // Upload files if any
            if (files.length > 0) {
                const formData = new FormData();
                files.forEach(f => formData.append('files', f));
                await client.post(`/assessments/${assessmentId}/files`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            navigate(`/admin/assessments/${assessmentId}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} assessment`);
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <PageTransition><div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div></PageTransition>;

    return (
        <PageTransition>
            <div style={{ maxWidth: '700px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                    {isEdit ? 'Edit Assessment' : 'New Assessment'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>
                    {isEdit ? 'Update the details of this assessment' : 'Create a new lab assessment for a program'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Program *</label>
                        <select name="programId" value={form.programId} onChange={handleChange} style={{ width: '100%' }}>
                            <option value="">Select Program</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Title *</label>
                        <input name="title" value={form.title} onChange={handleChange} placeholder="e.g., Lab Assignment 3 - ML Basics" style={{ width: '100%' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Describe the assessment, tasks, and requirements..."
                            rows={6}
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Start Date & Time *</label>
                            <input name="startAt" type="datetime-local" value={form.startAt} onChange={handleChange} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Deadline *</label>
                            <input name="deadline" type="datetime-local" value={form.deadline} onChange={handleChange} style={{ width: '100%' }} />
                        </div>
                    </div>

                    <FileUpload
                        label="Attach Files (PDFs, images, docs)"
                        onFilesSelected={(f) => setFiles(f)}
                    />

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <motion.button type="submit" className="btn-primary" disabled={loading} whileHover={{ scale: 1.02 }} style={{ opacity: loading ? 0.7 : 1 }}>
                            {loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? '💾 Save Changes' : '✅ Create Assessment')}
                        </motion.button>
                        <button type="button" className="btn-secondary" onClick={() => navigate('/admin/assessments')}>Cancel</button>
                    </div>
                </form>
            </div>
        </PageTransition>
    );
}
