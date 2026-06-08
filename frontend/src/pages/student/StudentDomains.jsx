import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

export default function StudentDomains() {
    const [domains, setDomains] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile preferences form state
    const [preferences, setPreferences] = useState({
        interestLevel: 'Beginner',
        primaryGoal: 'Skill Upgradation',
        additionalNotes: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [domainsRes, profileRes] = await Promise.all([
                client.get('/domains'),
                client.get('/auth/student/me')
            ]);
            setDomains(domainsRes.data);
            setProfile(profileRes.data);
            if (profileRes.data.domainRegistered) {
                setPreferences({
                    interestLevel: profileRes.data.domainPreferences.interestLevel || 'Beginner',
                    primaryGoal: profileRes.data.domainPreferences.primaryGoal || 'Skill Upgradation',
                    additionalNotes: profileRes.data.domainPreferences.additionalNotes || ''
                });
            }
        } catch (err) {
            toast.error('Failed to load domain information');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await client.post('/domains/register-profile', preferences);
            toast.success('Domain profile preferences registered!');
            await fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to register profile');
        } finally {
            setSaving(false);
        }
    };

    const handleEnroll = async (domainId) => {
        try {
            await client.post(`/domains/${domainId}/enroll`);
            toast.success('Successfully enrolled!');
            await fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to enroll');
        }
    };

    const handleDisenroll = async (domainId) => {
        if (!confirm('Are you sure you want to opt out of this subject/domain?')) return;
        try {
            await client.post(`/domains/${domainId}/disenroll`);
            toast.success('Disenrolled successfully');
            await fetchData();
        } catch (err) {
            toast.error('Failed to disenroll');
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

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        fontWeight: 600,
    };

    if (loading) {
        return (
            <PageTransition>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '28px' }}>
                        <h1 style={{ fontSize: '30px', fontWeight: 800 }}>Subject & Domain tracks</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Loading enrollment details...</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 800 }}>
                        🎯 <span className="gradient-text">Subject & Domain tracks</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        Select, enroll, and manage your specialized learning tracks
                    </p>
                </div>

                {/* STEP 1: If profile is not registered, show the profile details form */}
                <AnimatePresence mode="wait">
                    {!profile?.domainRegistered ? (
                        <motion.div
                            key="registration-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="card-glow"
                            style={{
                                padding: '32px',
                                background: 'var(--surface)',
                                borderRadius: '18px',
                                border: '1px solid var(--border)',
                                marginBottom: '32px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '12px',
                                    background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                                }}>📝</div>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Domain Preference Registration</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Please tell us about your goals before choosing domains</p>
                                </div>
                            </div>

                            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexWrap: 'wrap' }}>
                                    <div>
                                        <label style={labelStyle}>Current Interest Level</label>
                                        <select
                                            value={preferences.interestLevel}
                                            onChange={(e) => setPreferences({ ...preferences, interestLevel: e.target.value })}
                                            style={inputStyle}
                                        >
                                            <option value="Beginner">Beginner (No prior experience)</option>
                                            <option value="Intermediate">Intermediate (Basic understanding)</option>
                                            <option value="Advanced">Advanced (Hands-on experience)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Primary Learning Goal</label>
                                        <select
                                            value={preferences.primaryGoal}
                                            onChange={(e) => setPreferences({ ...preferences, primaryGoal: e.target.value })}
                                            style={inputStyle}
                                        >
                                            <option value="Job Placement">Job Placement & Placement Prep</option>
                                            <option value="Skill Upgradation">Skill Upgradation / Academic</option>
                                            <option value="Project Work">Project Work & Building Portfolios</option>
                                            <option value="Research">Research & Higher Studies</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Additional Notes / Expectations</label>
                                    <textarea
                                        value={preferences.additionalNotes}
                                        onChange={(e) => setPreferences({ ...preferences, additionalNotes: e.target.value })}
                                        placeholder="Tell us what you wish to learn from these domains..."
                                        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                                    />
                                </div>

                                <motion.button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={saving}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{ alignSelf: 'flex-start', padding: '12px 28px' }}
                                >
                                    {saving ? 'Saving...' : 'Register Profile & Unlock Domains'}
                                </motion.button>
                            </form>
                        </motion.div>
                    ) : (
                        /* STEP 2: Catalog of Domain Options */
                        <motion.div
                            key="domain-catalog"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
                        >
                            {/* Profile details overview */}
                            <div style={{
                                padding: '16px 20px',
                                background: 'linear-gradient(135deg, rgba(124,108,240,0.06), rgba(78,168,222,0.04))',
                                borderRadius: '12px',
                                border: '1px solid rgba(124,108,240,0.12)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Interest Level: </span>
                                    <strong style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>{profile.domainPreferences?.interestLevel}</strong>
                                    <span style={{ margin: '0 10px', color: 'var(--border)' }}>|</span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Goal: </span>
                                    <strong style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>{profile.domainPreferences?.primaryGoal}</strong>
                                </div>
                                <button
                                    onClick={() => setProfile({ ...profile, domainRegistered: false })}
                                    style={{
                                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                                        fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', fontWeight: 500
                                    }}
                                >
                                    ✏️ Edit Preferences
                                </button>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Available Subjects & Domains</h2>
                                {domains.length === 0 ? (
                                    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</div>
                                        <h3>No domains available yet</h3>
                                        <p style={{ color: 'var(--text-secondary)' }}>Please wait for an administrator to setup domain tracks.</p>
                                    </div>
                                ) : (
                                    <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                                        {domains.map(domain => {
                                            const isEnrolled = profile.enrolledSubjects?.includes(domain.id);
                                            return (
                                                <StaggerItem key={domain.id}>
                                                    <motion.div
                                                        className="card"
                                                        whileHover={{ y: -5, scale: 1.01 }}
                                                        style={{
                                                            border: isEnrolled ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                            background: isEnrolled ? 'linear-gradient(135deg, var(--surface), rgba(124,108,240,0.03))' : 'var(--surface)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            height: '100%'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                            <div style={{
                                                                padding: '4px 8px',
                                                                background: 'var(--bg-secondary)',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                color: 'var(--text-secondary)'
                                                            }}>{domain.code}</div>
                                                            {isEnrolled && (
                                                                <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    🟢 Enrolled
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{domain.name}</h3>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', flex: 1, marginBottom: '18px', lineHeight: 1.5 }}>
                                                            {domain.description}
                                                        </p>

                                                        {isEnrolled ? (
                                                            <div style={{ textAlign: 'center', padding: '10px', fontSize: '13px', color: 'var(--success)', fontWeight: 'bold' }}>
                                                                Current Track
                                                            </div>
                                                        ) : (
                                                            !profile.enrolledSubjects?.length && (
                                                                <motion.button
                                                                    onClick={() => handleEnroll(domain.id)}
                                                                    className="btn-primary"
                                                                    style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                                                                    whileHover={{ scale: 1.02 }}
                                                                >
                                                                    Enroll Now
                                                                </motion.button>
                                                            )
                                                        )}
                                                    </motion.div>
                                                </StaggerItem>
                                            );
                                        })}
                                    </StaggerContainer>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
