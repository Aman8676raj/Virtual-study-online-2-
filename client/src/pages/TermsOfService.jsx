import React from 'react';
import { motion } from 'framer-motion';

const TermsOfService = () => {
    return (
        <div className="min-h-screen pt-24 px-4 pb-12 bg-gray-50 dark:bg-gray-900">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-xl"
            >
                <h1 className="text-4xl font-bold font-display text-gray-900 dark:text-white mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">Terms of Service</h1>

                <div className="prose prose-indigo dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                    <p className="lead text-lg">Last Updated: {new Date().toLocaleDateString()}</p>

                    <h3>1. Acceptance of Terms</h3>
                    <p>By accessing or using Cohort, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>

                    <h3>2. Use License</h3>
                    <p>Permission is granted to temporarily use Cohort for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>

                    <h3>3. User Conduct</h3>
                    <p>You agree not to use the platform to:</p>
                    <ul>
                        <li>Harass, abuse, or harm another person.</li>
                        <li>Upload or transmit viruses or malicious code.</li>
                        <li>Interfere with the proper working of the Service.</li>
                    </ul>

                    <h3>4. Termination</h3>
                    <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

                    <h3>5. Limitation of Liability</h3>
                    <p>In no event shall Cohort or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit) arising out of the use or inability to use the materials on Cohort.</p>

                    <h3>6. Governing Law</h3>
                    <p>These terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
                </div>
            </motion.div>
        </div>
    );
};

export default TermsOfService;
