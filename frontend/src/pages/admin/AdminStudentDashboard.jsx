import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard, SkeletonTable } from '../../components/ui/SkeletonLoader';

export default function AdminStudentDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [submissions, setSubmissions] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // 1. Fetch student details
                const { data: studentData } = await client.get(`/students/${id}`);
                setStudent(studentData);

                // 2. Fetch all assessments for their program
                const { data: assessmentList } = await client.get('/assessments', {
                    params: { programId: studentData.programId }
                });
                setAssessments(assessmentList);

                // 3. Fetch all their past submissions
                const { data: historyList } = await client.get(`/submissions/student/${id}/history`);

                // Map history to an object by assessmentId
                const subsMap = {};
                historyList.forEach(sub => {
                    subsMap[sub.assessmentId] = sub;
                });
                setSubmissions(subsMap);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [id]);

    const activeAssessments = assessments.filter(a => a.status === 'Active');
    const upcomingAssessments = assessments.filter(a => a.status === 'Upcoming');
    const closedAssessments = assessments.filter(a => a.status === 'Closed');

    // Compute overall stats
    const submittedCount = Object.keys(submissions).length;
    let totalMarks = 0;
    let totalMaxMarks = 0;
    let gradedCount = 0;
    assessments.forEach(a => {
        const sub = submissions[a.id];
        if (sub?.marksPublished && sub?.marks != null) {
            totalMarks += sub.marks;
            if (a.maxMarks != null) totalMaxMarks += a.maxMarks;
            gradedCount++;
        }
    });
    const avgPercent = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : null;

    const statusBadge = { Active: 'badge-active', Upcoming: 'badge-upcoming', Closed: 'badge-closed' };

    const renderSection = (title, items, icon) => (
        items.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon} {title} ({items.length})
                </h2>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {items.map(assessment => {
                        const sub = submissions[assessment.id];
                        const hasMarks = sub?.marksPublished && sub?.marks != null;

                        return (
                            <StaggerItem key={assessment.id}>
                                <motion.div
                                    className="card"
                                    whileHover={{ y: -4, scale: 1.01 }}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/admin/assessments/${assessment.id}/student/${id}`)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600, flex: 1 }}>{assessment.title}</h3>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                            {sub ? (
                                                <span className="badge badge-submitted" style={{ fontSize: '11px' }}>✅ Submitted</span>
                                            ) : assessment.status !== 'Upcoming' ? (
                                                <span className="badge badge-not-submitted" style={{ fontSize: '11px' }}>Not Submitted</span>
                                            ) : null}
                                            <span className={`badge ${statusBadge[assessment.status]}`}>{assessment.status}</span>
                                        </div>
                                    </div>

                                    {/* Show marks if published */}
                                    {(hasMarks || sub?.marks != null) && (
                                        <div style={{
                                            padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px',
                                            marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                                        }}>
                                            <span style={{ fontSize: '20px', fontWeight: 700, color: sub.marksPublished ? 'var(--accent-primary)' : 'var(--accent-secondary)' }}>
                                                {sub.marks}{assessment.maxMarks != null ? ` / ${assessment.maxMarks}` : ''}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {sub.marksPublished ? 'marks' : 'marks (not published)'}
                                            </span>
                                            {sub.feedback && (
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>💬 {sub.feedback}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Show submitted content summary */}
                                    {sub && !hasMarks && sub.marks == null && (
                                        <div style={{
                                            padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px',
                                            marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)',
                                            display: 'flex', gap: '12px', flexWrap: 'wrap',
                                        }}>
                                            {sub.files?.length > 0 && <span>📄 {sub.files.length} file{sub.files.length > 1 ? 's' : ''}</span>}
                                            {sub.urls?.length > 0 && <span>🔗 {sub.urls.length} link{sub.urls.length > 1 ? 's' : ''}</span>}
                                            {sub.textAnswer && <span>📝 Text submitted</span>}
                                            <span style={{ marginLeft: 'auto' }}>⏳ Marks pending</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: 'auto' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            📅 {format(new Date(assessment.startAt), 'dd MMM')} — {format(new Date(assessment.deadline), 'dd MMM yyyy')}
                                        </div>
                                        <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 500 }}>
                                            View Details →
                                        </span>
                                    </div>
                                </motion.div>
                            </StaggerItem>
                        );
                    })}
                </StaggerContainer>
            </div>
        )
    );

    if (loading) return (
        <PageTransition>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <SkeletonCard />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        </PageTransition>
    );

    if (!student) return (
        <PageTransition>
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <p style={{ color: 'var(--error)' }}>Student not found.</p>
                <button className="btn-secondary" onClick={() => navigate('/admin/students')} style={{ marginTop: '16px' }}>← Back to Students</button>
            </div>
        </PageTransition>
    );

    return (
        <PageTransition>
            <div>
                {/* Header / Back button */}
                <button onClick={() => navigate('/admin/students')}
                    style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', cursor: 'pointer', border: 'none' }}>
                    ← Back to Students
                </button>

                <div className="card" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                                width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff'
                            }}>
                                {student.name?.charAt(0)?.toUpperCase()}
                            </span>
                            {student.name} Dashboard
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px', display: 'flex', gap: '16px' }}>
                            <span>🆔 {student.rollNumber}</span>
                            <span>📧 {student.email}</span>
                            <span>📚 {student.specialization}</span>
                            <span>📅 {student.year}</span>
                        </p>
                    </div>
                </div>

                {/* Overall Stats */}
                {assessments.length > 0 && (
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '12px', marginBottom: '32px',
                    }}>
                        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-primary)' }}>{assessments.length}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Total Assessments</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)' }}>{submittedCount}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Submitted</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                {gradedCount > 0 ? `${totalMarks}${totalMaxMarks > 0 ? ` / ${totalMaxMarks}` : ''}` : '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Total Marks</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: avgPercent != null && avgPercent >= 60 ? 'var(--success)' : avgPercent != null ? 'var(--urgent)' : 'var(--text-secondary)' }}>
                                {avgPercent != null ? `${avgPercent}%` : '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Average</div>
                        </div>
                    </div>
                )}

                {assessments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Assessments</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>This student's program doesn't have any assessments yet.</p>
                    </div>
                ) : (
                    <>
                        {renderSection('Active Assessments', activeAssessments, '🟢')}
                        {renderSection('Upcoming Assessments', upcomingAssessments, '🔵')}
                        {renderSection('Past Assessments', closedAssessments, '⚪')}
                    </>
                )}
            </div>
        </PageTransition>
    );
}
