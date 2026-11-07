import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, loginWithGoogle, setRole, role: savedRole } = useAuth();
  const role = location.state?.role || savedRole || 'student';

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorShake, setErrorShake] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setErrorShake(false);

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      setErrorShake(true);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      setErrorShake(true);
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      setErrorShake(true);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setErrorShake(true);
      return;
    }

    if (!isLogin) {
      if (!name.trim()) {
        setError('Name is required');
        setErrorShake(true);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setErrorShake(true);
        return;
      }
    }

    setLoading(true);

    try {
      let result;

      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signup(email, password, name);
      }

      setRole(role);
      const destination = role === 'recruiter' ? '/recruiter' : '/student';
      navigate(destination, { state: { user: result.user.email, role } });
    } catch (err) {
      const message = err?.message || '';
      setError(
        message.includes('already-in-use')
          ? 'An account with this email already exists'
          : message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')
            ? 'Invalid email or password'
            : isLogin
              ? 'Invalid email or password'
              : 'Failed to create account'
      );
      setErrorShake(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);

    try {
      setRole(role);
      const result = await loginWithGoogle();
      // Redirect sign-in resumes through AuthProvider and AuthRoute after Firebase returns.
      if (!result) return;
      const destination = role === 'recruiter' ? '/recruiter' : '/student';
      navigate(destination, { state: { user: result.user.email, role } });
    } catch (err) {
      const code = err?.code || '';
      setError(
        code === 'auth/unauthorized-domain'
          ? 'This site is not authorized for Google sign-in. Add this domain in Firebase Authentication settings.'
          : code === 'auth/operation-not-supported-in-this-environment'
            ? `Google sign-in is unavailable in this browser context. Open the app at ${window.location.origin} and try again.`
            : err?.message || 'Google sign-in failed'
      );
      setErrorShake(true);
    } finally {
      setLoading(false);
    }
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 },
    },
  };

  const inputVariants = {
    focus: { scale: 1.02 },
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 -right-40 w-80 h-80 bg-zinc-800 rounded-full mix-blend-screen filter blur-3xl opacity-10"
          animate={{ y: [0, 40, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 left-20 w-80 h-80 bg-zinc-800 rounded-full mix-blend-screen filter blur-3xl opacity-10"
          animate={{ y: [0, -40, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-8 text-zinc-100">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
              HireAI
            </h1>
            <p className="text-sm font-light text-zinc-400 mt-1">AI-Powered Resume Screening</p>
          </div>

          {/* Role Badge */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full shadow-sm"
            >
              <span className="text-sm font-medium text-zinc-300 capitalize">
                {role === 'recruiter' ? 'Recruiter Account' : 'Student Account'}
              </span>
            </motion.div>
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-zinc-950/60 border border-zinc-800 rounded-xl">
            {['Login', 'Sign Up'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setIsLogin(tab === 'Login');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  (tab === 'Login' ? isLogin : !isLogin)
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? 'login' : 'signup'}
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
              onSubmit={handleAuth}
              className="space-y-4"
            >
              {/* Name Input (Sign Up only) */}
              {!isLogin && (
                <motion.div
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative"
                >
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Full Name
                  </label>
                  <motion.div whileFocus={inputVariants.focus} className="relative">
                    <User className="absolute left-3.5 top-3.5 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-11 pr-4 py-2.5 border border-zinc-800 bg-zinc-950/70 text-zinc-100 rounded-xl focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700 transition placeholder:text-zinc-600 text-sm font-light"
                    />
                  </motion.div>
                </motion.div>
              )}

              {/* Email Input */}
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email Address
                </label>
                <motion.div whileFocus={inputVariants.focus} className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-2.5 border border-zinc-800 bg-zinc-950/70 text-zinc-100 rounded-xl focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700 transition placeholder:text-zinc-600 text-sm font-light"
                  />
                </motion.div>
              </div>

              {/* Password Input */}
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Password
                </label>
                <motion.div whileFocus={inputVariants.focus} className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-2.5 border border-zinc-800 bg-zinc-950/70 text-zinc-100 rounded-xl focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700 transition placeholder:text-zinc-600 text-sm font-light"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </motion.div>
              </div>

              {/* Confirm Password Input (Sign Up only) */}
              {!isLogin && (
                <motion.div
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative"
                >
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Confirm Password
                  </label>
                  <motion.div whileFocus={inputVariants.focus} className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-zinc-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-2.5 border border-zinc-800 bg-zinc-950/70 text-zinc-100 rounded-xl focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700 transition placeholder:text-zinc-600 text-sm font-light"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* Error Message with shake animation */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    variants={shakeVariants}
                    animate="shake"
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200"
                  >
                    <AlertCircle className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                    <p className="text-sm font-light text-zinc-300 ml-2.5">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 bg-zinc-100 text-zinc-950 font-medium rounded-xl hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full"
                    />
                    {isLogin ? 'Logging in...' : 'Creating account...'}
                  </>
                ) : (
                  isLogin ? 'Login' : 'Create Account'
                )}
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs font-light text-zinc-500">or continue with</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Google Button */}
              <motion.button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 border border-zinc-800 bg-zinc-900/60 text-zinc-200 font-medium rounded-xl hover:bg-zinc-800 hover:text-zinc-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm backdrop-blur-md"
              >
                {/* Google Icon SVG */}
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </motion.button>
            </motion.form>
          </AnimatePresence>

          {/* Footer text */}
          <p className="text-center text-xs font-light text-zinc-500 mt-6">
            Use your email and password, or continue with Google.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;