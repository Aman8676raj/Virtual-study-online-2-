import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen pt-24 px-4 pb-12 bg-gray-50 dark:bg-gray-900">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-xl"
            >
                <h1 className="text-4xl font-bold font-display text-gray-900 dark:text-white mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">Privacy Policy</h1>

                <div className="prose prose-indigo dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                    <p className="lead text-lg">Effective Date: {new Date().toLocaleDateString()}</p>

                    <p>At Cohort, we value your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you use our platform.</p>

                    <h3>1. Information We Collect</h3>
                    <ul>
                        <li><strong>Account Information:</strong> When you register, we collect your name, email address, and profile picture (via Google OAuth or direct upload).</li>
                        <li><strong>Usage Data:</strong> We collect statistics on your study sessions, room participation, and interaction with platform features to improve your experience.</li>
                        <li><strong>Communications:</strong> Messages and content you post in study rooms or community threads.</li>
                    </ul>

                    <h3>2. How We Use Your Information</h3>
                    <p>We use your data to:</p>
                    <ul>
                        <li>Provide and maintain the Service.</li>
                        <li>Personalize your dashboard and study recommendations.</li>
                        <li>Analyze usage patterns to enhance platform performance.</li>
                        <li>Communicate with you regarding updates or support.</li>
                    </ul>

                    <h3>3. Data Sharing</h3>
                    <p>We do not sell your personal data. We may share information with:</p>
                    <ul>
                        <li><strong>Service Providers:</strong> Third-party tools for hosting (Render, Vercel) and database management (MongoDB Atlas).</li>
                        <li><strong>Legal Requirements:</strong> If required by law or to protect our rights.</li>
                    </ul>

                    <h3>4. Data Security</h3>
                    <p>We implement industry-standard security measures, including encryption and secure authentication (OAuth, JWT), to protect your data. However, no method of transmission over the internet is 100% secure.</p>

                    <h3>5. Your Rights</h3>
                    <p>You have the right to access, update, or delete your account information at any time via your Profile page.</p>

                    <h3>6. Contact Us</h3>
                    <p>If you have any questions about this policy, please contact us at support@cohort.app.</p>
                </div>
            </motion.div>
        </div>
    );
};

export default PrivacyPolicy;
