import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginMode = 'staff' | 'student';

const STAFF_ROLES = ['Admin', 'Principal', 'Teacher', 'Accountant', 'Governing Body', 'Librarian'];

const getDashboardPath = (role?: string) => {
  switch (role) {
    case 'Admin':
      return '/admin/dashboard';
    case 'Principal':
    case 'Teacher':
      return '/teacher/dashboard';
    case 'Student':
      return '/student/dashboard';
    case 'Accountant':
      return '/accountant/fees';
    case 'Governing Body':
      return '/governing/dashboard';
    case 'Librarian':
      return '/librarian/dashboard';
    default:
      return '/';
  }
};

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
        const userRole = useAuthStore.getState().user?.role;

        if (isStudentLogin && userRole !== 'Student') {
          await logout();
          setError('This login is only for students. Please use the staff login.');
          return;
        }

        if (!isStudentLogin && (!userRole || !STAFF_ROLES.includes(userRole))) {
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
    <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">{isStudentLogin ? 'Student Login' : 'Staff Login'}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isStudentLogin ? 'Students can access their dashboard here.' : 'Admin, teachers, finance, governing body, and library staff can sign in here.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-start gap-3 border border-rose-100">
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
              className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all ${
                errors.email ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'
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
              className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all ${
                errors.password ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'
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
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Forgot password?
            </a>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-500/30 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
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
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Use staff login
            </Link>
          </>
        ) : (
          <>
            Student?{' '}
            <Link to="/student-login" className="font-semibold text-indigo-600 hover:text-indigo-500">
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
