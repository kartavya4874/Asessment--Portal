import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import FileUpload from '../../components/ui/FileUpload';
import { getErrorDetail } from '../../utils/errorHandler';

export default function AssessmentForm() {
    const { id } = useParams();
    const isEdit = !!id;
    const [programs, setPrograms] = useState([]);
    const [domains, setDomains] = useState([]);
    const [selectedDomainId, setSelectedDomainId] = useState('');
    const [selectedProgramIds, setSelectedProgramIds] = useState([]);
    const [form, setForm] = useState({
        programId: '', title: '', description: '', startAt: '', deadline: '', maxMarks: '',
    });
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch programs and domains (courses)
        client.get('/programs').then(res => setPrograms(res.data)).catch(() => { });
        client.get('/domains').then(res => setDomains(res.data)).catch(() => { });

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
                        maxMarks: data.maxMarks ?? '',
                    });
                    if (data.domainId) {
                        setSelectedDomainId(data.domainId);
                    }
                })
                .catch(() => toast.error('Failed to load assessment'))
                .finally(() => setFetchLoading(false));
        }
    }, [id, isEdit]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const toggleProgram = (programId) => {
        setSelectedProgramIds(prev =>
            prev.includes(programId)
                ? prev.filter(id => id !== programId)
                : [...prev, programId]
        );
    };

    const toggleAll = () => {
        if (selectedProgramIds.length === programs.length) {
            setSelectedProgramIds([]);
        } else {
            setSelectedProgramIds(programs.map(p => p.id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isEdit) {
            if (!form.programId || !form.title || !form.startAt || !form.deadline) {
                toast.error('Please fill in all required fields'); return;
            }
        } else {
            if (!selectedDomainId) {
                toast.error('Please select a course/domain'); return;
            }
            if (selectedProgramIds.length === 0) {
                toast.error('Please select at least one program'); return;
            }
            if (!form.title || !form.startAt || !form.deadline) {
                toast.error('Please fill in all required fields'); return;
            }
        }

        setLoading(true);
        try {
            if (isEdit) {
                await client.put(`/assessments/${id}`, {
                    ...form,
                    maxMarks: form.maxMarks ? parseInt(form.maxMarks) : null,
                    startAt: new Date(form.startAt).toISOString(),
                    deadline: new Date(form.deadline).toISOString(),
                });
                toast.success('Assessment updated!');

                if (files.length > 0) {
                    const formData = new FormData();
                    files.forEach(f => formData.append('files', f));
                    await client.post(`/assessments/${id}/files`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                }

                navigate(`/admin/assessments/${id}`);
            } else {
                // Create mode: create for the first program, then copy to the rest
                const firstProgramId = selectedProgramIds[0];
                const payload = {
                    programId: firstProgramId,
                    domainId: selectedDomainId,
                    title: form.title,
                    description: form.description,
                    maxMarks: form.maxMarks ? parseInt(form.maxMarks) : null,
                    startAt: new Date(form.startAt).toISOString(),
                    deadline: new Date(form.deadline).toISOString(),
                };

                const { data: assessment } = await client.post('/assessments', payload);
                const assessmentId = assessment.id;

                if (files.length > 0) {
                    const formData = new FormData();
                    files.forEach(f => formData.append('files', f));
                    await client.post(`/assessments/${assessmentId}/files`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                }

                // Copy to remaining programs if more than one selected
                const remainingIds = selectedProgramIds.slice(1);
                if (remainingIds.length > 0) {
                    await client.post(`/assessments/${assessmentId}/copy`, {
                        targetProgramIds: remainingIds,
                    });
                }

                const totalCount = selectedProgramIds.length;
                toast.success(
                    totalCount === 1
                        ? 'Assessment created!'
                        : `Assessment created for ${totalCount} programs!`
                );

                navigate(`/admin/assessments/${assessmentId}`);
            }
        } catch (err) {
            toast.error(getErrorDetail(err, `Failed to ${isEdit ? 'update' : 'create'} assessment`));
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <PageTransition><div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div></PageTransition>;

    const allSelected = programs.length > 0 && selectedProgramIds.length === programs.length;
    const someSelected = selectedProgramIds.length > 0 && selectedProgramIds.length < programs.length;
    const selectedDomain = domains.find(d => d.id === selectedDomainId);

    return (
        <PageTransition>
            <div style={{ maxWidth: '700px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                    {isEdit ? 'Edit Assessment' : 'New Assessment'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>
                    {isEdit ? 'Update the details of this assessment' : 'Create a new lab assessment for your course'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {isEdit ? (
                        /* Edit mode: show existing course & program (read-only) */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {selectedDomainId && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Course/Domain</label>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: 'rgba(124,108,240,0.04)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        color: 'var(--text-primary)',
                                        opacity: 0.7,
                                    }}>
                                        📚 {domains.find(d => d.id === selectedDomainId)?.name || 'Loading...'}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Program</label>
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(124,108,240,0.04)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    color: 'var(--text-primary)',
                                    opacity: 0.7,
                                }}>
                                    🎓 {programs.find(p => p.id === form.programId)?.name || 'Loading...'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Create mode */
                        <>
                            {/* Step 1: Select Course/Domain */}
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '13px', color: 'var(--text-secondary)',
                                    marginBottom: '8px', fontWeight: 600,
                                }}>
                                    📚 Select Your Course *
                                </label>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', opacity: 0.8 }}>
                                    Only your assigned courses are shown. The assessment will be visible only to students enrolled in this course.
                                </p>
                                {domains.length === 0 ? (
                                    <div style={{
                                        padding: '16px', background: 'rgba(255,107,107,0.06)',
                                        border: '1px solid rgba(255,107,107,0.2)', borderRadius: '12px',
                                        fontSize: '13px', color: 'var(--error)',
                                    }}>
                                        ⚠️ No courses assigned to you. Contact the super admin to assign courses to your account.
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                        gap: '8px',
                                    }}>
                                        {domains.map(d => {
                                            const isSelected = selectedDomainId === d.id;
                                            return (
                                                <motion.div
                                                    key={d.id}
                                                    onClick={() => setSelectedDomainId(d.id)}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '12px 16px',
                                                        background: isSelected
                                                            ? 'linear-gradient(135deg, rgba(124,108,240,0.12), rgba(78,168,222,0.08))'
                                                            : 'var(--surface)',
                                                        borderRadius: '12px',
                                                        cursor: 'pointer',
                                                        border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                        transition: 'all 0.2s',
                                                        userSelect: 'none',
                                                    }}
                                                >
                                                    <div style={{
                                                        width: 20, height: 20, borderRadius: '50%',
                                                        border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                        background: isSelected ? 'var(--accent-primary)' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.2s', flexShrink: 0,
                                                    }}>
                                                        {isSelected && (
                                                            <div style={{
                                                                width: 8, height: 8, borderRadius: '50%',
                                                                background: '#fff',
                                                            }} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{
                                                            fontSize: '14px', fontWeight: isSelected ? 700 : 500,
                                                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                        }}>
                                                            {d.name}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                            {d.code}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Select Programs */}
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '13px', color: 'var(--text-secondary)',
                                    marginBottom: '10px', fontWeight: 600,
                                }}>
                                    🎓 Select Programs *
                                </label>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', opacity: 0.8 }}>
                                    Select which programs this assessment applies to.
                                </p>

                                {/* Select All toggle */}
                                <motion.div
                                    onClick={toggleAll}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 14px',
                                        background: allSelected
                                            ? 'linear-gradient(135deg, rgba(124,108,240,0.12), rgba(78,168,222,0.08))'
                                            : 'rgba(124,108,240,0.03)',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        border: `1px solid ${allSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                                        marginBottom: '8px',
                                        transition: 'all 0.2s',
                                        userSelect: 'none',
                                    }}
                                >
                                    <div style={{
                                        width: 20, height: 20, borderRadius: '6px',
                                        border: `2px solid ${allSelected ? 'var(--accent-primary)' : someSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                                        background: allSelected
                                            ? 'var(--accent-primary)'
                                            : someSelected
                                                ? 'rgba(124,108,240,0.3)'
                                                : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        flexShrink: 0,
                                    }}>
                                        {(allSelected || someSelected) && (
                                            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                                                {allSelected ? '✓' : '−'}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{
                                        fontSize: '14px', fontWeight: 600,
                                        color: allSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    }}>
                                        Select All Programs ({programs.length})
                                    </span>
                                </motion.div>

                                {/* Program checkboxes */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '6px',
                                    maxHeight: '240px',
                                    overflowY: 'auto',
                                    padding: '4px',
                                }}>
                                    {programs.map(p => {
                                        const isSelected = selectedProgramIds.includes(p.id);
                                        return (
                                            <motion.div
                                                key={p.id}
                                                onClick={() => toggleProgram(p.id)}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    padding: '10px 14px',
                                                    background: isSelected
                                                        ? 'linear-gradient(135deg, rgba(124,108,240,0.1), rgba(78,168,222,0.06))'
                                                        : 'var(--surface)',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                    transition: 'all 0.2s',
                                                    userSelect: 'none',
                                                }}
                                            >
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: '5px',
                                                    border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                    background: isSelected ? 'var(--accent-primary)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.2s',
                                                    flexShrink: 0,
                                                }}>
                                                    {isSelected && (
                                                        <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>
                                                    )}
                                                </div>
                                                <span style={{
                                                    fontSize: '13px', fontWeight: isSelected ? 600 : 500,
                                                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                }}>
                                                    {p.name}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {selectedProgramIds.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            marginTop: '10px',
                                            padding: '8px 14px',
                                            background: 'rgba(0,210,160,0.06)',
                                            border: '1px solid rgba(0,210,160,0.2)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            color: 'var(--success)',
                                            fontWeight: 500,
                                        }}
                                    >
                                        ✅ {selectedProgramIds.length} program{selectedProgramIds.length > 1 ? 's' : ''} selected
                                        {selectedDomain && <span> • Course: <strong>{selectedDomain.name}</strong></span>}
                                    </motion.div>
                                )}
                            </div>
                        </>
                    )}

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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Start Date & Time *</label>
                            <input name="startAt" type="datetime-local" value={form.startAt} onChange={handleChange} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Deadline *</label>
                            <input name="deadline" type="datetime-local" value={form.deadline} onChange={handleChange} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Max Marks</label>
                            <input name="maxMarks" type="number" min="0" value={form.maxMarks} onChange={handleChange} placeholder="e.g., 100" style={{ width: '100%' }} />
                        </div>
                    </div>

                    <FileUpload
                        label="Attach Files (PDFs, images, docs)"
                        onFilesSelected={(f) => setFiles(f)}
                    />

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <motion.button type="submit" className="btn-primary" disabled={loading} whileHover={{ scale: 1.02 }} style={{ opacity: loading ? 0.7 : 1 }}>
                            {loading
                                ? (isEdit ? 'Saving...' : 'Creating...')
                                : (isEdit
                                    ? '💾 Save Changes'
                                    : `✅ Create Assessment${!isEdit && selectedProgramIds.length > 1 ? ` for ${selectedProgramIds.length} Programs` : ''}`
                                )
                            }
                        </motion.button>
                        <button type="button" className="btn-secondary" onClick={() => navigate('/admin/assessments')}>Cancel</button>
                    </div>
                </form>
            </div>
        </PageTransition>
    );
}
