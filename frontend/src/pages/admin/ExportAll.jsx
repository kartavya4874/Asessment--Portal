import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';

export default function ExportAll() {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const response = await client.get('/export/all', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'all_assessments_report.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Combined report downloaded!');
        } catch (err) {
            toast.error('Export failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div style={{ maxWidth: '600px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Export Reports</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                    Download a combined Excel workbook with all programs and assessments. Each program gets its own sheet.
                </p>

                <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Combined Excel Report</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                        Includes: Roll No, Name, Email, Specialization, Year, Files, Text Answer, URLs, Marks, Feedback
                    </p>
                    <motion.button
                        className="btn-primary"
                        onClick={handleExport}
                        disabled={loading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ padding: '14px 36px', fontSize: '16px', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? '⏳ Generating...' : '📥 Download All Reports'}
                    </motion.button>
                </div>

                <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    💡 Tip: You can also export individual assessments from each assessment's detail page.
                </div>
            </div>
        </PageTransition>
    );
}
