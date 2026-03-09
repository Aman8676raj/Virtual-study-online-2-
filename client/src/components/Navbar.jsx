import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';

import Logo from './Logo';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isDarkMode, toggleDarkMode } = useDarkMode();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const navLinks = ['Home', 'Explore', 'Insights', 'Community'];

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
            className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl rounded-3xl sm:rounded-full border transition-all duration-500 ${isScrolled || isMobileMenuOpen
                ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-white/40 dark:border-gray-700/50 shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)]'
                : 'bg-white/10 dark:bg-gray-900/30 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg shadow-indigo-500/5 dark:shadow-indigo-500/10'
                }`}
        >
            <div className="px-4 sm:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo Section */}
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                                <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
                            </div>
                            <span className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white tracking-tight font-logo">
                                Cohort
                            </span>
                        </Link>

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:flex items-center space-x-1">
                            {navLinks.map((item) => {
                                const path = item === 'Home' ? '/' : `/${item.toLowerCase()}`;
                                const active = isActive(path);
                                return (
                                    <Link
                                        key={item}
                                        to={path}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${active
                                            ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                                            }`}
                                    >
                                        {item}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop Auth Buttons / Profile */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {user ? (
                            <>
                                <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                                    <Link to="/profile" className="flex items-center gap-3 group">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-100 to-violet-100 dark:from-indigo-900 dark:to-violet-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm border border-indigo-200 dark:border-indigo-700 overflow-hidden group-hover:border-indigo-400 transition-colors">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                            ) : (
                                                user.username.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 font-display group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user.username}</span>
                                    </Link>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                                    title="Logout"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Log In</Link>
                                <Link
                                    to="/register"
                                    className="btn-primary px-6 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-indigo-500/20"
                                >
                                    Sign Up Free
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        {user && (
                            <Link to="/profile" className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm border border-indigo-200 dark:border-indigo-700">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    user.username.charAt(0).toUpperCase()
                                )}
                            </Link>
                        )}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="md:hidden border-t border-gray-100 overflow-hidden"
                    >
                        <div className="px-6 py-6 flex flex-col gap-4">
                            {navLinks.map((item) => {
                                const path = item === 'Home' ? '/' : `/${item.toLowerCase()}`;
                                const active = isActive(path);
                                return (
                                    <Link
                                        key={item}
                                        to={path}
                                        className={`px-4 py-3 rounded-xl text-base font-medium transition-all ${active
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {item}
                                    </Link>
                                );
                            })}

                            <div className="h-px bg-gray-100 my-2"></div>

                            {!user ? (
                                <div className="flex flex-col gap-3">
                                    <Link
                                        to="/login"
                                        className="w-full py-3 text-center text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="btn-primary w-full py-3 text-center rounded-xl font-medium shadow-lg shadow-indigo-500/20"
                                    >
                                        Sign Up Free
                                    </Link>
                                </div>
                            ) : (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                    </svg>
                                    Sign Out
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default Navbar;
