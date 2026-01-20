import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../../services/api';

interface VerifyEmailPageProps {
  onVerified?: () => void;
}

// FLOW START: Verify Email Page (EN)
// จุดเริ่มต้น: หน้า Verify Email (TH)

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onVerified }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token') || '';
  }, [location.search]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setError('Verification token is missing.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await verifyEmail(token);
        setSuccess(res.message || 'Email verified successfully.');
        onVerified?.();
        setTimeout(() => navigate('/dashboard'), 900);
      } catch (err: any) {
        const message = err.response?.data?.message || 'Failed to verify email.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [navigate, onVerified, token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verify your email</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {loading ? 'Verifying…' : 'Complete your email verification to access the dashboard'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <p className="font-semibold">Verification failed</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">
              <p className="font-semibold">Verified</p>
              <p className="text-sm">{success}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to sign in
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// FLOW END: Verify Email Page (EN)
// จุดสิ้นสุด: หน้า Verify Email (TH)

export default VerifyEmailPage;
