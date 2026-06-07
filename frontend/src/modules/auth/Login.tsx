import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { getDashboardPath, isStaffRole } from '../../utils/roles';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginMode = 'staff' | 'student';

const LoginModule = ({ mode = 'staff' }: { mode?: LoginMode }) => {
  const { login, logout } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isStudentLogin = mode === 'student';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      setIsLoading(true);
      const success = await login(data.email, data.password);

      if (success) {
        const currentUser = useAuthStore.getState().user;
        const userRole = currentUser?.mainRole;

        if (!currentUser?.isActive || !userRole) {
          await logout();
          setError('This account is missing an active ERP role. Please contact the administrator.');
          return;
        }

        if (isStudentLogin && userRole !== 'student') {
          await logout();
          setError('This login is only for students. Please use the staff login.');
          return;
        }

        if (!isStudentLogin && !isStaffRole(userRole)) {
          await logout();
          setError('Students must use the student login page.');
          return;
        }

        navigate(getDashboardPath(userRole));
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">{isStudentLogin ? 'Student Login' : 'Staff Login'}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isStudentLogin ? 'Students can access their dashboard here.' : 'Admin, teachers, finance, governing body, and library staff can sign in here.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {error && (
          <div className="flex items-start gap-3 rounded border border-rose-100 bg-rose-50 p-4 text-rose-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 block">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="h-5 w-5" />
            </div>
            <input
              {...register('email')}
              type="email"
              className={`block w-full rounded border py-2.5 pl-10 pr-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                errors.email ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white'
              }`}
              placeholder="admin@school.edu"
            />
          </div>
          {errors.email && <p className="text-sm text-rose-500 font-medium mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 block">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-5 w-5" />
            </div>
            <input
              {...register('password')}
              type="password"
              className={`block w-full rounded border py-2.5 pl-10 pr-3 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                errors.password ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white'
              }`}
              placeholder="••••••••"
            />
          </div>
          {errors.password && <p className="text-sm text-rose-500 font-medium mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <span className="font-medium text-blue-700 transition-colors">
              Forgot password?
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded border border-transparent bg-blue-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-slate-600">
        {isStudentLogin ? (
          <>
            Staff member?{' '}
            <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">
              Use staff login
            </Link>
          </>
        ) : (
          <>
            Student?{' '}
            <Link to="/student-login" className="font-semibold text-blue-700 hover:text-blue-800">
              Use student login
            </Link>
          </>
        )}
      </div>
      
      <div className="mt-6 border-t border-slate-100 pt-6">
        <p className="text-xs text-slate-500 text-center uppercase tracking-wider font-semibold mb-3">Supabase Accounts</p>
        <div className="flex flex-wrap justify-center gap-2">
            {(isStudentLogin ? ['student'] : ['admin', 'teacher', 'accountant', 'governing', 'librarian']).map(role => (
              <span key={role} className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-mono">
                {role}@school.edu
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};

export default LoginModule;
