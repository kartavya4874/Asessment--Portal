export function getErrorDetail(err, defaultMessage = 'An error occurred') {
    const detail = err.response?.data?.detail;
    if (detail) {
        if (Array.isArray(detail)) {
            return detail[0]?.msg || 'Validation error';
        } else if (typeof detail === 'string') {
            return detail;
        }
    }
    return defaultMessage;
}
