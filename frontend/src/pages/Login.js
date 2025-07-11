import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";
import { FcGoogle } from "react-icons/fc";

const Login = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await login(email, password);
    if (res.success) {
      navigate("/dashboard");
    } else {
      setError(res.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute left-0 top-0 h-full w-1/3 flex items-center justify-center pointer-events-none z-0">
        <div className="w-96 h-96 bg-blue-300 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      </div>
      <div className="absolute right-0 bottom-0 h-full w-1/3 flex items-center justify-center pointer-events-none z-0">
        <div className="w-96 h-96 bg-purple-300 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      {/* Centered Login Card */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen px-4">
        <div className="w-full max-w-lg mx-auto glass shadow-2xl rounded-3xl p-10 border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-md">
          {/* Logo and branding */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-75"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-2xl border border-gray-100 dark:border-gray-700">
                  <LockClosedIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AppVital
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              Welcome back
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Sign in to your account to continue monitoring
            </p>
          </div>

          {/* Login form */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me and forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={remember}
                    onChange={() => setRemember((v) => !v)}
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                    Remember for 30 days
                  </span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                  onClick={() =>
                    alert("Forgot password is not implemented yet.")
                  }
                >
                  Forgot password?
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="group w-full py-3 px-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    Sign in
                    <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600" />
              <span className="px-4 text-sm text-gray-500 dark:text-gray-400">
                or
              </span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600" />
            </div>

            {/* Google sign in */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
              onClick={() => alert("Google sign-in is not implemented yet.")}
            >
              <FcGoogle className="w-5 h-5" />
              Sign in with Google
            </button>

            {/* Sign up link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
